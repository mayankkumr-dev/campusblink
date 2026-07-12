const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    subjectId: {
      type: String,
      required: true,
      index: true,
    },
    sectionId: {
      type: String,
      required: true,
      index: true,
    },
    professorId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'locked', 'voided'],
      default: 'draft',
    },
    submittedAt: {
      type: Date,
    },
    editableUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate sessions for same subject, section, date, and timeSlot
attendanceSessionSchema.index(
  { subjectId: 1, sectionId: 1, date: 1, timeSlot: 1 },
  { unique: true }
);

// Pre-save hook to compute editableUntil (submittedAt + 24 hours)
attendanceSessionSchema.pre('save', function (next) {
  if (this.isModified('submittedAt') && this.submittedAt) {
    const editableDate = new Date(this.submittedAt.getTime() + 24 * 60 * 60 * 1000);
    this.editableUntil = editableDate;
  }
  next();
});

module.exports = mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', attendanceSessionSchema);
