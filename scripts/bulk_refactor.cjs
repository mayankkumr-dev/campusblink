const fs = require('fs');
const path = require('path');

const replacements = {
  // Backgrounds
  'bg-white': 'bg-surface',
  'bg-slate-50/90': 'bg-surface-elevated',
  'bg-slate-50/50': 'bg-background',
  'bg-slate-50': 'bg-surface',
  'bg-gray-50': 'bg-background',
  'bg-gray-100': 'bg-surface-elevated',
  
  // Borders
  'border-slate-200/80': 'border-border-subtle',
  'border-slate-200/70': 'border-border-subtle',
  'border-slate-200/60': 'border-border-subtle',
  'border-slate-200/50': 'border-border-subtle',
  'border-slate-200': 'border-border-subtle',
  'border-slate-100': 'border-border-subtle',
  'border-gray-200': 'border-border-subtle',
  'border-gray-100': 'border-border-subtle',
  'border-white': 'border-surface',
  
  // Texts
  'text-slate-900': 'text-text-primary',
  'text-gray-900': 'text-text-primary',
  'text-slate-800': 'text-text-primary',
  'text-gray-800': 'text-text-primary',
  'text-slate-700': 'text-text-primary',
  'text-slate-600': 'text-text-secondary',
  'text-slate-500': 'text-text-secondary',
  'text-gray-500': 'text-text-secondary',
  'text-slate-400': 'text-text-secondary/70',
  'text-gray-400': 'text-text-secondary/70',
  'text-slate-300': 'text-text-placeholder',
  'text-gray-300': 'text-text-placeholder',

  // Hovers
  'hover:bg-slate-50': 'hover:bg-surface-elevated',
  'hover:bg-gray-50': 'hover:bg-surface-elevated',
  'hover:text-slate-900': 'hover:text-text-primary',
  'hover:text-gray-900': 'hover:text-text-primary',
  'group-hover:text-slate-700': 'group-hover:text-text-primary',

  // Accents - Blue
  'bg-blue-50/90': 'bg-accent-blue-soft',
  'bg-blue-50': 'bg-accent-blue-soft',
  'bg-blue-100': 'bg-accent-blue-soft',
  'text-blue-600': 'text-accent-blue',
  'text-blue-500': 'text-accent-blue',
  'border-blue-100': 'border-accent-blue-soft',
  'border-blue-200': 'border-accent-blue-soft',
  'border-blue-500': 'border-accent-blue',
  
  // Accents - Green
  'bg-emerald-500': 'bg-accent-green',
  'bg-green-500': 'bg-accent-green',
  'text-emerald-600': 'text-accent-green',
  'text-emerald-500': 'text-accent-green',
  'text-green-600': 'text-accent-green',
  'text-green-500': 'text-accent-green',
  'bg-emerald-50': 'bg-accent-green/15',
  'bg-green-50': 'bg-accent-green/15',
  'bg-emerald-100': 'bg-accent-green/20',

  // Accents - Amber/Yellow
  'bg-amber-50': 'bg-accent-amber-soft',
  'bg-yellow-50': 'bg-accent-amber-soft',
  'text-amber-500': 'text-accent-amber',
  'text-amber-600': 'text-accent-amber',
  'text-yellow-600': 'text-accent-amber',
  'text-yellow-500': 'text-accent-amber',
  'bg-yellow-100': 'bg-accent-amber-soft',
  'bg-amber-100': 'bg-accent-amber-soft',
  'border-amber-200': 'border-accent-amber-soft',
  
  // Accents - Purple
  'bg-purple-50': 'bg-accent-purple/15',
  'text-purple-600': 'text-accent-purple',
  'text-purple-500': 'text-accent-purple',
  'bg-fuchsia-50': 'bg-accent-purple/15',
  'text-fuchsia-600': 'text-accent-purple',
  
  // Accents - Teal/Cyan
  'bg-teal-50': 'bg-accent-teal/15',
  'text-teal-600': 'text-accent-teal',
  'text-teal-500': 'text-accent-teal',
  'bg-cyan-50': 'bg-accent-teal/15',
  
  // Accents - Red/Rose
  'bg-red-50': 'bg-accent-red/15',
  'bg-rose-50': 'bg-accent-red/15',
  'text-red-600': 'text-accent-red',
  'text-red-500': 'text-accent-red',
  'text-rose-600': 'text-accent-red',
  'text-rose-500': 'text-accent-red',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, '../frontend/src/app/components');

walkDir(targetDir, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [key, value] of Object.entries(replacements)) {
      // Create a regex that matches the exact class string, bounded by spaces, quotes or backticks
      // Because classes might have / in them (like bg-slate-50/50), we have to escape them.
      const escapedKey = key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
      const regex = new RegExp("(?<=['\"`\\s])" + escapedKey + "(?=['\"`\\s])", 'g');
      content = content.replace(regex, value);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  }
});
