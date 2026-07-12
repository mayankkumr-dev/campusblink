/**
 * Single shared attendance calculation utility
 * Used by Professor summary modals, Student dashboard analytics, and Safe-To-Miss calculator
 * Ensure numbers never disagree across modules.
 */

const DEFAULT_THRESHOLD_PERCENT = 75;

/**
 * Calculates attendance percentage given attended and held classes.
 * @param {number} classesAttended
 * @param {number} classesHeld
 * @returns {number} Rounded percentage (to 1 decimal place)
 */
function calculateAttendancePercentage(classesAttended, classesHeld) {
  if (!classesHeld || classesHeld <= 0) return 100.0;
  const raw = (classesAttended / classesHeld) * 100;
  return Number(raw.toFixed(1));
}

/**
 * Filter valid sessions for a student.
 * Excludes voided/cancelled sessions and sessions held before the student enrolled in the section.
 *
 * @param {Array} sessions List of AttendanceSession objects
 * @param {Date|string|null} studentEnrollmentDate Optional date when student enrolled
 * @returns {Array} Filtered list of valid sessions
 */
function filterValidSessionsForStudent(sessions, studentEnrollmentDate = null) {
  if (!Array.isArray(sessions)) return [];

  const enrollmentTimestamp = studentEnrollmentDate
    ? new Date(studentEnrollmentDate).getTime()
    : null;

  return sessions.filter(session => {
    // 1. Exclude voided / cancelled sessions from denominators
    if (session.status === 'voided') {
      return false;
    }

    // 2. Exclude sessions held before mid-semester enrollment
    if (enrollmentTimestamp && session.date) {
      const sessionTime = new Date(session.date).getTime();
      if (sessionTime < enrollmentTimestamp) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes "classes safe to miss" or "classes needed to recover" given current stats and threshold.
 *
 * @param {number} classesAttended Number of present classes
 * @param {number} classesHeld Total valid classes held
 * @param {number} thresholdPercent Configurable threshold (default 75)
 * @returns {Object} Safe-to-miss guidance
 */
function computeSafeToMiss(classesAttended, classesHeld, thresholdPercent = DEFAULT_THRESHOLD_PERCENT) {
  const currentPercentage = calculateAttendancePercentage(classesAttended, classesHeld);
  const t = thresholdPercent / 100;

  if (classesHeld === 0) {
    return {
      status: 'safe',
      classesSafeToMiss: 0,
      classesNeededToRecover: 0,
      message: 'No classes held yet.',
      currentPercentage: 100.0,
      thresholdPercent
    };
  }

  if (currentPercentage >= thresholdPercent) {
    // Solve for max N where: classesAttended / (classesHeld + N) >= t
    // classesAttended >= t * (classesHeld + N)
    // N <= (classesAttended - t * classesHeld) / t
    const safeN = Math.floor((classesAttended - t * classesHeld) / t);
    const classesSafeToMiss = Math.max(0, safeN);
    return {
      status: 'safe',
      classesSafeToMiss,
      classesNeededToRecover: 0,
      message: classesSafeToMiss > 0
        ? `You can miss the next ${classesSafeToMiss} class${classesSafeToMiss === 1 ? '' : 'es'} and stay above ${thresholdPercent}%.`
        : `You are at ${currentPercentage}%. Missing the next class will drop you below ${thresholdPercent}%.`,
      currentPercentage,
      thresholdPercent
    };
  } else {
    // Solve for min N where: (classesAttended + N) / (classesHeld + N) >= t
    // classesAttended + N >= t * classesHeld + t * N
    // N * (1 - t) >= t * classesHeld - classesAttended
    // N >= (t * classesHeld - classesAttended) / (1 - t)
    const neededN = Math.ceil((t * classesHeld - classesAttended) / (1 - t));
    const classesNeededToRecover = Math.max(1, neededN);
    return {
      status: 'recovery',
      classesSafeToMiss: 0,
      classesNeededToRecover,
      message: `You need to attend the next ${classesNeededToRecover} class${classesNeededToRecover === 1 ? '' : 'es'} to recover above ${thresholdPercent}%.`,
      currentPercentage,
      thresholdPercent
    };
  }
}

module.exports = {
  DEFAULT_THRESHOLD_PERCENT,
  calculateAttendancePercentage,
  filterValidSessionsForStudent,
  computeSafeToMiss,
};
