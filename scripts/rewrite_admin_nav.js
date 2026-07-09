const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/components/AdminLayout.tsx', 'utf8');

const regex = /<SectionLabel label="Users" \/>[\s\S]*?<SectionLabel label="Marketplace" \/>/m;

const replacement = `<SectionLabel label="Accounts & Management" />
        <NavItem to="/admin/accounts" icon={Users} label="Accounts Hub" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Shop Operations" />
        <NavItem to="/admin/canteen/orders" icon={ShoppingBag} label="Canteen Orders" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/canteen/menu" icon={UtensilsCrossed} label="Canteen Menu" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/print/orders" icon={FileText} label="Print Orders" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Marketplace" />`;

content = content.replace(regex, replacement);

fs.writeFileSync('frontend/src/app/components/AdminLayout.tsx', content);
console.log("Updated navigation in AdminLayout");
