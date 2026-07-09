const fs = require('fs');
let fileContent = fs.readFileSync('frontend/src/app/components/AdminLayout.tsx', 'utf8');

if (!fileContent.includes('const [isDarkMode, setIsDarkMode]')) {
  // Add state for dark mode
  fileContent = fileContent.replace(
    'export const AdminLayout: React.FC = () => {',
    `export const AdminLayout: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin-dark-mode') === 'true';
    }
    return false;
  });

  React.useEffect(() => {
    localStorage.setItem('admin-dark-mode', isDarkMode.toString());
  }, [isDarkMode]);
`
  );

  // Add the wrapper div that applies dark mode CSS filter
  fileContent = fileContent.replace(
    'return (\n    <div className="flex h-screen bg-[var(--bg-primary)]">',
    `return (
    <div className={\`flex h-screen \${isDarkMode ? 'admin-dark-theme' : 'bg-[var(--bg-primary)]'}\`} style={isDarkMode ? { backgroundColor: '#121212' } : {}}>
      <style>{\`
        .admin-dark-theme {
          background-color: #121212 !important;
          color: var(--bg-primary) !important;
        }
        .admin-dark-theme * {
          border-color: rgba(255,255,255,0.1) !important;
        }
        .admin-dark-theme .bg-white {
          background-color: #1E1E1E !important;
          color: var(--bg-primary) !important;
        }
        .admin-dark-theme .bg-\\[\\var(--bg-primary)\\] {
          background-color: #121212 !important;
        }
        .admin-dark-theme .bg-\\[\\var(--bg-tertiary)\\] {
          background-color: #232323 !important;
        }
        .admin-dark-theme .bg-\\[\\var(--text-primary)\\] {
          background-color: var(--bg-primary) !important;
          color: var(--text-primary) !important;
        }
        .admin-dark-theme .text-\\[\\var(--text-primary)\\] {
          color: var(--bg-primary) !important;
        }
        .admin-dark-theme .text-\\[\\var(--text-secondary)\\] {
          color: #A0A0A0 !important;
        }
        .admin-dark-theme .hover\\:bg-black\\/5:hover {
          background-color: rgba(255,255,255,0.1) !important;
        }
        .admin-dark-theme .hover\\:text-black:hover {
          color: var(--yellow) !important;
        }
      \`}</style>`
  );

  // Find where to put the toggle button - maybe next to "Admin Panel" sidebar title
  fileContent = fileContent.replace(
    '<span className="font-syne text-[15px] font-extrabold text-[var(--text-primary)]">Admin Panel</span>',
    `<span className="font-syne text-[15px] font-extrabold text-[var(--text-primary)]">Admin Panel</span>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="ml-auto p-1.5 rounded-md hover:bg-black/5 text-[var(--text-secondary)]"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>`
  );

  fs.writeFileSync('frontend/src/app/components/AdminLayout.tsx', fileContent);
  console.log('patched admin dark mode');
} else {
  console.log('already patched');
}
