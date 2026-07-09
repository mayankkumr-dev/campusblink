const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/components/AdminLayout.tsx', 'utf8');

const regex = /<SectionLabel label="Shop Operations" \/>[\s\S]*?<SectionLabel label="Marketplace" \/>/m;

const replacement = `<SectionLabel label="Shop Operations" />
        <NavItem to="/admin/orders" icon={ShoppingBag} label="Operations Hub" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Marketplace" />`;

content = content.replace(regex, replacement);

fs.writeFileSync('frontend/src/app/components/AdminLayout.tsx', content);
console.log("Updated navigation 2 in AdminLayout");
