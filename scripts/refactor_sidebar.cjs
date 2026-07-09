const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(__dirname, '../frontend/src/app/components/DashboardSidebar.tsx');
let code = fs.readFileSync(sidebarPath, 'utf8');

// Import useTheme
if (!code.includes("useTheme")) {
    code = code.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';\nimport { useTheme } from 'next-themes';");
}
if (!code.includes("Moon")) {
    code = code.replace("Newspaper,\n} from 'lucide-react';", "Newspaper,\n  Sun,\n  Moon,\n  Monitor,\n} from 'lucide-react';");
}

// Add theme toggle logic inside DashboardSidebar
const hookInsertion = `
  const { theme, setTheme } = useTheme();
  
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4 text-accent-blue" />;
    if (theme === 'dark') return <Moon className="w-4 h-4 text-accent-blue" />;
    return <Monitor className="w-4 h-4 text-accent-blue" />;
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light Mode';
    if (theme === 'dark') return 'Dark Mode';
    return 'System Theme';
  };
`;

code = code.replace("const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);", "const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);\n" + hookInsertion);

// Footer replacement
const oldFooterRegex = /\{\/\* Bottom Footer Area \*\/\}[^]*?<\/aside>/;
const newFooter = `{/* Bottom Footer Area */}
      <div className={\`p-4 border-t border-border-subtle \${isChatSection ? 'md:hidden group-hover:md:block' : ''}\`}>
        <button 
          onClick={cycleTheme}
          className="w-full bg-surface-elevated hover:bg-bg-hover rounded-xl p-3 border border-border-subtle flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            {getThemeIcon()}
            <span>{getThemeLabel()}</span>
          </div>
        </button>
      </div>
    </aside>`;

code = code.replace(oldFooterRegex, newFooter);

// Refactor classes
code = code.replace(/bg-white/g, 'bg-surface');
code = code.replace(/border-slate-200\/80/g, 'border-border-subtle');
code = code.replace(/border-slate-100/g, 'border-border-subtle');
code = code.replace(/bg-slate-50\/90/g, 'bg-surface-elevated');
code = code.replace(/bg-slate-50/g, 'bg-surface');
code = code.replace(/border-slate-200\/70/g, 'border-border-subtle');
code = code.replace(/border-slate-200/g, 'border-border-subtle');
code = code.replace(/text-slate-900/g, 'text-text-primary');
code = code.replace(/text-slate-500/g, 'text-text-secondary');
code = code.replace(/text-slate-600/g, 'text-text-secondary');
code = code.replace(/text-slate-400/g, 'text-text-secondary/70');
code = code.replace(/text-slate-700/g, 'text-text-primary');
code = code.replace(/hover:bg-slate-50/g, 'hover:bg-surface-elevated');
code = code.replace(/hover:text-slate-900/g, 'hover:text-text-primary');
code = code.replace(/group-hover:text-slate-700/g, 'group-hover:text-text-primary');
code = code.replace(/bg-blue-50\/90/g, 'bg-accent-blue-soft');
code = code.replace(/text-blue-600/g, 'text-accent-blue');
code = code.replace(/bg-blue-50/g, 'bg-accent-blue-soft');
code = code.replace(/border-blue-100/g, 'border-accent-blue-soft');
code = code.replace(/bg-emerald-500/g, 'bg-accent-green');
code = code.replace(/border-white/g, 'border-surface');

fs.writeFileSync(sidebarPath, code);
