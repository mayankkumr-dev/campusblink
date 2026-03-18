const fs = require('fs');

let content = fs.readFileSync('src/app/components/LoginRegisterPage.tsx', 'utf-8');

// Remove mascot from login page right panel or left background if not loaded
content = content.replace(/<img[^>]+animate-mascot[^>]+>/g, '');

content = content.replace(/shadow-\[0_0_24px_rgba\(255,214,0,0\.4\)\]/g, 'shadow-soft');
content = content.replace(/blur-\[100px\]/g, 'blur-[40px]');
content = content.replace(/rounded-\[30px\]/g, 'rounded-lg');
content = content.replace(/rounded-\[40px\]/g, 'rounded-lg');
content = content.replace(/rounded-\[20px\]/g, 'rounded-lg');
content = content.replace(/rounded-full/g, 'rounded-md'); // Wait, need to ensure no buttons messed up. `ui_refactor` handled most.

fs.writeFileSync('src/app/components/LoginRegisterPage.tsx', content);
