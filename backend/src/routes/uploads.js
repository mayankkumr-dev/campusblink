const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const s3Service = require('../services/s3');

const upload = multer({ storage: multer.memoryStorage() });

// Generate presigned URL for direct S3 upload from client (offloads bandwidth/memory from EC2)
router.post('/presigned-url', authMiddleware, async (req, res) => {
  try {
    const { filename, filetype, folder = 'uploads' } = req.body;
    const userId = req.user.id;

    if (!filename) {
      return res.status(400).json({ error: 'filename required' });
    }

    const result = await s3Service.generatePresignedUrl(filename, filetype, folder, userId);

    res.json({
      message: 'Presigned URL generated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presigned URL' });
  }
});

// Upload image via backend Express server (fallback or direct API usage)
router.post('/image', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { folder = 'uploads' } = req.body;
    const userId = req.user.id;

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF allowed' });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }

    const url = await s3Service.uploadImage(req.file, folder, userId);

    res.json({
      message: 'Image uploaded successfully',
      url,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Upload PDF via backend Express server
router.post('/pdf', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { folder = 'documents' } = req.body;
    const userId = req.user.id;

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Invalid file type. Only PDF allowed' });
    }

    // Validate file size (max 20MB)
    if (req.file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum size is 20MB' });
    }

    const url = await s3Service.uploadPDF(req.file, folder, userId);

    res.json({
      message: 'PDF uploaded successfully',
      url,
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to upload PDF' });
  }
});

// Delete file from S3
router.delete('/file', authMiddleware, async (req, res) => {
  try {
    const { publicId, key } = req.body;
    const targetKey = key || publicId;

    if (!targetKey) {
      return res.status(400).json({ error: 'publicId or key required' });
    }

    /**
     * Ownership check:
     * S3 object keys follow the structure: campus-blink/{folder}/{userId}/...
     * Extract the userId segment (parts[2]) and verify whether it matches req.user.id
     * or if the requesting user is an admin (req.profile.role === 'admin').
     * Return 403 Forbidden if neither condition is met.
     */
    const cleanKey = s3Service.extractS3Key(targetKey) || String(targetKey);
    const parts = cleanKey.split('/');
    let extractedUserId = null;
    if (parts[0] === 'campus-blink' && parts.length >= 4) {
      extractedUserId = parts[2];
    }

    const isOwner = extractedUserId && extractedUserId === req.user.id;
    const isAdmin = req.profile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this file' });
    }

    await s3Service.deleteFile(cleanKey);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
});

module.exports = router;
