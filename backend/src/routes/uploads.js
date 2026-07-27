const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const s3Service = require('../services/s3');

// multer: use memory storage, file size limits enforced here
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB hard limit
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_SIZE = 25 * 1024 * 1024;   // 25 MB

// ─── Pre-signed URL (POST) ────────────────────────────────────────────────────
// Frontend requests this, backend returns a time-limited PUT URL.
// The browser then PUTs the raw file directly to S3 — no bandwidth through server.
//
// Supports POST (JSON body) for all clients.
router.post('/presigned-url', authMiddleware, async (req, res) => {
  try {
    const { filename, filetype, folder = 'uploads' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!filename || typeof filename !== 'string' || !filename.trim()) {
      return res.status(400).json({ error: 'filename is required' });
    }

    // Validate folder to prevent path traversal
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9\-_/]/g, '').slice(0, 150) || 'uploads';

    const result = await s3Service.generatePresignedUrl(
      filename.trim(),
      filetype || 'application/octet-stream',
      safeFolder,
      userId
    );

    return res.json({
      message: 'Pre-signed URL generated',
      ...result,
    });
  } catch (error) {
    console.error('[uploads] Error generating presigned URL:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate pre-signed URL' });
  }
});

// ─── Pre-signed URL (GET) — convenience alias for simple clients ──────────────
router.get('/presigned-url', authMiddleware, async (req, res) => {
  try {
    const { filename, filetype, folder = 'uploads' } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!filename || typeof filename !== 'string' || !filename.trim()) {
      return res.status(400).json({ error: 'filename query parameter is required' });
    }

    const safeFolder = String(folder).replace(/[^a-zA-Z0-9\-_/]/g, '').slice(0, 80) || 'uploads';

    const result = await s3Service.generatePresignedUrl(
      filename.trim(),
      filetype || 'application/octet-stream',
      safeFolder,
      userId
    );

    return res.json({
      message: 'Pre-signed URL generated',
      ...result,
    });
  } catch (error) {
    console.error('[uploads] Error generating presigned URL (GET):', error);
    return res.status(500).json({ error: error.message || 'Failed to generate pre-signed URL' });
  }
});

// ─── Backend Image Upload (Express Fallback) ──────────────────────────────────
// Used as fallback when S3 direct PUT is blocked by CORS or network.
// IMPORTANT: multer handles Content-Type parsing — do NOT set it manually on frontend.
// Field name MUST be 'file' — this matches frontend FormData.append('file', ...)
router.post('/image', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Expected field name: "file"' });
    }

    const { folder = 'uploads' } = req.body;
    const userId = req.user?.id;

    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type "${req.file.mimetype}". Allowed: JPEG, PNG, WebP, GIF, AVIF`,
      });
    }

    if (req.file.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({ error: 'File too large. Maximum image size is 10 MB' });
    }

    const url = await s3Service.uploadImage(req.file, folder, userId);

    return res.json({ message: 'Image uploaded successfully', url });
  } catch (error) {
    console.error('[uploads] Image upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// ─── Backend PDF Upload (Express Fallback) ────────────────────────────────────
// Field name MUST be 'file' — matches frontend FormData.append('file', ...)
router.post('/pdf', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Expected field name: "file"' });
    }

    const { folder = 'documents' } = req.body;
    const userId = req.user?.id;

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Invalid file type. Only PDF files are allowed' });
    }

    if (req.file.size > MAX_PDF_SIZE) {
      return res.status(400).json({ error: 'File too large. Maximum PDF size is 25 MB' });
    }

    const url = await s3Service.uploadPDF(req.file, folder, userId);

    return res.json({ message: 'PDF uploaded successfully', url });
  } catch (error) {
    console.error('[uploads] PDF upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload PDF' });
  }
});

// ─── Generic Attachment Upload (for notice attachments: images, PDFs, docs) ───
// Field name MUST be 'file'
router.post('/attachment', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Expected field name: "file"' });
    }

    const { folder = 'attachments' } = req.body;
    const userId = req.user?.id;

    if (req.file.size > MAX_PDF_SIZE) {
      return res.status(400).json({ error: 'File too large. Maximum size is 25 MB' });
    }

    // Route to appropriate S3 upload method
    let url;
    if (req.file.mimetype === 'application/pdf') {
      url = await s3Service.uploadPDF(req.file, folder, userId);
    } else if (ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      url = await s3Service.uploadImage(req.file, folder, userId);
    } else {
      // Generic file upload (Word, Excel, etc.)
      url = await s3Service.uploadGeneric(req.file, folder, userId);
    }

    return res.json({
      message: 'Attachment uploaded successfully',
      url,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('[uploads] Attachment upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload attachment' });
  }
});

// ─── Delete File ──────────────────────────────────────────────────────────────
router.delete('/file', authMiddleware, async (req, res) => {
  try {
    const { publicId, key } = req.body;
    const targetKey = key || publicId;

    if (!targetKey) {
      return res.status(400).json({ error: 'publicId or key is required' });
    }

    /**
     * Ownership check:
     * S3 object keys follow the structure: campus-blink/{folder}/{userId}/...
     * Extract the userId segment (parts[2]) and verify it matches req.user.id
     * or the requesting user is an admin (req.profile.role === 'admin').
     */
    const cleanKey = s3Service.extractS3Key(targetKey) || String(targetKey);
    const parts = cleanKey.split('/');
    let extractedUserId = null;
    if (parts[0] === 'campus-blink' && parts.length >= 4) {
      extractedUserId = parts[2];
    }

    const isOwner = (extractedUserId && extractedUserId === req.user.id) || parts.includes(req.user.id);
    const isAdmin = req.profile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this file' });
    }

    await s3Service.deleteFile(cleanKey);

    return res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('[uploads] File delete error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
});

module.exports = router;
