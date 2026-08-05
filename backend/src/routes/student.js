const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { parseTimetableDocument } = require('../utils/timetableParser');

// In-memory fallback store to ensure schedule resilience
const studentScheduleFallbackStore = new Map();
const fs = require('fs');
const path = require('path');
const SCHEDULE_FALLBACK_FILE = path.join(__dirname, '../../data/student_schedules.json');

function loadDiskSchedules() {
  try {
    if (fs.existsSync(SCHEDULE_FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULE_FALLBACK_FILE, 'utf8')) || {};
    }
  } catch (_) {}
  return {};
}

function saveDiskSchedule(studentId, schedule) {
  try {
    const data = loadDiskSchedules();
    if (schedule && Array.isArray(schedule) && schedule.length > 0) {
      data[studentId] = schedule;
    } else {
      delete data[studentId];
    }
    fs.mkdirSync(path.dirname(SCHEDULE_FALLBACK_FILE), { recursive: true });
    fs.writeFileSync(SCHEDULE_FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

// GET /api/student/schedule — Fetch student's saved schedule
router.get('/schedule', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Try Auth user_metadata
    const { data: { user }, error: dbErr } = await supabaseAdmin.auth.admin.getUserById(studentId);

    if (!dbErr && user?.user_metadata?.schedule && Array.isArray(user.user_metadata.schedule)) {
      studentScheduleFallbackStore.set(studentId, user.user_metadata.schedule);
      return res.json({ schedule: user.user_metadata.schedule });
    }

    // Check fallback store & disk file
    const fallback = studentScheduleFallbackStore.get(studentId) || loadDiskSchedules()[studentId] || [];
    res.json({ schedule: fallback });
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    const fallback = studentScheduleFallbackStore.get(req.user?.id) || loadDiskSchedules()[req.user?.id] || [];
    res.json({ schedule: fallback });
  }
});

// PUT /api/student/schedule — Save/Update student schedule JSON array
router.put('/schedule', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { schedule } = req.body;

    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule must be an array of classes' });
    }

    studentScheduleFallbackStore.set(studentId, schedule);
    saveDiskSchedule(studentId, schedule);

    // Persist into Auth user_metadata
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(studentId);
      
      const updatedMetadata = {
        ...(user?.user_metadata || {}),
        schedule: schedule,
        schedule_updated_at: new Date().toISOString(),
      };

      await supabaseAdmin.auth.admin.updateUserById(studentId, {
        user_metadata: updatedMetadata
      });
    } catch (_) {}

    res.json({ success: true, message: 'Schedule saved successfully', schedule });
  } catch (error) {
    console.error('Error saving student schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

// POST /api/student/schedule/upload — Upload PDF or Image and parse timetable
router.post('/schedule/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No timetable file uploaded (.pdf, .png, .jpg)' });
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a PDF, PNG, or JPG file.' });
    }

    const studentId = req.user.id;
    const parseResult = await parseTimetableDocument(req.file.buffer, req.file.mimetype, req.file.originalname);

    if (!parseResult.success) {
      return res.status(500).json({ error: parseResult.error || 'Failed to extract timetable data' });
    }

    const schedule = parseResult.schedule;
    studentScheduleFallbackStore.set(studentId, schedule);
    saveDiskSchedule(studentId, schedule);

    // Save in Auth user_metadata
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(studentId);

      const updatedMetadata = {
        ...(user?.user_metadata || {}),
        schedule: schedule,
        schedule_updated_at: new Date().toISOString(),
      };

      await supabaseAdmin.auth.admin.updateUserById(studentId, {
        user_metadata: updatedMetadata
      });
    } catch (_) {}

    res.json({
      success: true,
      message: 'Timetable uploaded and parsed successfully!',
      metadata: parseResult.metadata,
      schedule: schedule,
    });
  } catch (error) {
    console.error('Error parsing timetable file:', error);
    res.status(500).json({ error: 'Failed to parse timetable upload' });
  }
});

// DELETE /api/student/schedule — Delete student schedule
router.delete('/schedule', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    studentScheduleFallbackStore.delete(studentId);
    saveDiskSchedule(studentId, null);

    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(studentId);

      const updatedMetadata = {
        ...(user?.user_metadata || {}),
        schedule: []
      };

      await supabaseAdmin.auth.admin.updateUserById(studentId, {
        user_metadata: updatedMetadata
      });
    } catch (_) {}

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting student schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;
