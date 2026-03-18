const fs = require('fs');

let content = fs.readFileSync('src/app/components/ui/dialog.tsx', 'utf-8');
content = content.replace(/bg-black\/50/, 'bg-black/40');
content = content.replace(/shadow-md/, 'shadow-strong');
content = content.replace(/rounded-lg/, 'rounded-[10px]');
fs.writeFileSync('src/app/components/ui/dialog.tsx', content);

let alertContent = fs.readFileSync('src/app/components/ui/alert-dialog.tsx', 'utf-8');
alertContent = alertContent.replace(/bg-black\/50/, 'bg-black/40');
alertContent = alertContent.replace(/shadow-md/, 'shadow-strong');
alertContent = alertContent.replace(/rounded-lg/, 'rounded-[10px]');
fs.writeFileSync('src/app/components/ui/alert-dialog.tsx', alertContent);

