import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export function extractS3Key(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('campus-blink/')) return url;

  if (url.includes('.amazonaws.com/')) {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
      return decodeURIComponent(pathname);
    } catch {
      const parts = url.split('.amazonaws.com/');
      if (parts.length > 1) {
        return decodeURIComponent(parts[1].split('?')[0].replace(/^\//, ''));
      }
    }
  }

  // Fallback check if it was an old Cloudinary URL just in case
  if (url.includes('res.cloudinary.com')) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const uploadIndex = parts.findIndex((part) => part === 'upload');
      if (uploadIndex !== -1 && parts.slice(uploadIndex + 1).length) {
        const publicPart = parts.slice(uploadIndex + 1);
        if (/^v\d+$/.test(publicPart[0])) publicPart.shift();
        return publicPart.join('/').replace(/\.[^/.]+$/, '');
      }
    } catch {
      return null;
    }
  }

  return url;
}

async function uploadToS3(file, resourceType, folder) {
  const authHeaders = await getAuthHeaders();
  const fileExtension = file.name ? file.name.split('.').pop() : (resourceType === 'image' ? 'jpg' : 'pdf');

  // Attempt 1: Direct client-to-S3 upload via backend Presigned URL (fast, saves EC2 RAM & bandwidth)
  try {
    const presignResponse = await fetch(`${backendUrl}/api/uploads/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        filename: file.name || `upload.${fileExtension}`,
        filetype: file.type || (resourceType === 'image' ? 'image/jpeg' : 'application/pdf'),
        folder,
      }),
    });

    if (presignResponse.ok) {
      const presignedData = await presignResponse.json();
      if (presignedData?.uploadUrl && presignedData?.url) {
        const putResponse = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || (resourceType === 'image' ? 'image/jpeg' : 'application/pdf'),
          },
        });

        if (putResponse.ok || putResponse.status === 204) {
          return {
            url: presignedData.url,
            publicId: presignedData.key || presignedData.url,
            key: presignedData.key,
            format: fileExtension,
            resourceType,
          };
        }
      }
    }
  } catch (presignErr) {
    console.warn('[S3 Upload] Direct PUT via presigned URL failed or blocked by CORS. Falling back to backend express upload:', presignErr);
  }

  // Attempt 2 (Fallback): Upload via backend Express API (/api/uploads/image or /api/uploads/pdf)
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const endpoint = `${backendUrl}/api/uploads/${resourceType === 'image' ? 'image' : 'pdf'}`;
  const fallbackResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  const fallbackResult = await fallbackResponse.json();
  if (!fallbackResponse.ok || fallbackResult?.error) {
    throw new Error(fallbackResult?.error || 'S3 upload failed across both direct and backend methods');
  }

  return {
    url: fallbackResult.url,
    publicId: fallbackResult.url,
    key: fallbackResult.url,
    format: fileExtension,
    resourceType,
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

    const result = await uploadToS3(compressed, 'image', folder);
    return { data: result, error: null };
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

    const result = await uploadToS3(file, 'raw', folder);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteFile(publicIdOrKey) {
  try {
    if (!publicIdOrKey) {
      return { data: { deleted: false, reason: 'Missing key for deletion' }, error: null };
    }

    const authHeaders = await getAuthHeaders();
    const key = extractS3Key(publicIdOrKey) || publicIdOrKey;

    const response = await fetch(`${backendUrl}/api/uploads/file`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ key, publicId: key }),
    });

    const result = await response.json();
    if (!response.ok || result?.error) {
      throw new Error(result?.error || 'S3 file deletion failed');
    }

    return { data: { deleted: true, publicId: publicIdOrKey, key }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export const extractCloudinaryPublicId = extractS3Key;
