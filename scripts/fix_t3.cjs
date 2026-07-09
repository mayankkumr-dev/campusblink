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
  'bg-\\[var\\(--success-light\\)\\]': 'bg-accent-green/15',
  'text-\\[var\\(--success-dark\\)\\]': 'text-accent-green',
  'text-\\[#16A34A\\]': 'text-accent-green',
  'bg-\\[var\\(--error-light\\)\\]': 'bg-accent-red/15',
  'text-\\[var\\(--error-dark\\)\\]': 'text-accent-red',
  'border-\\[var\\(--success-light\\)\\]': 'border-accent-green/20',
  'border-\\[#FEE2E2\\]': 'border-accent-red/20'
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
