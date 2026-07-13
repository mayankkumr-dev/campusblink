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

let count = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lucideMatch = [...content.matchAll(lucideRegex)];
  if (lucideMatch.length === 0) continue;
  
  const imports = lucideMatch.flatMap(m => m[1].split(',').map(s => s.trim()).filter(s => s));
  
  // Find components in the file that match these imports
  for (const icon of imports) {
    const iconTagRegex = new RegExp(`<${icon}[^>]+className=["']([^"']+)["'][^>]*>`, 'g');
    let match;
    while ((match = iconTagRegex.exec(content)) !== null) {
      const className = match[1];
      // Check if it has a text color but no dark text color
      if (className.includes('text-') && !className.includes('dark:text-')) {
        console.log(`${file}: <${icon} className="${className}">`);
        count++;
      }
    }
  }
}
console.log(`Total missing: ${count}`);
