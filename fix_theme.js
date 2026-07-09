const fs = require('fs');
const path = require('path');

const cssVars = `
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
  /* Scrollbar */
  scrollbar-color: #27272A #09090B;
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: var(--bg);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--bg-4);
    border-radius: 4px;
  }

  /* Selection */
  ::selection {
    background: rgba(45,78,245,0.3);
    color: var(--text);
  }

  /* Navbar blur */
  .navbar {
    background: rgba(9,9,11,0.92);
    backdrop-filter: blur(12px);
  }

  /* Card depth */
  .card {
    background: var(--bg-3);
    border-color: var(--border);
  }
  .card-raised {
    background: var(--bg-4);
  }

  /* Input */
  input, textarea, select {
    background: var(--bg-3);
    border-color: var(--border);
    color: var(--text);
  }

  /* Images softer in dark */
  img:not([data-no-dim]) {
    opacity: 0.92;
  }
  img:hover:not([data-no-dim]) {
    opacity: 1;
  }

  /* Code blocks */
  code, pre {
    background: var(--bg-4);
    border-color: var(--border);
  }

  /* Profile default banner dark */
  .default-banner {
    background: linear-gradient(135deg, #020817 0%, #0F1E5A 50%, #1E3A8A 100%);
  }

  /* Skeleton dark */
  .skeleton {
    background: var(--bg-3);
  }
  .skeleton-shimmer {
    background: linear-gradient(90deg, var(--bg-3) 0%, var(--bg-4) 50%, var(--bg-3) 100%);
  }
}
[data-theme="dark"] .hero {
    background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45,78,245,0.15) 0%, transparent 70%);
}
[data-theme="dark"] .splash {
  background: #09090B;
}
[data-theme="dark"] .bottom-nav {
  background: var(--bg-2);
  border-top: 1px solid var(--border);
}
`;

const cssPath = 'frontend/src/styles/index.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes('data-theme="dark"')) {
    fs.writeFileSync(cssPath, css + '\n' + cssVars);
    console.log("Appended theme CSS.");
  }
} else {
  console.log("CSS file not found at", cssPath);
}
