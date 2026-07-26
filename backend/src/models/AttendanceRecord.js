const mongoose = require('mongoose');

const editHistorySubSchema = new mongoose.Schema(
  {
    editedBy: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ['present', 'absent'],
      required: true,
    },
    newStatus: {
      type: String,
      enum: ['present', 'absent'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      default: 'Correction',
    },
  },
  { _id: false }
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
      index: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
      required: true,
    },
    lastEditedBy: {
      type: String,
    },
    editHistory: {
      type: [editHistorySubSchema],
      default: [],
    },

    // ── Enrollment snapshot fields ──────────────────────────────────────────
    // These capture the student's identity info at the moment attendance is
    // marked. Historical sheets remain correct even after roll_number /
    // enrollment_number on the profiles row changes during promotion.
    // studentId (above) still references profiles.id — the permanent anchor.
    rollNumberAtMarking: {
      type: String,
      default: null,
    },
    enrollmentNumberAtMarking: {
      type: String,
      default: null,
    },
    academicYearAtMarking: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup by student and session
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);
