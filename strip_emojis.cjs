const fs = require('fs');

let content = fs.readFileSync('src/app/components/LandingPage.tsx', 'utf-8');
content = content.replace(/🚀 /g, '');
content = content.replace(/🔒 /g, '');
fs.writeFileSync('src/app/components/LandingPage.tsx', content);

let student = fs.readFileSync('src/app/components/StudentDashboard.tsx', 'utf-8');
student = student.replace(/👋/g, '');
fs.writeFileSync('src/app/components/StudentDashboard.tsx', student);

