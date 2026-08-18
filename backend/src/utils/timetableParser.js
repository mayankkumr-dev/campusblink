/**
 * timetableParser.js
 * Intelligent Document & Tabular Timetable Extractor using Google Gemini Vision
 * Extracts Timeslots, Days, Subjects, Rooms, and Batches from uploaded PDF or Image files.
 */
const { GoogleGenAI } = require('@google/genai');

// We still keep the samples as a fallback in case the API key is missing or the AI fails
const SAMPLE_PROFESSOR_SCHEDULE = [
  { id: 'mon-1', day: 'MON', startTime: '09:00', endTime: '09:50', subject: 'HVE', code: 'HVE', room: '346', batch: 'M', statusLabel: 'Lecture' },
  { id: 'mon-2', day: 'MON', startTime: '09:50', endTime: '10:40', subject: 'CS', code: 'CS', room: '346', batch: 'C', statusLabel: 'Lecture' },
  { id: 'wed-1', day: 'WED', startTime: '09:50', endTime: '10:40', subject: 'TW', code: 'TW', room: '346', batch: '4I789', statusLabel: 'Tutorial' }
];

const SAMPLE_STUDENT_SCHEDULE = [
  { id: 'mon-1', day: 'MON', startTime: '11:30', endTime: '12:20', subject: 'Compiler Design', code: 'Compiler Design', room: '1145', statusLabel: 'Ms. Aneesha' },
  { id: 'mon-2', day: 'MON', startTime: '12:20', endTime: '13:10', subject: 'Operating Systems', code: 'Operating Systems', room: '1145', statusLabel: 'Dr. Mohit Mittal' }
];

/**
 * Validates and cleans the AI parsed JSON to ensure it matches the schema.
 */
function sanitizeScheduleJSON(rawArray, userRole) {
  if (!Array.isArray(rawArray)) return [];
  
  return rawArray.map((item, index) => {
    // Generate an ID if missing
    const day = String(item.day || 'MON').toUpperCase().substring(0, 5);
    const id = item.id || `${day.toLowerCase()}-${index + 1}-${Date.now()}`;
    
    // Normalize times
    let startTime = String(item.startTime || '00:00');
    let endTime = String(item.endTime || '00:00');
    // Ensure HH:MM format
    if (!startTime.includes(':')) startTime += ':00';
    if (!endTime.includes(':')) endTime += ':00';

    return {
      id,
      day,
      startTime,
      endTime,
      subject: String(item.subject || 'Unknown Subject'),
      code: String(item.code || item.subject || 'N/A'),
      room: String(item.room || 'TBD'),
      batch: item.batch ? String(item.batch) : null,
      statusLabel: String(item.statusLabel || (userRole === 'student' ? 'Faculty' : 'Class')),
    };
  });
}

/**
 * Parses a timetable document (PDF / Image buffer) using Google Gemini Vision
 * Returns a structured JSON array of class schedule items.
 */
async function parseTimetableDocument(fileBuffer, mimeType, originalName = '', userRole = 'professor') {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in environment. Falling back to sample schedule.');
      const fallback = userRole === 'student' ? SAMPLE_STUDENT_SCHEDULE : SAMPLE_PROFESSOR_SCHEDULE;
      return {
        success: true,
        metadata: { filename: originalName, mimeType, totalClasses: fallback.length, parsedAt: new Date().toISOString(), note: 'Fallback mock data' },
        schedule: fallback,
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    // Prepare prompt
    const prompt = `You are an expert OCR and schedule extraction assistant. 
Extract the class schedule from this timetable image/document. 
Return ONLY a raw JSON array. Do not include markdown formatting like \`\`\`json.
The JSON array must contain objects with these exact keys:
- "day": string (e.g. "MON", "TUES", "WED", "THURS", "FRI", "SAT", "SUN")
- "startTime": string (e.g. "09:00" in 24-hour HH:MM format)
- "endTime": string (e.g. "09:50" in 24-hour HH:MM format)
- "subject": string (Name of the subject/class)
- "code": string (Course code or short name, same as subject if unknown)
- "room": string (Room number or location)
- "statusLabel": string (For professors: "Lecture", "Tutorial", "Lab", "Mentoring", etc. For students: Professor name or type)
Optional key:
- "batch": string (Batch group, e.g. "M", "C", "G1", etc.)

This is a ${userRole} schedule. Ensure the extracted information makes sense for this role.`;

    // Prepare inline data for Gemini
    const filePart = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
      }
    };

    console.log(`[parseTimetableDocument] Sending ${mimeType} to Gemini...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, filePart],
      config: {
        temperature: 0.1, // Low temperature for factual extraction
      }
    });

    let responseText = response.text || '';
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let rawJson = [];
    try {
      rawJson = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini output as JSON:', responseText);
      throw new Error('AI returned invalid JSON format');
    }

    const parsedSchedule = sanitizeScheduleJSON(rawJson, userRole);

    return {
      success: true,
      metadata: {
        filename: originalName || 'schedule.file',
        mimeType: mimeType || 'application/unknown',
        totalClasses: parsedSchedule.length,
        daysDetected: [...new Set(parsedSchedule.map(s => s.day))],
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
