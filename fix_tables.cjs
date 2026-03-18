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
  if (!filePath.endsWith('.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Table header background / font
  content = content.replace(/<thead[^>]*>/g, '<thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">');
  // Add styling to all ths if they don't have it
  content = content.replace(/<th\b/g, '<th className="px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]" ');

  // Table rows hover styling
  content = content.replace(/<tr className="([^"]*)"/g, (match, classes) => {
    let newClass = classes.replace(/hover:bg-\[?[a-zA-Z0-9#]+\]?(\/[0-9]+)?/g, 'hover:bg-[#FAFAF8] transition-colors duration-150');
    // Ensure height
    if (!newClass.includes('h-[')) newClass += ' min-h-[52px] border-b border-[#F0F0F0] text-[14px]';
    return \`<tr className="\${newClass}"\`;
  });

  // td
  content = content.replace(/<td className="([^"]*)"/g, (match, classes) => {
    let newClass = classes + ' px-4 py-2 align-middle text-[#0D0D0D]';
    return \`<td className="\${newClass}"\`;
  });

  if (original !== content) {
    fs.writeFileSync(filePath, content);
  }
}

walkDir('./src/app/components', processFile);
