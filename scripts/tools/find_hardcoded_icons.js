require('../env-loader');
const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles('frontend/src/app/components');
const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lucideMatch = [...content.matchAll(lucideRegex)];
  if (lucideMatch.length === 0) continue;
  
  const imports = lucideMatch.flatMap(m => m[1].split(',').map(s => s.trim()).filter(s => s));
  
  for (const icon of imports) {
    const iconTagRegex = new RegExp(`<${icon}[^>]+className=["']([^"']+)["'][^>]*>`, 'g');
    let match;
    while ((match = iconTagRegex.exec(content)) !== null) {
      const className = match[1];
      const hasDark = className.includes('dark:text-');
      const tokens = className.split(/\s+/);
      const colorTokens = tokens.filter(t => t.startsWith('text-') && !hasDark);
      
      const hardcoded = colorTokens.filter(t => {
        if (t.includes('slate-')) return false;
        if (t.includes('text-[var')) return false;
        if (t.includes('text-accent')) return false;
        if (t.includes('text-text-')) return false;
        return true;
      });

      if (hardcoded.length > 0) {
        console.log(`${file}: <${icon} className="${className}">`);
      }
    }
  }
}
