const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const attendanceService = require('../services/attendanceService');

// Helper to normalize user role
function getUserRole(req) {
  const rawRole = req.profile?.role || req.user?.user_metadata?.role || req.user?.role || '';
  return String(rawRole).toLowerCase().trim();
}

function requireProfessorOrAdmin(req, res, next) {
  const role = getUserRole(req);
  if (role !== 'professor' && role !== 'admin' && role !== 'super_admin' && role !== 'faculty') {
    return res.status(403).json({ error: 'Forbidden: Professor or Admin role required' });
  }
  next();
}

function requireAdminOrProfessor(req, res, next) {
  const role = getUserRole(req);
  if (role !== 'admin' && role !== 'super_admin' && role !== 'professor' && role !== 'faculty') {
    return res.status(403).json({ error: 'Forbidden: Authorized role required' });
  }
  next();
}

// ==========================================
// PROFESSOR / SESSION API ROUTES
// ==========================================

/**
 * POST /api/attendance/sessions
 * Create or open an attendance session
 */
router.post('/sessions', authMiddleware, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { subjectId, sectionId, date, timeSlot } = req.body;
    if (!subjectId || !sectionId || !date || !timeSlot) {
      return res.status(400).json({ error: 'subjectId, sectionId, date, and timeSlot are required' });
    }

    const professorId = req.user.id;
    const result = await attendanceService.createSession({
      subjectId,
      sectionId,
      professorId,
      date,
      timeSlot,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('[Attendance API] POST /sessions error:', error);
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
});

/**
 * GET /api/attendance/sessions/:id/roster
 * Get student roster with default-present prefill
 */
router.get('/sessions/:id/roster', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await attendanceService.getRosterForSession(id);
    res.json(data);
  } catch (error) {
    console.error('[Attendance API] GET /sessions/:id/roster error:', error);
    res.status(500).json({ error: error.message || 'Failed to get roster' });
  }
});

/**
 * PATCH /api/attendance/sessions/:id/records
 * Bulk update records (toggle present/absent)
 */
router.patch('/sessions/:id/records', authMiddleware, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { records, reason } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }

    const updated = await attendanceService.bulkUpdateRecords({
      sessionId: id,
      records,
      editedBy: req.user.id,
      reason: reason || 'Classroom mark update',
    });

    res.json({ success: true, updatedCount: updated.length, records: updated });
  } catch (error) {
    console.error('[Attendance API] PATCH /sessions/:id/records error:', error);
    res.status(500).json({ error: error.message || 'Failed to update attendance records' });
  }
});

/**
 * POST /api/attendance/sessions/:id/submit
 * Lock and submit session, triggering real-time push
 */
router.post('/sessions/:id/submit', authMiddleware, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const session = await attendanceService.submitSession(id);
    res.json({ success: true, session });
  } catch (error) {
    console.error('[Attendance API] POST /sessions/:id/submit error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit session' });
  }
});

/**
 * PATCH /api/attendance/sessions/:id/void
 * Mark class as not-held / cancelled (excluded from denominator)
 */
router.patch('/sessions/:id/void', authMiddleware, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const session = await attendanceService.voidSession(id);
    res.json({ success: true, session });
  } catch (error) {
    console.error('[Attendance API] PATCH /sessions/:id/void error:', error);
    res.status(500).json({ error: error.message || 'Failed to void session' });
  }
});

/**
 * POST /api/attendance/sessions/:id/copy-previous
 * Clone last session's marks as starting point
 */
router.post('/sessions/:id/copy-previous', authMiddleware, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await attendanceService.copyPreviousSession({
      sessionId: id,
      professorId: req.user.id,
    });
    res.json({ success: true, updated });
  } catch (error) {
    console.error('[Attendance API] POST /sessions/:id/copy-previous error:', error);
    res.status(500).json({ error: error.message || 'Failed to copy previous session' });
  }
});

// ==========================================
// STUDENT API ROUTES
// ==========================================

/**
 * GET /api/attendance/student/:studentId/summary
 * Overall % + per-subject %
 */
