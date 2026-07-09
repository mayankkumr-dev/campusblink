const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(key, 'g'), value);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log("Updated", filePath);
    }
}

const dir = path.join(__dirname, '../frontend/src/app/components');

replaceInFile(path.join(dir, 'NoticesPage.tsx'), {
    'bg-slate-50/40': 'bg-background',
    'bg-slate-200': 'bg-border-subtle'
});

replaceInFile(path.join(dir, 'AdminNoticesPage.tsx'), {
    'bg-slate-50/40': 'bg-background',
    'bg-slate-200': 'bg-border-subtle'
});

replaceInFile(path.join(dir, 'AdminNoticeManagementPage.tsx'), {
    'bg-slate-50/40': 'bg-background',
    'bg-slate-200': 'bg-border-subtle'
});
