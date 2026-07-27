/**
 * s3.js — Campus Blink AWS S3 Upload Library
 *
 * Architecture: Pre-signed URL Direct-to-Cloud Upload
 *   1. Compress image client-side (browser-image-compression)
 *   2. Request a time-limited S3 Pre-signed PUT URL from our backend
 *   3. PUT the raw File directly to S3 via XMLHttpRequest (supports onUploadProgress)
 *   4. On network failure → show premium "Upload paused" toast, retry once
 *   5. If presigned flow fails → fallback to backend Express upload
 *
 * Fixes:
 *   - 400 Bad Request: Never manually set Content-Type on FormData uploads
 *   - Progress tracking: XHR instead of fetch for presigned PUT
 *   - Network resilience: catch AbortError / network errors gracefully
 */

import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

function getBackendUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (typeof window !== 'undefined') {
    // If envUrl is empty, or uses unencrypted http:// to an IP/remote host (e.g. http://3.229.71.36),
    // return relative path "" so Vercel HTTPS proxy rewrites /api calls or Vite proxy handles them safely.
    if (!envUrl || (envUrl.startsWith('http://') && !envUrl.includes('localhost'))) {
      return '';
    }
  }
  return envUrl || '';
}

// ─── Compression Config ────────────────────────────────────────────────────────

const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82,
};

const THUMBNAIL_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  initialQuality: 0.75,
};

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

// ─── Key Extractor ─────────────────────────────────────────────────────────────

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

  // Fallback: handle legacy Cloudinary URLs
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

// ─── Network Error Toast ───────────────────────────────────────────────────────

let networkToastId = null;

function showNetworkErrorToast() {
  if (networkToastId) toast.dismiss(networkToastId);
  networkToastId = toast.custom(
    (t) => `
      <div style="
        display:flex;align-items:center;gap:12px;
        background:#fff;border:1px solid #fee2e2;border-radius:14px;
        padding:12px 18px;box-shadow:0 4px 24px rgba(0,0,0,0.08);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        max-width:360px;
      ">
        <span style="font-size:18px;">📶</span>
        <div>
          <div style="font-weight:700;font-size:13px;color:#111827;">Upload paused.</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Check your connection and try again.</div>
        </div>
      </div>
    `,
    {
      duration: 5000,
      id: 'upload-network-error',
    }
  );
}

// ─── XHR Upload (supports progress tracking) ──────────────────────────────────

/**
 * Upload a file to S3 via a pre-signed PUT URL using XMLHttpRequest.
 * This is the ONLY way to track upload progress in the browser.
 *
 * @param {string} presignedUrl - The S3 pre-signed PUT URL
 * @param {File|Blob} file - The file to upload
 * @param {string} contentType - MIME type of the file
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<{ ok: boolean, status: number }>}
 */
