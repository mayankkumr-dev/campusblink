const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const professorOnlyMiddleware = require('../middleware/professorOnly');
const { supabaseAdmin } = require('../config/supabase');

// Get professor home dashboard statistics
router.get('/home-stats', authMiddleware, professorOnlyMiddleware, async (req, res) => {
  try {
    const professorId = req.user.id;

    // Total orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status')
      .eq('professor_id', professorId);

    if (ordersError) {
      return res.status(400).json({ error: ordersError.message });
    }

    // Pending payments
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from('professor_pending_payments')
      .select('*')
      .eq('professor_id', professorId)
      .eq('status', 'pending');

    if (pendingError) {
      return res.status(400).json({ error: pendingError.message });
    }

    res.json({
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pendingPayments: pending.length,
      totalPending: pending.reduce((sum, p) => sum + p.amount, 0),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all orders for professor
router.get('/orders', authMiddleware, professorOnlyMiddleware, async (req, res) => {
  try {
    const professorId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('professor_id', professorId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { parseTimetableDocument } = require('../utils/timetableParser');

// In-memory fallback store to ensure schedule resilience even if DB table is uninitialized
const professorScheduleFallbackStore = new Map();
const fs = require('fs');
const path = require('path');
const SCHEDULE_FALLBACK_FILE = path.join(__dirname, '../../data/professor_schedules.json');

function loadDiskSchedules() {
  try {
    if (fs.existsSync(SCHEDULE_FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULE_FALLBACK_FILE, 'utf8')) || {};
    }
  } catch (_) {}
  return {};
}

function saveDiskSchedule(professorId, schedule) {
  try {
    const data = loadDiskSchedules();
    if (schedule && Array.isArray(schedule) && schedule.length > 0) {
      data[professorId] = schedule;
    } else {
      delete data[professorId];
    }
    fs.mkdirSync(path.dirname(SCHEDULE_FALLBACK_FILE), { recursive: true });
    fs.writeFileSync(SCHEDULE_FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

// GET /api/professor/schedule — Fetch professor's saved schedule
router.get('/schedule', authMiddleware, professorOnlyMiddleware, async (req, res) => {
  try {
    const professorId = req.user.id;

    // First try Supabase professor_schedules table
    const { data: dbSchedule, error: dbErr } = await supabaseAdmin
      .from('professor_schedules')
      .select('schedule')
      .eq('professor_id', professorId)
      .maybeSingle();

    if (!dbErr && dbSchedule && Array.isArray(dbSchedule.schedule)) {
      professorScheduleFallbackStore.set(professorId, dbSchedule.schedule);
      return res.json({ schedule: dbSchedule.schedule });
    }

    // Try profiles table metadata fallback
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('metadata')
      .eq('id', professorId)
      .maybeSingle();

    if (profile?.metadata?.schedule && Array.isArray(profile.metadata.schedule)) {
      professorScheduleFallbackStore.set(professorId, profile.metadata.schedule);
      return res.json({ schedule: profile.metadata.schedule });
    }

    // Check fallback store & disk file
    const fallback = professorScheduleFallbackStore.get(professorId) || loadDiskSchedules()[professorId] || [];
    res.json({ schedule: fallback });
  } catch (error) {
    console.error('Error fetching professor schedule:', error);
    const fallback = professorScheduleFallbackStore.get(req.user?.id) || loadDiskSchedules()[req.user?.id] || [];
    res.json({ schedule: fallback });
  }
});

// PUT /api/professor/schedule — Save/Update professor schedule JSON array
router.put('/schedule', authMiddleware, professorOnlyMiddleware, async (req, res) => {
  try {
    const professorId = req.user.id;
    const { schedule } = req.body;

    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule must be an array of classes' });
    }

    professorScheduleFallbackStore.set(professorId, schedule);
    saveDiskSchedule(professorId, schedule);

    // Persist to professor_schedules table (upsert)
    try {
      await supabaseAdmin
        .from('professor_schedules')
        .upsert({
          professor_id: professorId,
          schedule: schedule,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'professor_id' });
    } catch (_) {}

    // Also persist into profile metadata
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('metadata')
        .eq('id', professorId)
        .maybeSingle();

      const updatedMetadata = {
        ...(profile?.metadata || {}),
        schedule: schedule,
        schedule_updated_at: new Date().toISOString(),
      };

      await supabaseAdmin
        .from('profiles')
        .update({ metadata: updatedMetadata })
        .eq('id', professorId);
    } catch (_) {}

    res.json({ success: true, message: 'Schedule saved successfully', schedule });
  } catch (error) {
    console.error('Error saving professor schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

// POST /api/professor/schedule/upload — Upload PDF or Image and parse timetable
router.post('/schedule/upload', authMiddleware, professorOnlyMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No timetable file uploaded (.pdf, .png, .jpg)' });
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a PDF, PNG, or JPG file.' });
    }

    const professorId = req.user.id;
    const parseResult = await parseTimetableDocument(req.file.buffer, req.file.mimetype, req.file.originalname);

    if (!parseResult.success) {
      return res.status(500).json({ error: parseResult.error || 'Failed to extract timetable data' });
    }

    const schedule = parseResult.schedule;
    professorScheduleFallbackStore.set(professorId, schedule);
    saveDiskSchedule(professorId, schedule);

    // Save parsed schedule to database
    try {
      await supabaseAdmin
        .from('professor_schedules')
        .upsert({
          professor_id: professorId,
          schedule: schedule,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'professor_id' });
    } catch (_) {}

    // Also save in profile metadata
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('metadata')
        .eq('id', professorId)
        .maybeSingle();

      const updatedMetadata = {
        ...(profile?.metadata || {}),
        schedule: schedule,
        schedule_updated_at: new Date().toISOString(),
      };

      await supabaseAdmin
        .from('profiles')
        .update({ metadata: updatedMetadata })
        .eq('id', professorId);
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

// DELETE /api/professor/schedule — Delete professor schedule
router.delete('/schedule', authMiddleware, professorOnlyMiddleware, async (req, res) => {
  try {
    const professorId = req.user.id;
    professorScheduleFallbackStore.delete(professorId);
    saveDiskSchedule(professorId, null);

    try {
      await supabaseAdmin
        .from('professor_schedules')
        .delete()
        .eq('professor_id', professorId);
    } catch (_) {}

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('metadata')
        .eq('id', professorId)
        .maybeSingle();

      const updatedMetadata = {
        ...(profile?.metadata || {}),
        schedule: []
      };

      await supabaseAdmin
        .from('profiles')
        .update({ metadata: updatedMetadata })
        .eq('id', professorId);
    } catch (_) {}

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting professor schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;

