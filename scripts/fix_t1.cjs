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

// SearchBar.tsx
replaceInFile(path.join(dir, 'SearchBar.tsx'), {
    'bg-slate-900/15': 'bg-black/60',
    'bg-gray-100': 'bg-surface-elevated',
    'bg-accent-amber-soft': 'bg-surface-elevated', 
    'focus:ring-orange-500': 'focus:ring-accent-blue',
    'focus:ring-amber-500': 'focus:ring-accent-blue',
    'focus:border-orange-500': 'focus:border-accent-blue',
    'focus:border-amber-500': 'focus:border-accent-blue'
});

// CanteenMenuPage.tsx
replaceInFile(path.join(dir, 'CanteenMenuPage.tsx'), {
    'bg-slate-900/30': 'bg-black/60',
    'bg-slate-900/40': 'bg-black/60',
    'bg-white/95': 'bg-surface',
    'hover:bg-slate-100': 'hover:bg-surface-elevated'
});

// StudentChatPage.tsx & MarketplaceMessagesPage.tsx
replaceInFile(path.join(dir, 'StudentChatPage.tsx'), {
    'bg-white/60': 'bg-surface',
    'bg-white/80': 'bg-surface',
    'bg-white/90': 'bg-surface',
    'bg-white/95': 'bg-surface',
    'bg-slate-900/10': 'bg-transparent',
    'bg-slate-900/20': 'bg-black/60',
    'bg-slate-900/30': 'bg-black/60',
    'backdrop-blur-sm': '', // remove blur if it was on a light wash
    'backdrop-blur-md': ''
});
replaceInFile(path.join(dir, 'MarketplaceMessagesPage.tsx'), {
    'bg-white/60': 'bg-surface',
    'bg-white/80': 'bg-surface',
    'bg-white/90': 'bg-surface',
    'bg-white/95': 'bg-surface',
    'bg-slate-900/10': 'bg-transparent',
    'bg-slate-900/20': 'bg-black/60',
    'bg-slate-900/30': 'bg-black/60',
    'backdrop-blur-sm': '',
    'backdrop-blur-md': ''
});
