const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/app/components/ProfessorLayout.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('import { AlertSlidePanel }')) {
  content = content.replace(
    "import { ProfessorBadge } from './ProfessorBadge';",
    "import { ProfessorBadge } from './ProfessorBadge';\nimport { AlertSlidePanel } from './AlertSlidePanel';\nimport { Bell } from 'lucide-react';\nimport { useNotificationStore } from '../../store/notificationStore';\nimport { useNotifications } from '../../hooks/useRealtime';"
  );
}

if (!content.includes('const [notificationPanelOpen, setNotificationPanelOpen]')) {
  content = content.replace(
    "const [isMobileOpen, setIsMobileOpen] = useState(false);",
    "const [isMobileOpen, setIsMobileOpen] = useState(false);\n  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);\n  const profile = useAuthStore(state => state.profile);\n  useNotifications(profile?.id);\n  const unreadCount = useNotificationStore(state => state.unreadCount);"
  );
}

// Update ProfessorNavItem to allow badgeCount
if (!content.includes('badgeCount?: number')) {
  content = content.replace(
    "const ProfessorNavItem = ({ to, icon: Icon, label, exact = false, onNavigate }: { to: string, icon: any, label: string, exact?: boolean, onNavigate: () => void }) => {",
    "const ProfessorNavItem = ({ to, icon: Icon, label, exact = false, onNavigate, badgeCount }: { to: string, icon: any, label: string, exact?: boolean, onNavigate: () => void, badgeCount?: number }) => {"
  );
}

if (!content.includes('bg-[#DC2626]')) {
  content = content.replace(
    "    <NavLink\n      to={to}",
    `    <NavLink
      to={to}
      onClick={(e) => {
        if(to === '/professor/alerts') {
          e.preventDefault();
        }
      }}`
  );
  
  content = content.replace(
    "<Icon size={20} className={isActive ? 'text-[#92400E]' : 'text-[#6B6B6B]'} />",
    `      <div className="relative">
         <Icon size={20} className={isActive ? 'text-[#92400E]' : 'text-[#6B6B6B]'} />
         {Number(badgeCount || 0) > 0 && (
           <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC2626] border border-white"></span>
           </span>
         )}
      </div>`
  );
  
  content = content.replace(
    "<item.icon size={20} className={isActive ? 'text-[#CA8A04]' : 'text-[#9B9B9B]'} />",
    `      <div className="relative">
         <item.icon size={20} className={isActive ? 'text-[#CA8A04]' : 'text-[#9B9B9B]'} />
         {Number(item.badgeCount || 0) > 0 && (
           <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC2626] border border-white"></span>
           </span>
         )}
      </div>`
  );
  
  content = content.replace(
    "    <NavLink\n      to={to}\n      onClick={(e) => {\n        if(to === '/professor/alerts') {\n          e.preventDefault();\n        }\n      }}\n      onClick={onNavigate}",
    `    <NavLink
      to={to}
      onClick={(e) => {
        if(to === '/professor/alerts') {
          e.preventDefault();
        }
        onNavigate();
      }}`
  );
}

if (!content.includes("{ to: '/professor/alerts'")) {
    content = content.replace(
      "    { to: '/professor/payments', icon: CreditCard, label: 'Payments', exact: false },\n  ];",
      "    { to: '/professor/payments', icon: CreditCard, label: 'Payments', exact: false },\n    { to: '/professor/alerts', icon: Bell, label: 'Alerts', exact: true, badgeCount: unreadCount },\n  ];"
    );
}

if(!content.includes('badgeCount={item.badgeCount}')) {
    content = content.replace(
        "            exact={item.exact}\n            onNavigate={() => setIsMobileOpen(false)}\n          />",
        "            exact={item.exact}\n            onNavigate={() => { setIsMobileOpen(false); if (item.to === '/professor/alerts') setNotificationPanelOpen(true); }}\n            badgeCount={item.badgeCount}\n          />"
    );
}

if (!content.includes('<AlertSlidePanel')) {
  // Mobile nav click
  content = content.replace(
    `            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
            >`,
    `            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (item.to === '/professor/alerts') {
                  e.preventDefault();
                  setNotificationPanelOpen(true);
                }
              }}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
            >`
  );

  content = content.replace(
    "      {/* Mobile Sidebar Overlay */}",
    "      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />\n      {/* Mobile Sidebar Overlay */}"
  );
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Professor layout patched successfully.');
