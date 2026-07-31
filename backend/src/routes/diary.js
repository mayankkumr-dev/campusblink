/**
 * diary.js — Campus Diary API Routes (with Photo Moderation)
 *
 * Exposes:
 *   GET    /api/diary              — Global diary feed (paginated)
 *   GET    /api/diary/user/:userId — Entries for a specific user
 *   POST   /api/diary/quarantine   — Stage photo in private quarantine bucket before submission
 *   POST   /api/diary              — Submit diary entry + photo for AWS Rekognition & Text Moderation
 *   DELETE /api/diary/:id          — Delete own diary entry & associated photo
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const adminOnlyMiddleware = require('../middleware/adminOnly');

const upload = multer({ storage: multer.memoryStorage() });

const {
  getDiaryFeed,
  getUserDiaryEntries,
  uploadToQuarantine,
  createDiaryEntry,
  deleteDiaryEntry,
  getFlaggedDiaries,
  deleteAdminDiaryEntry,
  restoreFlaggedDiary,
  getDailyPrompt,
  getPromptOfDay,
  recordPromptParticipation,
} = require('../controllers/diaryController');

// Global feed (Public or Auth)
router.get('/', getDiaryFeed);

// Daily prompt endpoints (must come before /:id to avoid route conflicts)
router.get('/daily-prompt', getDailyPrompt);
router.get('/prompt-of-day', getPromptOfDay);
router.post('/prompt-of-day/:id/participate', authMiddleware, recordPromptParticipation);

// User gallery — must come before /:id to avoid conflict
router.get('/user/:userId', getUserDiaryEntries);

// Superadmin routes for managing flagged diaries (must come before /:id)
router.get('/admin/flagged', authMiddleware, adminOnlyMiddleware, getFlaggedDiaries);
router.delete('/admin/:id', authMiddleware, adminOnlyMiddleware, deleteAdminDiaryEntry);
router.post('/admin/:id/restore', authMiddleware, adminOnlyMiddleware, restoreFlaggedDiary);

// Stage photo to Quarantine bucket
router.post('/quarantine', authMiddleware, upload.single('image'), uploadToQuarantine);

// Create moderated diary entry (supports JSON body with quarantine_path OR direct multipart image upload)
router.post('/', authMiddleware, upload.single('image'), createDiaryEntry);

// Delete own entry
router.delete('/:id', authMiddleware, deleteDiaryEntry);

module.exports = router;
