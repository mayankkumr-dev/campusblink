const fs = require('fs');
const path = require('path');
const SCHEDULE_FALLBACK_FILE = path.join(__dirname, 'data/student_schedules.json');
try {
  fs.mkdirSync(path.dirname(SCHEDULE_FALLBACK_FILE), { recursive: true });
  fs.writeFileSync(SCHEDULE_FALLBACK_FILE, JSON.stringify({ test: "data" }, null, 2), 'utf8');
  console.log("Success");
} catch (e) {
  console.error("Error:", e);
}