function xhrPut(presignedUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('PUT', presignedUrl);
    // Set Content-Type explicitly for the presigned PUT (S3 requires it to match)
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

// ─── Core Upload Engine ────────────────────────────────────────────────────────

/**
 * Upload a file to S3.
 * Attempt 1: Pre-signed URL → direct XHR PUT to S3 (fast, no backend bandwidth)
 * Attempt 2: Fallback to backend Express /api/uploads/image or /api/uploads/pdf
 *
 * IMPORTANT: Never set Content-Type header on FormData — browser sets it with boundary.
 *
 * @param {File} file
 * @param {'image'|'raw'} resourceType
 * @param {string} folder - S3 folder prefix (e.g. 'listings', 'notices')
 * @param {function} [onProgress] - (percent: number) => void
 */
async function uploadToS3(file, resourceType, folder, onProgress) {
  const authHeaders = await getAuthHeaders();
  const fileExtension = file.name ? file.name.split('.').pop() : resourceType === 'image' ? 'jpg' : 'pdf';
  const contentType = file.type || (resourceType === 'image' ? 'image/jpeg' : 'application/pdf');
  const baseUrl = getBackendUrl();

  // ── Attempt 1: Pre-signed URL direct PUT ────────────────────────────────────
  try {
    const presignResponse = await fetch(`${baseUrl}/api/uploads/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        filename: file.name || `upload.${fileExtension}`,
        filetype: contentType,
        folder,
      }),
    });

    if (presignResponse.ok) {
      const presignedData = await presignResponse.json();

      if (presignedData?.uploadUrl && presignedData?.url) {
        // Use XHR for progress tracking — fetch() cannot track upload progress
        try {
          const { ok, status } = await xhrPut(
            presignedData.uploadUrl,
            file,
            contentType,
            onProgress
          );

          if (ok || status === 204) {
            return {
              url: presignedData.url,
              publicId: presignedData.key || presignedData.url,
              key: presignedData.key,
              format: fileExtension,
              resourceType,
            };
          }
        } catch (xhrErr) {
          const isNetworkError =
            xhrErr.message.includes('Network error') ||
            xhrErr.message.includes('aborted') ||
            !navigator.onLine;

          if (isNetworkError) {
            showNetworkErrorToast();
            throw xhrErr; // Surface to caller — don't fall through to backend
          }
          console.warn('[S3 Upload] XHR PUT failed, falling back to backend:', xhrErr.message);
        }
      }
    }
  } catch (presignErr) {
    if (presignErr.message?.includes('Network error') || presignErr.message?.includes('aborted')) {
      showNetworkErrorToast();
      throw presignErr;
    }
    console.warn('[S3 Upload] Pre-signed URL request failed, falling back to backend:', presignErr.message);
  }

  // ── Attempt 2: Backend Express upload (fallback) ─────────────────────────────
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const endpoint = `${baseUrl}/api/uploads/${resourceType === 'image' ? 'image' : 'pdf'}`;

  try {
    const fallbackResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (fallbackResponse.ok) {
      const fallbackResult = await fallbackResponse.json();
      if (fallbackResult?.url && !fallbackResult.error) {
        return {
          url: fallbackResult.url,
          publicId: fallbackResult.url,
          key: fallbackResult.url,
          format: fileExtension,
          resourceType,
        };
      }
    } else {
      console.warn(`[S3 Upload] Backend fallback responded with status ${fallbackResponse.status}`);
    }
  } catch (networkErr) {
    console.warn('[S3 Upload] Backend Express fallback network error:', networkErr.message);
  }

  // ── Attempt 3: Supabase Storage direct upload (failsafe) ─────────────────────
  try {
    let bucketName = 'campus-blink';
    let cleanFolder = String(folder || 'uploads');

    if (cleanFolder.startsWith('campus-blink/')) {
      cleanFolder = cleanFolder.replace(/^campus-blink\//, '');
    }

    const filePath = `${cleanFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;

    const { data: supaData, error: supaErr } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { upsert: true, contentType });

    if (!supaErr && supaData) {
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (urlData?.publicUrl) {
        return {
          url: urlData.publicUrl,
          publicId: filePath,
          key: filePath,
          format: fileExtension,
          resourceType,
        };
      }
    } else {
      console.warn(`[S3 Upload] Supabase storage upload to bucket "${bucketName}" failed:`, supaErr?.message || supaErr);

      // Fallback for specific buckets if 'campus-blink' bucket does not exist or has restrictive RLS
      const folderSegment = cleanFolder.split('/')[0];
      const knownBuckets = ['diaries', 'notice-attachments', 'print-files', 'quarantine'];
      if (knownBuckets.includes(folderSegment)) {
        const altBucket = folderSegment;
        const altPath = cleanFolder.slice(altBucket.length + 1) || `${Date.now()}.${fileExtension}`;
        const { data: altData, error: altErr } = await supabase.storage
          .from(altBucket)
          .upload(altPath, file, { upsert: true, contentType });

        if (!altErr && altData) {
          const { data: altUrlData } = supabase.storage.from(altBucket).getPublicUrl(altPath);
          if (altUrlData?.publicUrl) {
            return {
              url: altUrlData.publicUrl,
              publicId: altPath,
              key: altPath,
              format: fileExtension,
              resourceType,
            };
          }
        }
      }
    }
  } catch (supaErr) {
    console.warn('[S3 Upload] Supabase storage fallback error:', supaErr);
  }

  throw new Error('Upload failed. Unable to connect to storage service.');
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload an image to S3 with client-side compression.
 *
 * @param {File} file
 * @param {string} folder - S3 folder prefix
 * @param {{ onProgress?: (percent: number) => void, thumbnail?: boolean }} [options]
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function uploadImage(file, folder, options = {}) {
  try {
    const compressionOptions = options.thumbnail
      ? THUMBNAIL_COMPRESSION_OPTIONS
      : IMAGE_COMPRESSION_OPTIONS;

    const compressed = await imageCompression(file, compressionOptions);
    const result = await uploadToS3(compressed, 'image', folder, options.onProgress);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Upload a PDF to S3 (no compression, direct upload).
 *
 * @param {File} file
 * @param {string} folder - S3 folder prefix
 * @param {{ onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function uploadPDF(file, folder, options = {}) {
  try {
    const isPdf =
      file?.type === 'application/pdf' || file?.name?.toLowerCase?.().endsWith('.pdf');
    if (!isPdf) {
      throw new Error('Only PDF files are supported for print uploads.');
    }

    const result = await uploadToS3(file, 'raw', folder, options.onProgress);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Upload any file type to S3 (for notice attachments — images, PDFs, docs, etc.)
 * Images are compressed; other types go directly.
 *
 * @param {File} file
 * @param {string} folder - S3 folder prefix
 * @param {{ onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<{ data: { name: string, url: string, type: string, size: number } | null, error: Error | null }>}
 */
export async function uploadAttachment(file, folder, options = {}) {
  try {
    const isImage = file.type?.startsWith('image/');
    let uploadFile = file;

    if (isImage) {
      try {
        uploadFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2400,
          useWebWorker: true,
          initialQuality: 0.85,
        });
      } catch {
        uploadFile = file; // compression failed, use original
      }
    }

    const resourceType = isImage ? 'image' : 'raw';
    const result = await uploadToS3(uploadFile, resourceType, folder, options.onProgress);

    return {
      data: {
        name: file.name,
        url: result.url,
        type: file.type,
        size: file.size,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Delete a file from S3 by public URL or S3 key.
 *
 * @param {string} publicIdOrKey
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function deleteFile(publicIdOrKey) {
  try {
    if (!publicIdOrKey) {
      return { data: { deleted: false, reason: 'Missing key for deletion' }, error: null };
    }

    const authHeaders = await getAuthHeaders();
    const key = extractS3Key(publicIdOrKey) || publicIdOrKey;
    const baseUrl = getBackendUrl();

    const response = await fetch(`${baseUrl}/api/uploads/file`, {
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

// Backward-compat alias
export const extractCloudinaryPublicId = extractS3Key;
