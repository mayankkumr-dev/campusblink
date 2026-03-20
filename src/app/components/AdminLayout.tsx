import React, { useState } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { 
  Home, Users, Ban, ShieldAlert, Store, ShoppingBag, UtensilsCrossed, PlusCircle,
  Printer, FileText, ShoppingCart, Flag, MessageSquare, Send, Mail, History,
  LayoutTemplate, Zap, DollarSign, TrendingUp, Settings, Megaphone, Wrench,
  FileSignature, Download, Bell, Search, Menu, X, ChevronDown, LogOut, Ticket
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const adminLogo = '/logo/logo_with_text_transparent.png';

const NavItem = ({ to, icon: Icon, label, exact = false, onNavigate }: { to: string, icon: any, label: string, exact?: boolean, onNavigate: () => void }) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to) && (to !== '/admin' || location.pathname === '/admin');

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-[10px] h-[36px] px-[12px] mx-[8px] my-[2px] rounded-md transition-colors font-sans text-[14px] font-medium ${
        isActive
          ? 'bg-[#FEFCE8] text-[#0D0D0D] font-semibold'
          : 'text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]'
      }`}
    >
      <Icon size={16} className={isActive ? "text-[#CA8A04]" : "text-[#9B9B9B]"} />
      {label}
    </NavLink>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="py-[20px] px-4 pb-[8px] font-sans font-medium text-[11px] text-[#9B9B9B] uppercase tracking-[1px]">
    {label}
  </div>
);

export const AdminLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    // TODO: implement real auth logout
    navigate('/student/home');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#E8E8E8] text-[#0D0D0D] overflow-hidden">
      {/* Logo Area */}
      <div className="h-[60px] border-b border-[#E8E8E8] flex items-center justify-between px-4 pl-4 shrink-0 shrink-0">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
          <img 
            src={adminLogo} 
            alt="Campus Blink Admin" 
            className="h-9 w-auto object-contain" 
          />
        </Link>
      </div>

      {/* Nav Scroll Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar py-4 px-3">
        
        <SectionLabel label="Overview" />
        <NavItem to="/admin" icon={Home} label="Dashboard" exact onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Users" />
        <NavItem to="/admin/users" exact icon={Users} label="All Users" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/users/banned" icon={Ban} label="Banned Users" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/users/roles" icon={ShieldAlert} label="Role Management" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/invites" icon={Ticket} label="Invite Codes" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Canteen Shops" />
        <NavItem to="/admin/canteen" exact icon={Store} label="All Canteens" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/canteen/orders" icon={ShoppingBag} label="Canteen Orders" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/canteen/menu" icon={UtensilsCrossed} label="Menu Management" onNavigate={() => setIsMobileOpen(false)} />
        
        <SectionLabel label="Print Shops" />
        <NavItem to="/admin/print" exact icon={Printer} label="All Print Shops" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/print/orders" icon={FileText} label="Print Orders" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Marketplace" />
        <NavItem to="/admin/marketplace" exact icon={ShoppingCart} label="All Listings" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/marketplace/reported" icon={Flag} label="Reported Listings" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Community" />
        <NavItem to="/admin/community" exact icon={MessageSquare} label="All Posts" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/community/reported" icon={Flag} label="Reported Posts" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/community/notice" icon={Send} label="Post Notice" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Email Center" />
        <NavItem to="/admin/email/compose" icon={Mail} label="Compose Email" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/email/history" icon={History} label="Email History" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/email/templates" icon={LayoutTemplate} label="Templates" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Finance" />
        <NavItem to="/admin/finance/credits" icon={Zap} label="Reputation Log" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/finance/revenue" icon={DollarSign} label="Revenue" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Platform" />
        <NavItem to="/admin/settings" icon={Settings} label="Settings" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/announcements" icon={Megaphone} label="Announcements" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/contact-issues" icon={Wrench} label="Contact Issues" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Legal & Audit" />
        <NavItem to="/admin/legal" exact icon={FileSignature} label="Terms Editor" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/legal/export" icon={Download} label="Data Export" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/audit" icon={History} label="Audit Log" onNavigate={() => setIsMobileOpen(false)} />

      </div>

      {/* Admin Profile Bottom Area */}
      <div className="p-4 border-t border-black/[0.08] shrink-0 bg-[#FAFAF8]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#F7F5F0] flex items-center justify-center text-[#FFD600] font-syne font-bold border border-black/10">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="font-sans font-bold text-sm text-[#0D0D0D] truncate">Admin User</h4>
            <span className="inline-flex items-center px-2 border border-[#FFD600]/30 bg-[#FFD600]/10 text-[#FFD600] text-[10px] uppercase font-bold tracking-wider rounded-sm mt-0.5">
              Super Admin
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-[10px] h-[36px] px-[12px] rounded-md text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D] transition-colors duration-150">
          <LogOut size={16} className="text-[#9B9B9B]" />
          <span className="text-[14px] leading-none mb-[-1px] font-medium">Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#FAFAF8] flex flex-col md:flex-row font-sans text-[#0D0D0D]">
      
      {/* Mobile Header / Hamburger */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-black/[0.08] sticky top-0 z-50 safe-area-top">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
          <img src={adminLogo} alt="Campus Blink" className="h-6 w-auto object-contain" />
        </Link>
        <button onClick={() => setIsMobileOpen(true)} className="p-2 text-[#0D0D0D]">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 " onClick={() => setIsMobileOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[300px] transform transition-transform duration-300 safe-area-top safe-area-bottom">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[240px] fixed top-0 bottom-0 left-0 z-40">
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-dvh bg-[#FAFAF8]">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-black/[0.08] flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
          <h1 className="font-syne font-bold text-base md:text-xl text-[#0D0D0D] capitalize truncate max-w-[42vw] md:max-w-none">
            {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h1>
          
          <div className="flex-1 max-w-md mx-8 hidden lg:block">
            <div className="relative relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B] group-focus-within:text-[#FFD600] transition-colors" />
              <input 
                type="text" 
                placeholder="Search users, orders, posts..." 
                className="w-full bg-[#F7F5F0] border border-black/10 rounded-md py-2 pl-10 pr-4 text-sm text-[#0D0D0D] placeholder-[#6B6B6B] focus:outline-none focus:border-[#FFD600]/50 focus:bg-[#F7F5F0] transition-colors"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DC2626] rounded-md border-2 border-white" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-[#F7F5F0] flex items-center justify-center text-xs font-syne font-bold text-[#0D0D0D] border border-black/10 group-hover:border-[#FFD600]/50 transition-colors">
                A
              </div>
              <ChevronDown className="w-4 h-4 text-[#6B6B6B] group-hover:text-[#0D0D0D] transition-colors" />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3 md:p-8 safe-area-bottom">
          <Outlet />
        </main>

      </div>
    </div>
  );
};
