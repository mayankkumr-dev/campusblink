const fs = require('fs');

let theme = fs.readFileSync('src/styles/theme.css', 'utf-8');
theme = theme.replace(/\.btn-primary \{([^}]+)border-radius: 6px;/g, '.btn-primary {$1border-radius: 100px;');
theme = theme.replace(/\.btn-secondary \{([^}]+)border-radius: 6px;/g, '.btn-secondary {$1border-radius: 100px;');
fs.writeFileSync('src/styles/theme.css', theme);
