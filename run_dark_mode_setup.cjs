const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, 'frontend');
const SRC_DIR = path.join(FRONTEND_DIR, 'src');

// Utility to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// STEP 1 & 7 & 8: Update CSS
const indexCssPath = path.join(SRC_DIR, 'styles', 'index.css');
let indexCss = fs.existsSync(indexCssPath) ? fs.readFileSync(indexCssPath, 'utf8') : '';

const darkCssVariables = `
/* --- DARK MODE VARIABLES --- */
:root {
  --bg: #FFFFFF;
  --bg-2: #F8F9FF;
  --bg-3: #EEF1FF;
  --bg-4: #F1F5F9;
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
  --accent-border: #BFCBFD;

  --yellow: #EAB308;
  --yellow-hover: #CA8A04;
  --yellow-light: #FEF9C3;

  --border: #E2E8F0;
  --border-2: #CBD5E1;

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
}

[data-theme="dark"] {
  --bg: #09090B;
  --bg-2: #111113;
  --bg-3: #18181B;
  --bg-4: #1F1F23;
  --bg-hover: #27272A;

  --text: #FAFAFA;
  --text-2: #A1A1AA;
  --text-3: #71717A;
  --text-placeholder: #52525B;
  --text-white: #FFFFFF;

  --accent: #2D4EF5;
  --accent-hover: #4B63F7;
  --accent-light: rgba(45,78,245,0.15);
  --accent-muted: rgba(45,78,245,0.25);
  --accent-border: rgba(45,78,245,0.35);

  --yellow: #EAB308;
  --yellow-hover: #FACC15;
  --yellow-light: rgba(234,179,8,0.15);

  --border: rgba(255,255,255,0.08);
  --border-2: rgba(255,255,255,0.12);

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.6);
  --shadow-accent: 0 4px 16px rgba(45,78,245,0.3);

  --success: #10B981;
  --success-light: rgba(16,185,129,0.15);
  --error: #EF4444;
  --error-light: rgba(239,68,68,0.15);
  --warning: #F59E0B;
  --warning-light: rgba(245,158,11,0.15);
  --info: #3B82F6;
  --info-light: rgba(59,130,246,0.15);
}

body {
  background: var(--bg);
  color: var(--text);
  transition: background 0.2s ease, color 0.2s ease;
}

[data-theme="dark"] {
  scrollbar-color: #27272A #09090B;
}
[data-theme="dark"] ::-webkit-scrollbar {
  width: 8px;
}
[data-theme="dark"] ::-webkit-scrollbar-track {
  background: var(--bg);
}
[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: var(--bg-4);
  border-radius: 4px;
}
[data-theme="dark"] ::selection {
  background: rgba(45,78,245,0.3);
  color: var(--text);
}
[data-theme="dark"] .navbar {
  background: rgba(9,9,11,0.92);
  backdrop-filter: blur(12px);
}
[data-theme="dark"] .card {
  background: var(--bg-3);
  border-color: var(--border);
}
[data-theme="dark"] .card-raised {
  background: var(--bg-4);
}
[data-theme="dark"] input, 
[data-theme="dark"] textarea, 
[data-theme="dark"] select {
  background: var(--bg-3);
  border-color: var(--border);
  color: var(--text);
}
[data-theme="dark"] img:not([data-no-dim]) {
  opacity: 0.92;
}
[data-theme="dark"] img:hover:not([data-no-dim]) {
  opacity: 1;
}
[data-theme="dark"] code, 
[data-theme="dark"] pre {
  background: var(--bg-4);
  border-color: var(--border);
}
[data-theme="dark"] .default-banner {
  background: linear-gradient(135deg, #020817 0%, #0F1E5A 50%, #1E3A8A 100%);
}
[data-theme="dark"] .skeleton {
  background: var(--bg-3);
}
[data-theme="dark"] .skeleton-shimmer {
  background: linear-gradient(90deg, var(--bg-3) 0%, var(--bg-4) 50%, var(--bg-3) 100%);
}
[data-theme="dark"] .announcement-info { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }
[data-theme="dark"] .announcement-warning { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); }
[data-theme="dark"] .announcement-success { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }
[data-theme="dark"] .announcement-urgent { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
[data-theme="dark"] .post-card:hover { background: var(--bg-2); }
[data-theme="dark"] .bubble-received { background: var(--bg-3); color: var(--text); }
[data-theme="dark"] .bubble-sent { background: var(--accent); color: white; }
[data-theme="dark"] .table-row:hover { background: var(--bg-2); }
[data-theme="dark"] .table-row-selected { background: var(--accent-light); }
[data-theme="dark"] .dropdown { background: var(--bg-3); border-color: var(--border-2); box-shadow: var(--shadow-lg); }
[data-theme="dark"] .dropdown-item:hover { background: var(--bg-4); }
[data-theme="dark"] .modal { background: var(--bg-3); border-color: var(--border-2); }
[data-theme="dark"] .modal-footer { background: var(--bg-4); }
[data-theme="dark"] .hero { background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45,78,245,0.15) 0%, transparent 70%); }
[data-theme="dark"] .splash { background: #09090B; }
[data-theme="dark"] .bottom-nav { background: var(--bg-2); border-top: 1px solid var(--border); }
`;
if (!indexCss.includes('[data-theme="dark"]')) {
  fs.appendFileSync(indexCssPath, '\n' + darkCssVariables);
  console.log('✅ Added CSS variables and dark styles to index.css');
}

