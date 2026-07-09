const fs = require('fs');
let content = fs.readFileSync('frontend/src/app/components/ProfessorLayout.tsx', 'utf-8');
content = content.replace("const profile = useAuthStore((state) => state.profile);", "");
fs.writeFileSync('frontend/src/app/components/ProfessorLayout.tsx', content);
