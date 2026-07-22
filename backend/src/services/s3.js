const { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName, region } = require('../config/s3');

function ensureS3Configured() {
  if (!s3Client || !bucketName) {
    throw new Error('S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in .env');
  }
}

function sanitizeFilename(filename = 'file') {
  return String(filename)
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_');
}

function extractS3Key(urlOrKey) {
  if (!urlOrKey) return null;
  const str = String(urlOrKey);
  if (str.startsWith('campus-blink/')) {
    return str;
  }
  if (str.includes('.amazonaws.com/')) {
    const parts = str.split('.amazonaws.com/');
    if (parts.length > 1) {
      return decodeURIComponent(parts[1].split('?')[0]);
    }
  }
  return str;
}

/** Generate a unique, collision-proof S3 object key */
function makeKey(folder, userId, filename) {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `campus-blink/${folder}/${userId}/${ts}-${rand}-${filename}`;
}

const s3Service = {
  // Upload image buffer from multer
  uploadImage: async (file, folder, userId) => {
    ensureS3Configured();
    const cleanedName = sanitizeFilename(file.originalname || 'image.jpg');
    const key = makeKey(folder, userId, cleanedName);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
    });

    await s3Client.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  },

  // Upload PDF buffer from multer
  uploadPDF: async (file, folder, userId) => {
    ensureS3Configured();
    const cleanedName = sanitizeFilename(file.originalname || 'document.pdf');
    const key = makeKey(folder, userId, cleanedName);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'application/pdf',
      ContentDisposition: 'inline',
    });

    await s3Client.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  },

  // Upload any generic file type (Word, Excel, text, etc.)
  uploadGeneric: async (file, folder, userId) => {
    ensureS3Configured();
    const cleanedName = sanitizeFilename(file.originalname || 'file');
    const key = makeKey(folder, userId, cleanedName);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'application/octet-stream',
      ContentDisposition: 'inline',
    });

    await s3Client.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  },

  // Delete single file by key or URL
  deleteFile: async (keyOrUrl) => {
    ensureS3Configured();
    const key = extractS3Key(keyOrUrl);
    if (!key) throw new Error('Invalid file key');

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
  },

  // Delete all objects sharing a prefix (used when purging user files)
  deleteByPrefix: async (prefix) => {
    if (!s3Client || !bucketName || !prefix) return;
    try {
      let isTruncated = true;
      let continuationToken = undefined;

      while (isTruncated) {
        const listCmd = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });

        const listRes = await s3Client.send(listCmd);
        const contents = listRes.Contents;

        if (contents && contents.length > 0) {
          const deleteCmd = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: contents.map((obj) => ({ Key: obj.Key })),
              Quiet: true,
            },
          });
          await s3Client.send(deleteCmd);
        }

        isTruncated = listRes.IsTruncated || false;
        continuationToken = listRes.NextContinuationToken;
      }
    } catch (error) {
      console.error(`[S3] Failed to delete resources by prefix ${prefix}:`, error.message);
    }
  },

  // Generate Pre-signed URL for direct client-to-S3 PUT uploads.
  // The client receives this URL and PUTs the raw file directly — no server bandwidth used.
  generatePresignedUrl: async (filename, filetype, folder, userId) => {
    ensureS3Configured();
    const cleanedName = sanitizeFilename(filename || 'upload');
    const key = makeKey(folder, userId, cleanedName);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: filetype || 'application/octet-stream',
    });

    // Pre-signed URL expires in 10 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      key,
      url: publicUrl,
    };
  },

  extractS3Key,
};

module.exports = s3Service;
