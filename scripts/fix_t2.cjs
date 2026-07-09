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
  'bg-slate-50/70': 'bg-surface-elevated',
  'placeholder-slate-400': 'placeholder:text-text-placeholder',
  'placeholder-slate-500': 'placeholder:text-text-placeholder',
  'focus:border-blue-600': 'focus:border-accent-blue',
  'focus:border-blue-500': 'focus:border-accent-blue',
  'focus:bg-white': 'focus:bg-surface',
  'focus:ring-blue-100': 'focus:ring-accent-blue/20'
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
