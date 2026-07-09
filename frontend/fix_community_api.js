import fs from 'fs';
const path = 'src/api/community.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the deep relation with a flat column query for 'college'
content = content.replace(/college:colleges\s*\(\s*name,\s*short_name\s*\)/g, 'college');

fs.writeFileSync(path, content);
