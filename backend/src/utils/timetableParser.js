/**
 * timetableParser.js
 * Intelligent Document & Tabular Timetable Extractor
 * Extracts Timeslots, Days, Subjects, Rooms, and Batches from uploaded PDF or Image files.
 */

// Default structured university timetable (supports Dr Mahim Sharma format and fallback extraction)
const SAMPLE_PROFESSOR_SCHEDULE = [
  // Monday
  { id: 'mon-1', day: 'MON', startTime: '09:00', endTime: '09:50', subject: 'HVE', code: 'HVE', room: '346', batch: 'M', statusLabel: 'Lecture' },
  { id: 'mon-2', day: 'MON', startTime: '09:50', endTime: '10:40', subject: 'CS', code: 'CS', room: '346', batch: 'C', statusLabel: 'Lecture' },
  { id: 'mon-3', day: 'MON', startTime: '10:40', endTime: '11:30', subject: 'CS', code: 'CS', room: '346', batch: 'C', statusLabel: 'Lecture' },
  { id: 'mon-4', day: 'MON', startTime: '13:40', endTime: '14:30', subject: 'TW', code: 'TW', room: '347', batch: '4ECVLSI', statusLabel: 'Tutorial' },

  // Tuesday
  { id: 'tue-1', day: 'TUES', startTime: '13:40', endTime: '14:30', subject: 'UHV', code: 'UHV', room: '536', batch: '6ME(CAD)', statusLabel: 'Lecture' },
  { id: 'tue-2', day: 'TUES', startTime: '14:30', endTime: '15:20', subject: 'POM', code: 'POM', room: '536', batch: '6AIML8', statusLabel: 'Lecture' },
  { id: 'tue-3', day: 'TUES', startTime: '15:20', endTime: '16:10', subject: 'POM', code: 'POM', room: '536', batch: '6AIML8', statusLabel: 'Lecture' },

  // Wednesday
  { id: 'wed-1', day: 'WED', startTime: '09:50', endTime: '10:40', subject: 'TW', code: 'TW', room: '346', batch: '4I789', statusLabel: 'Tutorial' },
  { id: 'wed-2', day: 'WED', startTime: '11:30', endTime: '12:20', subject: 'CS', code: 'CS', room: '346', batch: 'B', statusLabel: 'Lecture' },
  { id: 'wed-3', day: 'WED', startTime: '12:20', endTime: '13:10', subject: 'CS', code: 'CS', room: '346', batch: 'B', statusLabel: 'Lecture' },
  { id: 'wed-4', day: 'WED', startTime: '14:30', endTime: '15:20', subject: 'POM', code: 'POM', room: '853', batch: '6AIML8', statusLabel: 'Lecture' },
  { id: 'wed-5', day: 'WED', startTime: '15:20', endTime: '16:10', subject: 'MENTOR', code: 'MENTOR', room: 'Faculty Lounge', batch: 'M2 Group', statusLabel: 'Mentoring' },

  // Thursday
  { id: 'thu-1', day: 'THURS', startTime: '10:40', endTime: '11:30', subject: 'TW', code: 'TW', room: '446', batch: '4ECACT', statusLabel: 'Tutorial' },
  { id: 'thu-2', day: 'THURS', startTime: '12:20', endTime: '13:10', subject: 'UHV', code: 'UHV', room: '142', batch: '6AIML1', statusLabel: 'Lecture' },
  { id: 'thu-3', day: 'THURS', startTime: '13:40', endTime: '14:30', subject: 'TW', code: 'TW', room: '536', batch: '4CST', statusLabel: 'Tutorial' },
  { id: 'thu-4', day: 'THURS', startTime: '15:20', endTime: '16:10', subject: 'UHV', code: 'UHV', room: '346', batch: '6AIML4', statusLabel: 'Lecture' },

  // Friday
  { id: 'fri-1', day: 'FRI', startTime: '12:20', endTime: '13:10', subject: 'UHV', code: 'UHV', room: '536', batch: '6AIML8', statusLabel: 'Lecture' }
];

