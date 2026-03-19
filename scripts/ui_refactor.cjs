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
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.css')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // CSS Fixes
  if (filePath.endsWith('.css')) {
     content = content.replace(/box-shadow:.+?rgba\(255,\s*214,\s*0.+?;/g, '/* removed yellow glow */');
     content = content.replace(/box-shadow:.+?rgba\(196,\s*129,\s*122.+?;/g, '/* removed pink glow */');
     content = content.replace(/border-radius:\s*100px;/g, 'border-radius: 6px;');
     content = content.replace(/border-radius:\s*24px;/g, 'border-radius: 8px;');
     content = content.replace(/border-radius:\s*20px;/g, 'border-radius: 8px;');
     fs.writeFileSync(filePath, content);
     return;
  }

  // General Tailwind utility cleanups Let's use strict regex.

  // Pill buttons/shapes -> normal radius where reasonable
  // We'll just replace 'rounded-full' when near py- px- or w- h- if it's for button shape.
  // Actually, replacing all rounded-[large] is safer.
  content = content.replace(/\brounded-3xl\b/g, 'rounded-lg');
  content = content.replace(/\brounded-2xl\b/g, 'rounded-lg');
  content = content.replace(/\brounded-xl\b/g, 'rounded-lg');

  // Replace shadow glows
  content = content.replace(/\bglow-yellow\b/g, '');
  content = content.replace(/\bglow-pink\b/g, '');
  content = content.replace(/\bglow-subtle\b/g, '');
  content = content.replace(/\bshadow-yellow\/[0-9a-zA-Z-]+\b/g, '');

  // Shadows
  content = content.replace(/\bshadow-xl\b/g, 'shadow-md');
  content = content.replace(/\bshadow-lg\b/g, 'shadow-md');
  content = content.replace(/\bshadow-2xl\b/g, 'shadow-md');

  // Remove blurs and noise
  content = content.replace(/\bbg-noise\b/g, '');
  content = content.replace(/\bbackdrop-blur(?:-[a-z]+)?\b/g, '');

  if (original !== content) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

walkDir('./src', processFile);
