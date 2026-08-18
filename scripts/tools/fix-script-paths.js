const fs = require('fs');
const path = require('path');

const dirs = [
  path.resolve(__dirname, '../tests'),
  path.resolve(__dirname, '../debug'),
  path.resolve(__dirname, '../tools'),
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((file) => {
    if (!file.endsWith('.js') && !file.endsWith('.cjs')) return;
    if (file === 'fix-script-paths.js') return;
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove existing env-loader / dotenv occurrences
    content = content.replace(/require\(['"]\.\.\/env-loader['"]\);?\n?/g, '');
    content = content.replace(/require\(['"]dotenv['"]\)\.config\([^)]*\);?\n?/g, '');

    // Prepend require('../env-loader'); at the top
    content = "require('../env-loader');\n" + content;

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Prepended env-loader to:', file);
  });
});
