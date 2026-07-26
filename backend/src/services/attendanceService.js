const fs = require('fs');
const path = require('path');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceDispute = require('../models/AttendanceDispute');
const { isDBConnected } = require('../config/db');
const { supabaseAdmin } = require('../config/supabase');
const {
  calculateAttendancePercentage,
  filterValidSessionsForStudent,
  computeSafeToMiss,
  DEFAULT_THRESHOLD_PERCENT,
} = require('../utils/attendanceCalculator');
const { emitAttendanceUpdate } = require('../config/socket');

// Hybrid fallback storage file path
const DATA_DIR = path.join(__dirname, '../../data');
const FALLBACK_FILE = path.join(DATA_DIR, 'attendance_fallback.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readFallbackData() {
  ensureDataDir();
  if (!fs.existsSync(FALLBACK_FILE)) {
    const initial = {
      sessions: [],
      records: [],
      disputes: [],
    };
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
  } catch (err) {
    return { sessions: [], records: [], disputes: [] };
  }
}

function writeFallbackData(data) {
  ensureDataDir();
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2));
}

/**
 * 1. Create or Open Attendance Session
 */
async function createSession({ subjectId, sectionId, professorId, date, timeSlot }) {
  const sessionDate = new Date(date);

  if (isDBConnected()) {
    // Check existing
    const existing = await AttendanceSession.findOne({
      subjectId,
      sectionId,
      date: sessionDate,
      timeSlot,
    });
    if (existing) {
      return { success: true, session: existing, isExisting: true };
    }
    const session = await AttendanceSession.create({
      subjectId,
      sectionId,
      professorId,
      date: sessionDate,
      timeSlot,
      status: 'draft',
    });
    return { success: true, session, isExisting: false };
  } else {
    // Fallback store
    const db = readFallbackData();
    const dateStr = sessionDate.toISOString().split('T')[0];
    const existing = db.sessions.find(
      s => s.subjectId === subjectId &&
           s.sectionId === sectionId &&
           new Date(s.date).toISOString().split('T')[0] === dateStr &&
           s.timeSlot === timeSlot
    );
    if (existing) {
      return { success: true, session: existing, isExisting: true };
    }
    const newSession = {
      _id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      subjectId,
      sectionId,
      professorId,
      date: sessionDate.toISOString(),
      timeSlot,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.sessions.push(newSession);
    writeFallbackData(db);
    return { success: true, session: newSession, isExisting: false };
  }
}

/**
 * 2. Get Student Roster with default-present prefill
 */
async function getRosterForSession(sessionId) {
  let session = null;
  let records = [];

  if (isDBConnected()) {
    session = await AttendanceSession.findById(sessionId);
    records = await AttendanceRecord.find({ sessionId });
  } else {
    const db = readFallbackData();
    session = db.sessions.find(s => String(s._id) === String(sessionId));
    records = db.records.filter(r => String(r.sessionId) === String(sessionId));
  }

  if (!session) {
    throw new Error('Attendance session not found');
  }

  // Fetch student profiles from Supabase — only active enrolled students
  let students = [];
  try {
    if (supabaseAdmin) {
      let query = supabaseAdmin
        .from('profiles')
        .select('id, name, full_name, roll_number, enrollment_number, email, role, section, branch, academic_year, enrollment_status')
        .eq('role', 'student')
        // Only include currently-enrolled students. Dropped students are
        // automatically excluded — their existing AttendanceRecords remain
        // correctly keyed to profiles.id and are unaffected.
        .eq('enrollment_status', 'active');

      if (session.sectionId && session.sectionId !== 'ALL') {
        // Section filtering can be enabled here once all students have the
        // section field populated via the enrollment lifecycle system.
        // query = query.eq('section', session.sectionId);
      }
      const { data, error } = await query.limit(200);
      if (!error && data && data.length > 0) {
        students = data;
      }
    }
  } catch (err) {
    console.warn('[AttendanceService] Supabase student roster fetch failed, using defaults');
  }

  // If no students found in DB yet, provide realistic mock students for testing / classroom demo
  if (students.length === 0) {
    students = [
      { id: 'stud_101', roll_number: '23CS101', name: 'Aarav Sharma', full_name: 'Aarav Sharma', email: 'aarav@campusblink.me' },
      { id: 'stud_102', roll_number: '23CS102', name: 'Diya Patel', full_name: 'Diya Patel', email: 'diya@campusblink.me' },
      { id: 'stud_103', roll_number: '23CS103', name: 'Rohan Verma', full_name: 'Rohan Verma', email: 'rohan@campusblink.me' },
      { id: 'stud_104', roll_number: '23CS104', name: 'Ananya Iyer', full_name: 'Ananya Iyer', email: 'ananya@campusblink.me' },
      { id: 'stud_105', roll_number: '23CS105', name: 'Kabir Mehta', full_name: 'Kabir Mehta', email: 'kabir@campusblink.me' },
      { id: 'stud_106', roll_number: '23CS106', name: 'Ishita Gupta', full_name: 'Ishita Gupta', email: 'ishita@campusblink.me' },
      { id: 'stud_107', roll_number: '23CS107', name: 'Aditya Nair', full_name: 'Aditya Nair', email: 'aditya@campusblink.me' },
      { id: 'stud_108', roll_number: '23CS108', name: 'Suhani Reddy', full_name: 'Suhani Reddy', email: 'suhani@campusblink.me' },
      { id: 'stud_109', roll_number: '23CS109', name: 'Vihaan Rao', full_name: 'Vihaan Rao', email: 'vihaan@campusblink.me' },
      { id: 'stud_110', roll_number: '23CS110', name: 'Kiara Joshi', full_name: 'Kiara Joshi', email: 'kiara@campusblink.me' },
    ];
  }

  // Map to roster grid items with default 'present'
  const recordMap = new Map();
  for (const r of records) {
    recordMap.set(String(r.studentId), r);
  }

  const roster = students.map((s, idx) => {
    const studentId = String(s.id);
    const existingRec = recordMap.get(studentId);
    const fullName = s.full_name || s.name || `Student ${idx + 1}`;
    const firstName = fullName.split(' ')[0];

    return {
      studentId,
      rollNumber: s.roll_number || `23CS1${(idx + 1).toString().padStart(2, '0')}`,
      name: fullName,
      firstName,
      email: s.email || '',
      status: existingRec ? existingRec.status : 'present', // Default present!
      recordId: existingRec ? existingRec._id : null,
    };
  });

  return { session, roster };
}

/**
 * 3. Bulk Update Records (Toggle present / absent)
 */
async function bulkUpdateRecords({ sessionId, records, editedBy, reason = 'Classroom roll call' }) {
  if (!Array.isArray(records)) {
    throw new Error('records must be an array');
  }

  const timestamp = new Date();

  // Pre-fetch profile snapshots for all students in this batch to avoid N+1 queries.
  // These snapshot values are stored on new AttendanceRecord documents so historical
  // sheets display correctly even after a student's profile changes during promotion.
  const studentIds = [...new Set(records.map(r => String(r.studentId)))];
  const profileSnapshotMap = new Map();
  try {
    if (supabaseAdmin && studentIds.length > 0) {
      const { data: profileRows } = await supabaseAdmin
        .from('profiles')
        .select('id, roll_number, enrollment_number, academic_year')
        .in('id', studentIds);
      if (profileRows) {
        profileRows.forEach(p => profileSnapshotMap.set(String(p.id), p));
      }
    }
  } catch (err) {
    // Non-fatal: snapshot fields will be null for this batch if the lookup fails.
    console.warn('[AttendanceService] Profile snapshot fetch failed:', err.message);
  }

  if (isDBConnected()) {
    const updated = [];
    for (const item of records) {
      const { studentId, status } = item;
      const snapshot = profileSnapshotMap.get(String(studentId)) || {};
      let record = await AttendanceRecord.findOne({ sessionId, studentId });
      if (record) {
        if (record.status !== status) {
          record.editHistory.push({
            editedBy,
            previousStatus: record.status,
            newStatus: status,
            timestamp,
            reason,
          });
          record.status = status;
          record.lastEditedBy = editedBy;
          await record.save();
        }
        // Note: we do NOT update snapshot fields on existing records — they are
        // intentionally frozen at the time the record was first created.
      } else {
        record = await AttendanceRecord.create({
          sessionId,
          studentId,
          status,
          lastEditedBy: editedBy,
          editHistory: [
            {
              editedBy,
              previousStatus: 'present',
              newStatus: status,
              timestamp,
              reason,
            },
          ],
          // Enrollment snapshot — frozen at time of marking
          rollNumberAtMarking:       snapshot.roll_number       || null,
          enrollmentNumberAtMarking: snapshot.enrollment_number || null,
          academicYearAtMarking:     snapshot.academic_year     || null,
        });
      }
      updated.push(record);
    }
    return updated;
  } else {
    const db = readFallbackData();
    const updated = [];
    for (const item of records) {
      const { studentId, status } = item;
      const snapshot = profileSnapshotMap.get(String(studentId)) || {};
      let record = db.records.find(
        r => String(r.sessionId) === String(sessionId) && String(r.studentId) === String(studentId)
      );
      if (record) {
        if (record.status !== status) {
          if (!Array.isArray(record.editHistory)) record.editHistory = [];
          record.editHistory.push({
            editedBy,
            previousStatus: record.status,
            newStatus: status,
            timestamp: timestamp.toISOString(),
            reason,
          });
          record.status = status;
          record.lastEditedBy = editedBy;
        }
        // Snapshot fields are not updated on existing records
      } else {
        record = {
          _id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          sessionId: String(sessionId),
          studentId: String(studentId),
          status,
          lastEditedBy: editedBy,
          editHistory: [
            {
              editedBy,
              previousStatus: 'present',
              newStatus: status,
              timestamp: timestamp.toISOString(),
              reason,
            },
          ],
          // Enrollment snapshot — frozen at time of marking
          rollNumberAtMarking:       snapshot.roll_number       || null,
          enrollmentNumberAtMarking: snapshot.enrollment_number || null,
          academicYearAtMarking:     snapshot.academic_year     || null,
          createdAt: timestamp.toISOString(),
          updatedAt: timestamp.toISOString(),
        };
        db.records.push(record);
      }
      updated.push(record);
    }
    writeFallbackData(db);
    return updated;
  }
}

/**
 * 4. Submit Session — locks session, computes editableUntil, and emits real-time update
 */
async function submitSession(sessionId) {
  const now = new Date();
  const editableUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let session = null;
  if (isDBConnected()) {
    session = await AttendanceSession.findByIdAndUpdate(
      sessionId,
      {
        status: 'submitted',
        submittedAt: now,
        editableUntil,
      },
      { new: true }
    );
  } else {
    const db = readFallbackData();
    session = db.sessions.find(s => String(s._id) === String(sessionId));
    if (session) {
      session.status = 'submitted';
      session.submittedAt = now.toISOString();
      session.editableUntil = editableUntil.toISOString();
      writeFallbackData(db);
    }
  }

  if (!session) {
    throw new Error('Session not found');
  }

  // Trigger real-time update over Socket.io
  emitAttendanceUpdate({
    sessionId: String(session._id),
    sectionId: session.sectionId,
    subjectId: session.subjectId,
    data: {
      status: 'submitted',
      submittedAt: session.submittedAt,
    },
  });

  return session;
}

/**
 * 5. Void Session — mark class as cancelled/holiday
 */
async function voidSession(sessionId) {
  let session = null;
  if (isDBConnected()) {
    session = await AttendanceSession.findByIdAndUpdate(
      sessionId,
      { status: 'voided' },
      { new: true }
    );
  } else {
    const db = readFallbackData();
    session = db.sessions.find(s => String(s._id) === String(sessionId));
    if (session) {
      session.status = 'voided';
      writeFallbackData(db);
    }
  }

  if (!session) {
    throw new Error('Session not found');
  }

  emitAttendanceUpdate({
    sessionId: String(session._id),
    sectionId: session.sectionId,
    subjectId: session.subjectId,
    data: { status: 'voided' },
  });

  return session;
}

/**
 * 6. Copy Previous Session Marks
 */
async function copyPreviousSession({ sessionId, professorId }) {
  let currentSession = null;
  let previousSession = null;
  let prevRecords = [];

  if (isDBConnected()) {
    currentSession = await AttendanceSession.findById(sessionId);
    if (!currentSession) throw new Error('Current session not found');

    previousSession = await AttendanceSession.findOne({
      subjectId: currentSession.subjectId,
      sectionId: currentSession.sectionId,
      _id: { $ne: currentSession._id },
    }).sort({ date: -1 });

    if (!previousSession) {
      throw new Error('No previous session found for this subject and section');
    }

    prevRecords = await AttendanceRecord.find({ sessionId: previousSession._id });
  } else {
    const db = readFallbackData();
    currentSession = db.sessions.find(s => String(s._id) === String(sessionId));
    if (!currentSession) throw new Error('Current session not found');

    const others = db.sessions
      .filter(s =>
        s.subjectId === currentSession.subjectId &&
        s.sectionId === currentSession.sectionId &&
        String(s._id) !== String(sessionId)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    previousSession = others[0];
    if (!previousSession) {
      throw new Error('No previous session found for this subject and section');
    }

    prevRecords = db.records.filter(r => String(r.sessionId) === String(previousSession._id));
  }

  const mappedPayload = prevRecords.map(r => ({
    studentId: r.studentId,
    status: r.status,
  }));

  return await bulkUpdateRecords({
    sessionId,
    records: mappedPayload,
    editedBy: professorId,
    reason: 'Copied from previous session',
  });
}

/**
 * 7. Student Overall & Per-Subject Summary
 */
async function getStudentSummary(studentId, thresholdPercent = DEFAULT_THRESHOLD_PERCENT) {
  let allSessions = [];
  let studentRecords = [];

  if (isDBConnected()) {
    studentRecords = await AttendanceRecord.find({ studentId });
    const sessionIds = [...new Set(studentRecords.map(r => r.sessionId))];
    allSessions = await AttendanceSession.find({ _id: { $in: sessionIds } });
  } else {
    const db = readFallbackData();
    studentRecords = db.records.filter(r => String(r.studentId) === String(studentId));
    const sessionIds = new Set(studentRecords.map(r => String(r.sessionId)));
    allSessions = db.sessions.filter(s => sessionIds.has(String(s._id)));
  }

  // Filter valid sessions (exclude voided sessions!)
  const validSessions = filterValidSessionsForStudent(allSessions);
  const validSessionIds = new Set(validSessions.map(s => String(s._id || s.id)));

  // Filter records belonging to valid sessions
  const validRecords = studentRecords.filter(r => validSessionIds.has(String(r.sessionId)));

  const totalHeld = validSessions.length;
  const totalAttended = validRecords.filter(r => r.status === 'present').length;
  const overallPercentage = calculateAttendancePercentage(totalAttended, totalHeld);

  // Per-subject breakdowns
  const bySubject = new Map();
  for (const sess of validSessions) {
    const subjId = sess.subjectId;
    if (!bySubject.has(subjId)) {
      bySubject.set(subjId, { held: 0, attended: 0, sessions: [] });
    }
    const bucket = bySubject.get(subjId);
    bucket.held += 1;
    bucket.sessions.push(sess);
  }

  for (const rec of validRecords) {
    const sess = validSessions.find(s => String(s._id || s.id) === String(rec.sessionId));
    if (sess && rec.status === 'present') {
      const bucket = bySubject.get(sess.subjectId);
      if (bucket) bucket.attended += 1;
    }
  }

  const subjects = [];
  for (const [subjId, bucket] of bySubject.entries()) {
    const percentage = calculateAttendancePercentage(bucket.attended, bucket.held);
    const safeInfo = computeSafeToMiss(bucket.attended, bucket.held, thresholdPercent);
    subjects.push({
      subjectId,
      classesHeld: bucket.held,
      classesAttended: bucket.attended,
      percentage,
      safeToMiss: safeInfo,
    });
  }

  return {
    studentId,
    overallPercentage,
    totalClassesHeld: totalHeld,
    totalClassesAttended: totalAttended,
    thresholdPercent,
    status: overallPercentage >= thresholdPercent ? 'SAFE' : 'CRITICAL',
    subjects,
  };
}

/**
 * 8. Class-by-Class History for a Student in a Subject
 */
async function getStudentSubjectHistory(studentId, subjectId) {
  let sessions = [];
  let records = [];

  if (isDBConnected()) {
    sessions = await AttendanceSession.find({ subjectId }).sort({ date: -1 });
    const sessionIds = sessions.map(s => s._id);
    records = await AttendanceRecord.find({ studentId, sessionId: { $in: sessionIds } });
  } else {
    const db = readFallbackData();
    sessions = db.sessions.filter(s => s.subjectId === subjectId).sort((a, b) => new Date(b.date) - new Date(a.date));
    const sessionIds = new Set(sessions.map(s => String(s._id)));
    records = db.records.filter(r => String(r.studentId) === String(studentId) && sessionIds.has(String(r.sessionId)));
  }

  const recordMap = new Map();
  for (const r of records) {
    recordMap.set(String(r.sessionId), r);
  }

  return sessions.map(sess => {
    const rec = recordMap.get(String(sess._id));
    return {
      sessionId: sess._id,
      date: sess.date,
      timeSlot: sess.timeSlot,
      status: sess.status === 'voided' ? 'voided' : (rec ? rec.status : 'absent'),
      sessionStatus: sess.status,
      recordId: rec ? rec._id : null,
    };
  });
}

/**
 * 9. Safe-to-Miss Calculator endpoint logic per subject
 */
async function getStudentSafeToMiss(studentId, thresholdPercent = DEFAULT_THRESHOLD_PERCENT) {
  const summary = await getStudentSummary(studentId, thresholdPercent);
  return {
    studentId,
    thresholdPercent,
    overallPercentage: summary.overallPercentage,
    subjects: summary.subjects.map(s => ({
      subjectId: s.subjectId,
      classesHeld: s.classesHeld,
      classesAttended: s.classesAttended,
      percentage: s.percentage,
      ...s.safeToMiss,
    })),
  };
}

/**
 * 10. Raise Dispute
 */
async function createDispute({ recordId, raisedBy, reason }) {
  if (isDBConnected()) {
    return await AttendanceDispute.create({
      recordId,
      raisedBy,
      reason,
      status: 'pending',
    });
  } else {
    const db = readFallbackData();
    const disp = {
      _id: `disp_${Date.now()}`,
      recordId: String(recordId),
      raisedBy: String(raisedBy),
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.disputes.push(disp);
    writeFallbackData(db);
    return disp;
  }
}

/**
 * 11. Resolve Dispute
 */
async function resolveDispute({ disputeId, status, resolvedBy, resolutionNote }) {
  if (isDBConnected()) {
    const dispute = await AttendanceDispute.findByIdAndUpdate(
      disputeId,
      {
        status,
        resolvedBy,
        resolutionNote,
      },
      { new: true }
    );
    if (!dispute) throw new Error('Dispute not found');

    // If approved, update the attendance record to present
    if (status === 'approved') {
      const record = await AttendanceRecord.findById(dispute.recordId);
      if (record && record.status !== 'present') {
        record.editHistory.push({
          editedBy: resolvedBy,
          previousStatus: record.status,
          newStatus: 'present',
          timestamp: new Date(),
          reason: `Dispute Approved: ${resolutionNote}`,
        });
        record.status = 'present';
        await record.save();
      }
    }
    return dispute;
  } else {
    const db = readFallbackData();
    const dispute = db.disputes.find(d => String(d._id) === String(disputeId));
    if (!dispute) throw new Error('Dispute not found');
    dispute.status = status;
    dispute.resolvedBy = resolvedBy;
    dispute.resolutionNote = resolutionNote;

    if (status === 'approved') {
      const rec = db.records.find(r => String(r._id) === String(dispute.recordId));
      if (rec && rec.status !== 'present') {
        if (!Array.isArray(rec.editHistory)) rec.editHistory = [];
        rec.editHistory.push({
          editedBy: resolvedBy,
          previousStatus: rec.status,
          newStatus: 'present',
          timestamp: new Date().toISOString(),
          reason: `Dispute Approved: ${resolutionNote}`,
        });
        rec.status = 'present';
      }
    }
    writeFallbackData(db);
    return dispute;
  }
}

/**
 * 12. Admin Defaulters List
 */
async function getAdminDefaulters({ subjectId, sectionId, thresholdPercent = DEFAULT_THRESHOLD_PERCENT }) {
  let sessions = [];
  let records = [];

  if (isDBConnected()) {
    const filter = {};
    if (subjectId && subjectId !== 'ALL') filter.subjectId = subjectId;
    if (sectionId && sectionId !== 'ALL') filter.sectionId = sectionId;

    sessions = await AttendanceSession.find(filter);
    const sessionIds = sessions.map(s => s._id);
    records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } });
  } else {
    const db = readFallbackData();
    sessions = db.sessions.filter(s => {
      if (subjectId && subjectId !== 'ALL' && s.subjectId !== subjectId) return false;
      if (sectionId && sectionId !== 'ALL' && s.sectionId !== sectionId) return false;
      return true;
    });
    const sessionIds = new Set(sessions.map(s => String(s._id)));
    records = db.records.filter(r => sessionIds.has(String(r.sessionId)));
  }

  const validSessions = filterValidSessionsForStudent(sessions);
  const validSessionIds = new Set(validSessions.map(s => String(s._id || s.id)));
  const validRecords = records.filter(r => validSessionIds.has(String(r.sessionId)));

  // Group by studentId
  const studentMap = new Map();
  for (const rec of validRecords) {
    const sid = String(rec.studentId);
    if (!studentMap.has(sid)) {
      studentMap.set(sid, { attended: 0, totalHeld: validSessions.length });
    }
    const entry = studentMap.get(sid);
    if (rec.status === 'present') entry.attended += 1;
  }

  // Fetch profiles for student names / roll numbers
  let profileMap = new Map();
  try {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('profiles').select('id, name, full_name, roll_number, email');
      if (data) {
        data.forEach(p => profileMap.set(String(p.id), p));
      }
    }
  } catch (err) {}

  const defaulters = [];
  for (const [sid, stats] of studentMap.entries()) {
    const pct = calculateAttendancePercentage(stats.attended, stats.totalHeld);
    if (pct < thresholdPercent) {
      const profile = profileMap.get(sid) || {};
      defaulters.push({
        studentId: sid,
        name: profile.full_name || profile.name || `Student (${sid.substr(0, 6)})`,
        rollNumber: profile.roll_number || 'N/A',
        email: profile.email || '',
        classesHeld: stats.totalHeld,
        classesAttended: stats.attended,
        percentage: pct,
      });
    }
  }

  return defaulters;
}

/**
 * 13. Audit Log for a Session
 */
async function getAuditLog(sessionId) {
  if (isDBConnected()) {
    const records = await AttendanceRecord.find({ sessionId });
    const log = [];
    records.forEach(r => {
      if (Array.isArray(r.editHistory)) {
        r.editHistory.forEach(edit => {
          log.push({
            recordId: r._id,
            studentId: r.studentId,
            ...edit.toObject ? edit.toObject() : edit,
          });
        });
      }
    });
    return log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else {
    const db = readFallbackData();
    const records = db.records.filter(r => String(r.sessionId) === String(sessionId));
    const log = [];
    records.forEach(r => {
      if (Array.isArray(r.editHistory)) {
        r.editHistory.forEach(edit => {
          log.push({
            recordId: r._id,
            studentId: r.studentId,
            ...edit,
          });
        });
      }
    });
    return log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

module.exports = {
  createSession,
  getRosterForSession,
  bulkUpdateRecords,
  submitSession,
  voidSession,
  copyPreviousSession,
  getStudentSummary,
  getStudentSubjectHistory,
  getStudentSafeToMiss,
  createDispute,
  resolveDispute,
  getAdminDefaulters,
  getAuditLog,
};
