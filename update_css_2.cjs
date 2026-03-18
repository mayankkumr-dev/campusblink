const fs = require('fs');

const themeCss = `@theme {
  --font-sans: 'DM Sans', sans-serif;
  --font-syne: 'Syne', sans-serif;
  
  --color-bg-base: #FAFAF8;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F5F4F0;
  
  --color-accent: #FFD600;
  
  --color-text-primary: #0D0D0D;
  --color-text-secondary: #6B6B6B;
  --color-text-muted: #9B9B9B;
  
  --color-success: #16A34A;
  --color-error: #DC2626;
  --color-warning: #D97706;
}

@layer base {
  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
  }

  html, body, #root {
    min-height: 100%;
  }
  
  body {
    background-color: var(--color-bg-base);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    line-height: 1.6;
    overflow-x: hidden;
  }

  #root {
    min-height: 100dvh;
  }

  img, svg, video, canvas {
    max-width: 100%;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-syne);
    line-height: 1.2;
  }
  
  p, h1, h2, h3, h4, h5, h6, span {
    word-break: break-word;
  }

  /* Keyboard focus rings */
  *:focus-visible {
    outline: 2px solid #FFD600;
    outline-offset: 2px;
  }

  /* Base interactive transitions */
  a, button, input, select, textarea {
    transition: all 0.15s ease;
  }
}

.btn-primary {
  background-color: #0D0D0D;
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  border-radius: 6px;
  padding: 10px 20px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  border: none;
}
.btn-primary:hover {
  background-color: #FFD600;
  color: #0D0D0D;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #0D0D0D;
  border: 1px solid #D0D0D0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14px;
  border-radius: 6px;
  padding: 10px 20px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.btn-secondary:hover {
  background-color: #F5F4F0;
  border-color: #0D0D0D;
}
`;

const tailwindCss = `@import 'tailwindcss' source(none);
@source '../**/*.{js,ts,jsx,tsx}';

@import 'tw-animate-css';

@layer utilities {
  .shadow-soft {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .shadow-medium {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.10);
  }
  .shadow-strong {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  }
}
`;

const indexCss = `@import './fonts.css';
@import './tailwind.css';
@import './theme.css';
`;

fs.writeFileSync('src/styles/theme.css', themeCss);
fs.writeFileSync('src/styles/tailwind.css', tailwindCss);
fs.writeFileSync('src/styles/index.css', indexCss);
