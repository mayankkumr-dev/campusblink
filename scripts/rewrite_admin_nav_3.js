const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/components/AdminLayout.tsx', 'utf8');

const regex = /<SectionLabel label="Community" \/>[\s\S]*?<SectionLabel label="Email Center" \/>/m;

const replacement = `<SectionLabel label="Community" />
        <NavItem to="/admin/community-hub" icon={MessageSquare} label="Community Hub" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Email Center" />`;

content = content.replace(regex, replacement);

const regex2 = /<SectionLabel label="Finance" \/>[\s\S]*?<NavItem to="\/admin\/finance\/revenue" .*?>/m;
const replacement2 = `<SectionLabel label="Finance" />
        <NavItem to="/admin/finance/revenue" icon={DollarSign} label="Revenue" onNavigate={() => setIsMobileOpen(false)} />`;

content = content.replace(regex2, replacement2);

fs.writeFileSync('frontend/src/app/components/AdminLayout.tsx', content);
console.log("Updated navigation 3 in AdminLayout");
