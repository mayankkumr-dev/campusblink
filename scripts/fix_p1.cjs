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

// SearchBar.tsx
const searchBarPath = path.join(__dirname, '../frontend/src/app/components/SearchBar.tsx');
replaceInFile(searchBarPath, {
    'bg-slate-900/15': 'bg-black/60',
    'bg-gray-100': 'bg-surface-elevated', // in case I missed any
    'bg-accent-amber-soft': 'bg-surface-elevated', // wait, if it was amber/50 originally? Let's be careful.
    'focus:ring-orange-500': 'focus:ring-accent-blue',
    'focus:ring-amber-500': 'focus:ring-accent-blue',
    'focus:border-orange-500': 'focus:border-accent-blue',
    'focus:border-amber-500': 'focus:border-accent-blue'
});

// AlertSlidePanel.tsx
const alertSlidePath = path.join(__dirname, '../frontend/src/app/components/AlertSlidePanel.tsx');
replaceInFile(alertSlidePath, {
    'bg-slate-900/20': 'bg-black/60',
    'bg-slate-900/15': 'bg-black/60',
    'bg-surface-elevated': 'bg-surface', // Wait, the header background strips were bg-gray-50 -> bg-background or bg-surface-elevated.
    'bg-background': 'bg-transparent', // Wait, the section labels were background.
});
