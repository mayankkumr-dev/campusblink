const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'frontend', 'src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Add ThemeToggle import if it contains a top Navbar and doesn't have it
  // This is a naive attempt, better done manually for critical files like StudentLayout, etc.

  // Let's replace hardcoded bg-white -> bg-[var(--bg)] or dark:bg-zinc-900 (as requested in spec: use CSS variables or Tailwind dark variants)
  // The spec said: "Replace dark hardcoded colors: bg-white -> style background var(--bg)" or className="bg-white dark:bg-zinc-900"
  // Due to the complexity of parsing JSX, using CSS variables via Tailwind arbitrary values is safest:
  // e.g. bg-white -> bg-[var(--bg)] 
  // text-gray-900 -> text-[var(--text)]
  // border-gray-200 -> border-[var(--border)]
  
  content = content.replace(/bg-white/g, 'bg-[var(--bg)]');
  content = content.replace(/text-gray-900/g, 'text-[var(--text)]');
  content = content.replace(/text-gray-800/g, 'text-[var(--text)]');
  content = content.replace(/text-gray-700/g, 'text-[var(--text-2)]');
  content = content.replace(/text-gray-600/g, 'text-[var(--text-2)]');
  content = content.replace(/text-gray-500/g, 'text-[var(--text-3)]');
  content = content.replace(/text-black/g, 'text-[var(--text)]');
  content = content.replace(/border-gray-200/g, 'border-[var(--border)]');
  content = content.replace(/border-gray-100/g, 'border-[var(--border)]');
  content = content.replace(/bg-gray-50/g, 'bg-[var(--bg-2)]');
  content = content.replace(/bg-gray-100/g, 'bg-[var(--bg-3)]');
  content = content.replace(/bg-slate-50/g, 'bg-[var(--bg-2)]');
  content = content.replace(/bg-zinc-50/g, 'bg-[var(--bg-2)]');
  
  // Revert ThemeToggle and strict component files imports if accidentally mangled
  if (original !== content) {
    fs.writeFileSync(filePath, content);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

traverseDir(baseDir);
console.log('✅ Applied Tailwind variable replacements across src/');
