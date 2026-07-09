const fs = require('fs');

const themeFile = 'frontend/src/styles/theme.css';
let themeCss = fs.readFileSync(themeFile, 'utf8');

const regexRoot = /:root\s*\{[^}]+\}/;
const newRoot = `:root {
  --bg: #FFFFFF;
  --bg-2: #F8F9FF;
  --bg-3: #EEF1FF;
  --bg-hover: #F0F4FF;

  --text: #0A0F1E;
  --text-2: #64748B;
  --text-3: #94A3B8;
  --text-placeholder: #CBD5E1;
  --text-white: #FFFFFF;

  --accent: #2D4EF5;
  --accent-hover: #1A3CE8;
  --accent-light: #EEF1FF;
  --accent-muted: #BFCBFD;

  --yellow: #EAB308;
  --yellow-hover: #CA8A04;
  --yellow-light: #FEF9C3;

  --border: #E2E8F0;
  --border-2: #CBD5E1;
  --border-accent: #BFCBFD;

  --shadow-sm: 0 1px 3px rgba(10,15,30,0.06);
  --shadow-md: 0 4px 16px rgba(10,15,30,0.08);
  --shadow-lg: 0 8px 32px rgba(10,15,30,0.12);
  --shadow-accent: 0 4px 16px rgba(45,78,245,0.2);

  --success: #10B981;
  --success-light: #D1FAE5;
  --error: #EF4444;
  --error-light: #FEE2E2;
  --warning: #F59E0B;
  --warning-light: #FEF3C7;
  --info: #3B82F6;
  --info-light: #EFF6FF;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
}`;

themeCss = themeCss.replace(regexRoot, newRoot);

const regexTheme = /@theme\s*\{[^}]+\}/;
const newTheme = `@theme {
  --color-accent: #2D4EF5;
  --color-accent-hover: #1A3CE8;
  --color-accent-light: #EEF1FF;
  --color-accent-muted: #BFCBFD;
  --color-accent-dark: #1E3A8A;
  
  --color-brand-bg: #FFFFFF;
  --color-brand-bg2: #F8F9FF;
  --color-brand-bg3: #EEF1FF;
  --color-brand-text: #0A0F1E;
  --color-brand-text2: #64748B;
  --color-brand-text3: #94A3B8;
  --color-brand-border: #E2E8F0;
  --color-brand-border2: #CBD5E1;
  
  --color-rep: #EAB308;
  --color-rep-hover: #CA8A04;
  --color-rep-light: #FEF9C3;
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-syne: 'Plus Jakarta Sans', sans-serif;
}`;

if(themeCss.match(regexTheme)) {
    themeCss = themeCss.replace(regexTheme, newTheme);
} else {
    themeCss += '\n' + newTheme + '\n';
}

fs.writeFileSync(themeFile, themeCss);