router.get('/student/:studentId/summary', authMiddleware, async (req, res) => {
  try {
    let { studentId } = req.params;
    if (studentId === 'me') {
      studentId = req.user.id;
    }
    const thresholdPercent = req.query.threshold ? parseInt(req.query.threshold, 10) : 75;
    const summary = await attendanceService.getStudentSummary(studentId, thresholdPercent);
    res.json(summary);
  } catch (error) {
    console.error('[Attendance API] GET /student/:id/summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to get student summary' });
  }
});

/**
 * GET /api/attendance/student/:studentId/subject/:id
 * Class-by-class history for one subject
 */
router.get('/student/:studentId/subject/:id', authMiddleware, async (req, res) => {
  try {
    let { studentId, id: subjectId } = req.params;
    if (studentId === 'me') {
      studentId = req.user.id;
    }
    const history = await attendanceService.getStudentSubjectHistory(studentId, subjectId);
    res.json({ studentId, subjectId, history });
  } catch (error) {
    console.error('[Attendance API] GET /student/:id/subject/:id error:', error);
    res.status(500).json({ error: error.message || 'Failed to get subject attendance history' });
  }
});

/**
 * GET /api/attendance/student/:studentId/safe-to-miss
 * Computed "classes you can still skip" per subject
 */
router.get('/student/:studentId/safe-to-miss', authMiddleware, async (req, res) => {
  try {
    let { studentId } = req.params;
    if (studentId === 'me') {
      studentId = req.user.id;
    }
    const thresholdPercent = req.query.threshold ? parseInt(req.query.threshold, 10) : 75;
    const result = await attendanceService.getStudentSafeToMiss(studentId, thresholdPercent);
    res.json(result);
  } catch (error) {
    console.error('[Attendance API] GET /student/:id/safe-to-miss error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate safe to miss' });
  }
});

// ==========================================
// DISPUTES API ROUTES
// ==========================================

/**
 * POST /api/attendance/disputes
 * Student raises a dispute
 */
router.post('/disputes', authMiddleware, async (req, res) => {
  try {
    const { recordId, reason } = req.body;
    if (!recordId || !reason) {
      return res.status(400).json({ error: 'recordId and reason are required' });
    }
    const dispute = await attendanceService.createDispute({
      recordId,
      raisedBy: req.user.id,
      reason,
    });
    res.status(201).json({ success: true, dispute });
  } catch (error) {
    console.error('[Attendance API] POST /disputes error:', error);
    res.status(500).json({ error: error.message || 'Failed to raise dispute' });
  }
});

/**
 * PATCH /api/attendance/disputes/:id
 * Admin/Professor resolves dispute
 */
router.patch('/disputes/:id', authMiddleware, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const dispute = await attendanceService.resolveDispute({
      disputeId: id,
      status,
      resolvedBy: req.user.id,
      resolutionNote: resolutionNote || '',
    });
    res.json({ success: true, dispute });
  } catch (error) {
    console.error('[Attendance API] PATCH /disputes/:id error:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve dispute' });
  }
});

// ==========================================
// ADMIN API ROUTES
// ==========================================

/**
 * GET /api/attendance/admin/defaulters
 * Students below threshold, filterable by subject/section
 */
router.get('/admin/defaulters', authMiddleware, requireAdminOrProfessor, async (req, res) => {
  try {
    const { subjectId, sectionId, threshold } = req.query;
    const thresholdPercent = threshold ? parseInt(threshold, 10) : 75;

    const defaulters = await attendanceService.getAdminDefaulters({
      subjectId,
      sectionId,
      thresholdPercent,
    });

    res.json({
      success: true,
      count: defaulters.length,
      thresholdPercent,
      defaulters,
    });
  } catch (error) {
    console.error('[Attendance API] GET /admin/defaulters error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch defaulters' });
  }
});

/**
 * GET /api/attendance/admin/audit-log/:sessionId
 * Full edit history for a session
 */
router.get('/admin/audit-log/:sessionId', authMiddleware, requireAdminOrProfessor, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const auditLog = await attendanceService.getAuditLog(sessionId);
    res.json({ sessionId, count: auditLog.length, auditLog });
  } catch (error) {
    console.error('[Attendance API] GET /admin/audit-log/:sessionId error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch audit log' });
  }
});

module.exports = router;
