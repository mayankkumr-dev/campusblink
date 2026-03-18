import imageCompression from 'browser-image-compression';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'campus_blink';

function ensureCloudinaryConfig() {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }
}

function getUploadEndpoint(resourceType) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

function buildCloudinaryDeliveryUrl({ publicId, resourceType, format }) {
  const encodedPublicId = String(publicId || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const extension = format ? `.${format}` : '';
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${encodedPublicId}${extension}`;
}

export function extractCloudinaryPublicId(url) {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === 'upload');
    if (uploadIndex === -1) return null;

    const publicPart = parts.slice(uploadIndex + 1);
    if (!publicPart.length) return null;

    if (/^v\d+$/.test(publicPart[0])) {
      publicPart.shift();
    }

    const joined = publicPart.join('/');
    return joined.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
}

async function postUpload(file, resourceType, folder) {
  ensureCloudinaryConfig();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(getUploadEndpoint(resourceType), {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || result?.error) {
    throw new Error(result?.error?.message || 'Cloudinary upload failed');
  }

  return {
    url: buildCloudinaryDeliveryUrl({
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
    }),
    publicId: result.public_id,
    // Unsigned presets do not support delete tokens from browser uploads.
    deleteToken: null,
    bytes: result.bytes,
    format: result.format,
    resourceType: result.resource_type,
  };
}

export async function uploadImage(file, folder) {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
    });

    return { data: await postUpload(compressed, 'image', folder), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadPDF(file, folder) {
  try {
    const isPdf = file?.type === 'application/pdf' || file?.name?.toLowerCase?.().endsWith('.pdf');
    if (!isPdf) {
      throw new Error('Only PDF files are supported for print uploads.');
    }

    const upload = await postUpload(file, 'raw', folder);

    // Cloudinary can accept raw uploads but still block PDF delivery with ACL/security settings.
    const verifyResponse = await fetch(upload.url, {
      method: 'HEAD',
      cache: 'no-store',
    });

    if (verifyResponse.status === 401 || verifyResponse.status === 403) {
      throw new Error('Cloudinary accepted upload but blocked PDF delivery (401/403). Enable PDF delivery in Cloudinary security settings.');
    }

    return { data: upload, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteFile(publicId, deleteToken = null) {
  try {
    if (!deleteToken) {
      return {
        data: { deleted: false, reason: 'Missing delete token for unsigned deletion' },
        error: null,
      };
    }

    const response = await fetch('https://api.cloudinary.com/v1_1/delete_by_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: deleteToken }),
    });

    const result = await response.json();
    if (!response.ok || result?.error) {
      throw new Error(result?.error?.message || 'Cloudinary delete failed');
    }

    return { data: { deleted: true, publicId }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}