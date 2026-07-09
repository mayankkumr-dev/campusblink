const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, '../frontend/src/app/components');

const replacements = {
  'text-emerald-700': 'text-accent-green',
  'text-amber-700': 'text-accent-amber',
  'text-rose-700': 'text-accent-red',
  'text-emerald-800': 'text-accent-green',
  'text-amber-800': 'text-accent-amber',
  'text-rose-800': 'text-accent-red',
  'border-emerald-200/60': 'border-accent-green/20',
  'border-amber-200/60': 'border-accent-amber-soft/20',
  'border-rose-200/60': 'border-accent-red/20',
  'bg-slate-100': 'bg-surface-elevated', // in getStatusBadgeClass fallback
};

walkDir(targetDir, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key, 'g'), value);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  }
});
