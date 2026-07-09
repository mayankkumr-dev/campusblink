const fs = require('fs');
let content = fs.readFileSync('frontend/src/styles/theme.css', 'utf8');

content = content.replace(/background-color: var\(--color-bg-base\);/g, 'background-color: var(--bg);');
content = content.replace(/color: var\(--color-text-primary\);/g, 'color: var(--text);');

fs.writeFileSync('frontend/src/styles/theme.css', content);
