const fs = require('fs');
let content = fs.readFileSync('frontend/src/app/components/AdminLayout.tsx', 'utf8');
content = content.replace(
  '<NavItem to="/admin/finance/revenue" icon={DollarSign} label="Revenue" onNavigate={() => setIsMobileOpen(false)} /> setIsMobileOpen(false)} />',
  '<NavItem to="/admin/finance/revenue" icon={DollarSign} label="Revenue" onNavigate={() => setIsMobileOpen(false)} />'
);
fs.writeFileSync('frontend/src/app/components/AdminLayout.tsx', content);
