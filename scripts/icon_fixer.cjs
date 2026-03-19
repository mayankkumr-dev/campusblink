const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('dist')) return;
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Replace pills
  content = content.replace(/\brounded-full\b/g, (match, offset) => {
    let ctxSearch = content.substring(Math.max(0, offset - 50), Math.min(content.length, offset + 50));
    if (/w-\d+\s+h-\d+/.test(ctxSearch) || /avatar/i.test(ctxSearch) || /image/i.test(ctxSearch) || /img/.test(ctxSearch) || /rounded-full\s+w-\d+/.test(ctxSearch) || /w-\d+\s+rounded-full/.test(ctxSearch)) {
      return match;
    }
    return 'rounded-md';
  });

  // Borders
  content = content.replace(/border-\[.*?rgba.*?\]/g, 'border-[#E8E8E8]');
  content = content.replace(/\bborder-yellow-400\b/g, 'border-[#FFD600]');

  // Colors
  content = content.replace(/\bbg-gradient-to-[a-z]+(\s+from-[a-z0-9-\[\]]+)?(\s+via-[a-z0-9-\[\]]+)?(\s+to-[a-z0-9-\[\]]+)?/g, 'bg-[#FFFFFF]');

  // Diagonals clips
  content = content.replace(/clip-path:[^"]+;/gi, '');
  content = content.replace(/style=\{\{\s*clipPath:[^}]+\}\}/g, '');

  if (original !== content) {
    fs.writeFileSync(filePath, content);
  }
}

walkDir('./src', processFile);
