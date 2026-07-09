const fs = require('fs');
const path = require('path');

const indexCssPath = path.join(__dirname, '../frontend/src/styles/index.css');
let indexCss = fs.readFileSync(indexCssPath, 'utf8');

const newTheme = `@theme {
  --color-background: var(--bg-background);
  --color-surface: var(--bg-surface);
  --color-surface-elevated: var(--bg-surface-elevated);
  
  --color-border-subtle: var(--border-subtle);
  
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-placeholder: var(--text-placeholder);
  --color-text-inverse: var(--text-inverse);

  --color-accent-blue: var(--accent-blue);
  --color-accent-blue-soft: var(--accent-blue-soft);
  --color-accent-amber: var(--accent-amber);
  --color-accent-amber-soft: var(--accent-amber-soft);
  --color-accent-green: var(--accent-green);
  --color-accent-red: var(--accent-red);
  --color-accent-purple: var(--accent-purple);
  --color-accent-teal: var(--accent-teal);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-full: var(--radius-full);

  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
}`;

indexCss = indexCss.replace(/@theme\s*\{[\s\S]*?\}(?=\n\n@layer base)/, newTheme);

fs.writeFileSync(indexCssPath, indexCss);