// STEP 2: Theme Store
const storeDir = path.join(SRC_DIR, 'store');
ensureDir(storeDir);
const themeStorePath = path.join(storeDir, 'themeStore.js');
const themeStoreContent = `import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'system',
      isDark: false,

      initTheme: () => {
        const saved = get().theme
        let isDark = false

        if (saved === 'dark') {
          isDark = true
        } else if (saved === 'light') {
          isDark = false
        } else {
          isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        }

        set({ isDark })
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      },

      setTheme: (theme) => {
        let isDark = false

        if (theme === 'dark') {
          isDark = true
        } else if (theme === 'light') {
          isDark = false
        } else {
          isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        }

        set({ theme, isDark })
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      },

      toggleTheme: () => {
        const { isDark } = get()
        const newTheme = isDark ? 'light' : 'dark'
        get().setTheme(newTheme)
      }
    }),
    {
      name: 'campus-blink-theme',
      partialize: (state) => ({ theme: state.theme })
    }
  )
)
`;
fs.writeFileSync(themeStorePath, themeStoreContent);
console.log('✅ Created themeStore.js');

// STEP 4 & 5: Components
const uiDir = path.join(SRC_DIR, 'app', 'components', 'ui');
ensureDir(uiDir);

const logoContent = `import React from 'react';
import { useThemeStore } from '../../../store/themeStore';

export function Logo({ height = 40, className = '' }) {
  const isDark = useThemeStore(s => s.isDark)
  const logoSrc = isDark ? '/logo2/white_transparent.png' : '/logo/logo_with_text_transparent.png'

  return (
    <img
      src={logoSrc}
      alt="Campus Blink"
      height={height}
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain',
        transition: 'opacity 0.2s ease'
      }}
      className={className}
    />
  )
}

export function LogoIcon({ height = 36, className = '' }) {
  const isDark = useThemeStore(s => s.isDark)
  const logoSrc = isDark ? '/logo2/white_transparent.png' : '/logo/only_logo_transparent.png'

  return (
    <img
      src={logoSrc}
      alt="Campus Blink"
      height={height}
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain'
      }}
      className={className}
    />
  )
}
`;
fs.writeFileSync(path.join(uiDir, 'Logo.tsx'), logoContent);

const themeToggleContent = `import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '../../../store/themeStore';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--border)',
        background: 'var(--bg-3)',
        color: 'var(--text-2)',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export function ThemeSelector() {
  const { theme, setTheme } = useThemeStore()
  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ]

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '4px',
      background: 'var(--bg-3)', borderRadius: 'var(--radius-lg, 12px)',
      border: '1px solid var(--border)'
    }}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--radius-md, 8px)',
            border: 'none',
            background: theme === value ? 'var(--bg)' : 'transparent',
            color: theme === value ? 'var(--accent)' : 'var(--text-2)',
            fontWeight: theme === value ? 600 : 400, fontSize: 13,
            cursor: 'pointer',
            boxShadow: theme === value ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  )
}
`;
fs.writeFileSync(path.join(uiDir, 'ThemeToggle.tsx'), themeToggleContent);
console.log('✅ Created UI components (Logo.tsx, ThemeToggle.tsx)');

