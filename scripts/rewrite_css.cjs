const fs = require('fs');
const path = require('path');

const themeCssPath = path.join(__dirname, '../frontend/src/styles/theme.css');
const indexCssPath = path.join(__dirname, '../frontend/src/styles/index.css');

let themeCss = fs.readFileSync(themeCssPath, 'utf8');

// Replace :root block
const rootBlock = `:root {
  --bg-background: #F9FAFB;
  --bg-surface: #FFFFFF;
  --bg-surface-elevated: #FFFFFF;
  --border-subtle: #E2E8F0;
  --text-primary: #0A0F1E;
  --text-secondary: #64748B;
  --text-placeholder: #CBD5E1;
  --text-inverse: #FFFFFF;

  --accent-blue: #2D4EF5;
  --accent-blue-soft: #EEF1FF;
  --accent-amber: #EAB308;
  --accent-amber-soft: #FEF9C3;
  --accent-green: #10B981;
  --accent-red: #EF4444;
  --accent-purple: #8B5CF6;
  --accent-teal: #14B8A6;

  --border: #E2E8F0;
  --border-2: #CBD5E1;

  --shadow-sm: 0 1px 3px rgba(10,15,30,0.06);
  --shadow-md: 0 4px 16px rgba(10,15,30,0.08);
  --shadow-lg: 0 8px 32px rgba(10,15,30,0.12);

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Legacy aliases to keep old UI somewhat working until fully refactored */
  --bg-primary: var(--bg-background);
  --bg-secondary: var(--bg-surface);
  --bg-tertiary: var(--bg-surface-elevated);
  --text-muted: var(--text-secondary);
  --border-strong: var(--border-2);
  --midnight-blue: var(--accent-blue);
  --midnight-blue-soft: var(--accent-blue-soft);
}`;

const darkBlock = `.dark {
  --bg-background: #101113;
  --bg-surface: #1A1B1E;
  --bg-surface-elevated: #202226;
  --border-subtle: rgba(255,255,255,0.08);
  --text-primary: #F4F5F7;
  --text-secondary: #9BA1AC;
  --text-placeholder: #6B7280;
  --text-inverse: #09090B;

  --accent-blue: #60A5FA;
  --accent-blue-soft: rgba(59,130,246,0.14);
  --accent-amber: #FBBF24;
  --accent-amber-soft: rgba(251,191,36,0.18);
  --accent-green: #34D399;
  --accent-red: #F87171;
  --accent-purple: #A78BFA;
  --accent-teal: #2DD4BF;

  --border: rgba(255,255,255,0.08);
  --border-2: rgba(255,255,255,0.15);

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.6);

  scrollbar-color: #27272A #101113;
}

.dark ::-webkit-scrollbar-track {
  background: var(--bg-background);
}
.dark ::-webkit-scrollbar-thumb {
  background: #1F1F23;
  border-radius: 4px;
}
.dark ::selection {
  background: rgba(59,130,246,0.3);
  color: var(--text-primary);
}`;

themeCss = themeCss.replace(/:root\s*\{[\s\S]*?\}(?=\n\n\[data-theme="dark"\])/, rootBlock);
themeCss = themeCss.replace(/\[data-theme="dark"\]\s*\{[\s\S]*?\}\s*\[data-theme="dark"\]\s*::-webkit-scrollbar-track\s*\{[\s\S]*?\}\s*\[data-theme="dark"\]\s*::-webkit-scrollbar-thumb\s*\{[\s\S]*?\}\s*\[data-theme="dark"\]\s*::selection\s*\{[\s\S]*?\}/, darkBlock);
themeCss = themeCss.replace(/@theme\s*\{[\s\S]*?\}(?=\n\n@layer base)/, '');

fs.writeFileSync(themeCssPath, themeCss);

let indexCss = fs.readFileSync(indexCssPath, 'utf8');

const newTheme = `@theme {
  --color-bg-background: var(--bg-background);
  --color-bg-surface: var(--bg-surface);
  --color-bg-surface-elevated: var(--bg-surface-elevated);
  
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
}

@layer base {
  *, *::before, *::after {
    @media (prefers-reduced-motion: no-preference) {
      transition-property: background-color, border-color, color, fill, stroke, box-shadow;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 200ms;
    }
  }

  body {
    background-color: var(--bg-background);
    color: var(--text-primary);
  }
}`;

indexCss = indexCss.replace(/@theme\s*\{[\s\S]*?\}\s*@layer base\s*\{[\s\S]*?\}/, newTheme);

fs.writeFileSync(indexCssPath, indexCss);
