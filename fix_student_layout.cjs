const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'app', 'components', 'StudentLayout.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes("import { AlertSlidePanel }")) {
  content = content.replace("import { SearchSlidePanel } from './SearchBar';", "import { SearchSlidePanel } from './SearchBar';\nimport { AlertSlidePanel } from './AlertSlidePanel';");
}

if (!content.includes('const [notificationPanelOpen, setNotificationPanelOpen]')) {
  content = content.replace('const [searchPanelOpen, setSearchPanelOpen] = useState(false);', 'const [searchPanelOpen, setSearchPanelOpen] = useState(false);\n  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);');
}

if (!content.includes('const isAlertItem = item.feature === \\\'alerts\\\'')) {
  content = content.replace(/const isSearchItem = item\.feature === 'search';/g, "const isSearchItem = item.feature === 'search';\n            const isAlertItem = item.feature === 'alerts';");
  content = content.replace(/const isActive = isSearchItem \? searchPanelOpen : location\.pathname\.startsWith\(item\.path\);/g, "const isActive = isSearchItem ? searchPanelOpen : isAlertItem ? notificationPanelOpen : location.pathname.startsWith(item.path);");
  content = content.replace(/if \(isSearchItem\)/g, "if (isSearchItem || isAlertItem)");
  content = content.replace(/onClick=\{\(\) => \{ setMobileMenuOpen\(false\); setSearchPanelOpen\(true\); \}\}/g, "onClick={() => { setMobileMenuOpen(false); if (isSearchItem) setSearchPanelOpen(true); if (isAlertItem) setNotificationPanelOpen(true); }}");
}

if (!content.includes('<AlertSlidePanel')) {
  if (content.includes('<SearchSlidePanel')) {
    content = content.replace(/<SearchSlidePanel[^>]*\/>/g, (match) => {
      return match + "\n      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />";
    });
  } else {
    content = content.replace('</body>', '<AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />\n</body>');
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Update complete.');