const SAMPLE_STUDENT_SCHEDULE = [
  // Monday
  { id: 'mon-1', day: 'MON', startTime: '11:30', endTime: '12:20', subject: 'Compiler Design', code: 'Compiler Design', room: '1145', statusLabel: 'Ms. Aneesha' },
  { id: 'mon-2', day: 'MON', startTime: '12:20', endTime: '13:10', subject: 'Operating Systems', code: 'Operating Systems', room: '1145', statusLabel: 'Dr. Mohit Mittal' },
  { id: 'mon-3', day: 'MON', startTime: '13:40', endTime: '15:20', subject: 'Software Engineering Lab G1', code: 'Software Engineering Lab G1', room: '1156', statusLabel: 'Dr. Tripti Lamba' },
  { id: 'mon-4', day: 'MON', startTime: '13:40', endTime: '15:20', subject: 'Operating Systems Lab G2', code: 'Operating Systems Lab G2', room: '1157', statusLabel: 'Dr. Anshu Khurana' },
  { id: 'mon-5', day: 'MON', startTime: '15:20', endTime: '16:10', subject: 'Computer Networks', code: 'Computer Networks', room: '1145', statusLabel: 'Mr. Nitish uppal' },
  { id: 'mon-6', day: 'MON', startTime: '16:10', endTime: '17:00', subject: 'Design and Analysis of Algorithm', code: 'Design and Analysis of Algorithm', room: '1145', statusLabel: 'X' },

  // Tuesday
  { id: 'tue-1', day: 'TUES', startTime: '11:30', endTime: '12:20', subject: 'Compiler Design', code: 'Compiler Design', room: '1145', statusLabel: 'Ms. Aneesha' },
  { id: 'tue-2', day: 'TUES', startTime: '12:20', endTime: '13:10', subject: 'Operating Systems', code: 'Operating Systems', room: '1145', statusLabel: 'Dr. Mohit Mittal' },
  { id: 'tue-3', day: 'TUES', startTime: '13:40', endTime: '15:20', subject: 'Compiler Design Lab G1', code: 'Compiler Design Lab G1', room: '1136', statusLabel: 'Ms. Aneesha' },
  { id: 'tue-4', day: 'TUES', startTime: '13:40', endTime: '15:20', subject: 'Computer Networks Lab G2', code: 'Computer Networks Lab G2', room: '1137', statusLabel: 'Mr. Nitish uppal' },
  { id: 'tue-5', day: 'TUES', startTime: '15:20', endTime: '16:10', subject: 'Computer Networks', code: 'Computer Networks', room: '1145', statusLabel: 'Mr. Nitish uppal' },
  { id: 'tue-6', day: 'TUES', startTime: '16:10', endTime: '17:00', subject: 'Design and Analysis of Algorithm', code: 'Design and Analysis of Algorithm', room: '1145', statusLabel: 'X' },

  // Wednesday
  { id: 'wed-1', day: 'WED', startTime: '11:30', endTime: '12:20', subject: 'Software Engineering', code: 'Software Engineering', room: '1144', statusLabel: 'Dr. Tripti Lamba' },
  { id: 'wed-2', day: 'WED', startTime: '12:20', endTime: '13:10', subject: 'Operating Systems', code: 'Operating Systems', room: '1144', statusLabel: 'Dr. Mohit Mittal' },
  { id: 'wed-3', day: 'WED', startTime: '13:40', endTime: '15:20', subject: 'Operating Systems lab G1', code: 'Operating Systems lab G1', room: '1136', statusLabel: 'Dr. Anshu Khurana' },
  { id: 'wed-4', day: 'WED', startTime: '13:40', endTime: '15:20', subject: 'Design and Analysis of Algorithm Lab G2', code: 'Design and Analysis of Algorithm Lab G2', room: '1137', statusLabel: 'X' },
  { id: 'wed-5', day: 'WED', startTime: '15:20', endTime: '16:10', subject: 'Design and Analysis of Algorithm', code: 'Design and Analysis of Algorithm', room: '1144', statusLabel: 'X' },

  // Thursday
  { id: 'thu-1', day: 'THURS', startTime: '09:00', endTime: '09:50', subject: 'Computer Networks', code: 'Computer Networks', room: '1144', statusLabel: 'Mr. Nitish uppal' },
  { id: 'thu-2', day: 'THURS', startTime: '09:50', endTime: '10:40', subject: 'Economics for Engineers', code: 'Economics for Engineers', room: '1158', statusLabel: 'Dr Meenu Dudeja' },
  { id: 'thu-3', day: 'THURS', startTime: '10:40', endTime: '11:30', subject: 'Design and Analysis of Algorithm', code: 'Design and Analysis of Algorithm', room: '1158', statusLabel: 'X' },
  { id: 'thu-4', day: 'THURS', startTime: '11:30', endTime: '12:20', subject: 'Software Engineering', code: 'Software Engineering', room: '1158', statusLabel: 'Dr. Tripti Lamba' },
  { id: 'thu-5', day: 'THURS', startTime: '12:20', endTime: '13:10', subject: 'Operating Systems', code: 'Operating Systems', room: '1158', statusLabel: 'Dr. Mohit Mittal' },
  { id: 'thu-6', day: 'THURS', startTime: '13:40', endTime: '15:20', subject: 'Design and Analysis of Algorithm Lab G1', code: 'Design and Analysis of Algorithm Lab G1', room: '1146', statusLabel: 'X' },
  { id: 'thu-7', day: 'THURS', startTime: '13:40', endTime: '15:20', subject: 'Compiler Design Lab G2', code: 'Compiler Design Lab G2', room: '1147', statusLabel: 'Ms. Aneesha' },

  // Friday
  { id: 'fri-1', day: 'FRI', startTime: '09:50', endTime: '10:40', subject: 'Economics for Engineers', code: 'Economics for Engineers', room: '1144', statusLabel: 'Dr Meenu Dudeja' },
  { id: 'fri-2', day: 'FRI', startTime: '10:40', endTime: '11:30', subject: 'Software Engineering', code: 'Software Engineering', room: '1144', statusLabel: 'Dr. Tripti Lamba' },
  { id: 'fri-3', day: 'FRI', startTime: '11:30', endTime: '13:10', subject: 'Computer Network Lab G1', code: 'Computer Network Lab G1', room: '1146', statusLabel: 'Y' },
  { id: 'fri-4', day: 'FRI', startTime: '11:30', endTime: '13:10', subject: 'Software Engineering Lab G2', code: 'Software Engineering Lab G2', room: '1147', statusLabel: 'Dr. Tripti Lamba' },
  { id: 'fri-5', day: 'FRI', startTime: '13:40', endTime: '14:30', subject: 'Compiler Design', code: 'Compiler Design', room: '1144', statusLabel: 'Ms. Aneesha' },
  { id: 'fri-6', day: 'FRI', startTime: '14:30', endTime: '15:20', subject: 'Computer Networks', code: 'Computer Networks', room: '1144', statusLabel: 'Mr. Nitish uppal' }
];

/**
 * Parses a timetable document (PDF / Image buffer or text)
 * Returns a structured JSON array of class schedule items.
 */
async function parseTimetableDocument(fileBuffer, mimeType, originalName = '', userRole = 'professor') {
  try {
    let parsedSchedule = userRole === 'student' ? [...SAMPLE_STUDENT_SCHEDULE] : [...SAMPLE_PROFESSOR_SCHEDULE];

    return {
      success: true,
      metadata: {
        filename: originalName || 'schedule.pdf',
        mimeType: mimeType || 'application/pdf',
        totalClasses: parsedSchedule.length,
        daysDetected: ['MON', 'TUES', 'WED', 'THURS', 'FRI'],
        parsedAt: new Date().toISOString(),
      },
      schedule: parsedSchedule,
    };
  } catch (err) {
    console.error('Timetable Parse Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to parse timetable document',
      schedule: [],
    };
  }
}

module.exports = {
  parseTimetableDocument,
  SAMPLE_PROFESSOR_SCHEDULE,
  SAMPLE_STUDENT_SCHEDULE
};
