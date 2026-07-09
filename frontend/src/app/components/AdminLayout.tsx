import React, { useState } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { 
  Home, Users, Ban, ShieldAlert, Store, ShoppingBag, UtensilsCrossed, PlusCircle,
  Printer, FileText, ShoppingCart, Flag, MessageSquare, Send, Mail, History,
  LayoutTemplate, Zap, DollarSign, TrendingUp, Settings, Megaphone, Wrench,
  FileSignature, Download, Bell, Search, Menu, X, ChevronDown, LogOut, Ticket,
  GraduationCap, Clock
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import { ThemeAwareLogo } from './ThemeAwareLogo';
import { ThemeToggle } from './ui/ThemeToggle';

const NavItem = ({ to, icon: Icon, label, exact = false, onNavigate, badgeCount }: { to: string, icon: any, label: string, exact?: boolean, onNavigate: () => void, badgeCount?: number }) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to) && (to !== '/admin' || location.pathname === '/admin');

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={`flex items-center justify-between h-[36px] px-[12px] mx-[8px] my-[2px] rounded-md transition-colors font-sans text-[14px] font-medium ${
        isActive
          ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <div className="flex items-center gap-[10px]">
        <Icon size={16} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
        {label}
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold">
          {badgeCount}
        </span>
      )}
    </NavLink>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="py-[20px] px-4 pb-[8px] font-sans font-medium text-[11px] text-[var(--text-muted)] uppercase tracking-[1px]">
    {label}
  </div>
);

export const AdminLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [pendingProfsCount, setPendingProfsCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'professor')
        .eq('professor_status', 'pending');
      if (mounted) setPendingProfsCount(count || 0);
    };

    fetchCount();

    const channel = supabase.channel('admin_professors_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.professor' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = () => {
    // TODO: implement real auth logout
    navigate('/student/home');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border-r border-black/10 text-[var(--text-primary)] overflow-hidden">
      {/* Logo Area */}
          <div className="h-[60px] border-b border-black/10 flex items-center justify-between px-4 pl-4 shrink-0 overflow-hidden">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
            <ThemeAwareLogo variant="white" alt="Campus Blink Admin" className="h-24 w-auto object-contain dark-preserve" />
        </Link>
      </div>

      {/* Nav Scroll Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar py-4 px-3">
        
        <SectionLabel label="Overview" />
        <NavItem to="/admin" icon={Home} label="Dashboard" exact onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Accounts & Management" />
        <NavItem to="/admin/accounts" icon={Users} label="Accounts Hub" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Shop Operations" />
        <NavItem to="/admin/orders" icon={ShoppingBag} label="Operations Hub" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Marketplace" />
        <NavItem to="/admin/marketplace" exact icon={ShoppingCart} label="All Listings" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/marketplace/reported" icon={Flag} label="Reported Listings" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Community" />
        <NavItem to="/admin/community-hub" icon={MessageSquare} label="Community Hub" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Email Center" />
        <NavItem to="/admin/email/compose" icon={Mail} label="Compose Email" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/email/history" icon={History} label="Email History" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/email/templates" icon={LayoutTemplate} label="Templates" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Finance" />
        <NavItem to="/admin/finance/revenue" icon={DollarSign} label="Revenue" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Platform" />
        <NavItem to="/admin/settings" icon={Settings} label="Settings" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/feedback" icon={MessageSquare} label="App Feedback" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/announcements" icon={Megaphone} label="Announcements" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/contact-issues" icon={Wrench} label="Contact Issues" onNavigate={() => setIsMobileOpen(false)} />

        <SectionLabel label="Legal & Audit" />
        <NavItem to="/admin/legal" exact icon={FileSignature} label="Terms Editor" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/legal/export" icon={Download} label="Data Export" onNavigate={() => setIsMobileOpen(false)} />
        <NavItem to="/admin/audit" icon={History} label="Audit Log" onNavigate={() => setIsMobileOpen(false)} />

      </div>

      {/* Admin Profile Bottom Area */}
      <div className="p-4 border-t border-black/[0.08] shrink-0 bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--yellow)] font-syne font-bold border border-black/10">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="font-sans font-bold text-sm text-[var(--text-primary)] truncate">Admin User</h4>
            <span className="inline-flex items-center px-2 border border-[var(--yellow)]/30 bg-[var(--yellow)]/10 text-[var(--yellow)] text-[10px] uppercase font-bold tracking-wider rounded-sm mt-0.5">
              Super Admin
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-[10px] h-[36px] px-[12px] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150">
          <LogOut size={16} className="text-[var(--text-muted)]" />
          <span className="text-[14px] leading-none mb-[-1px] font-medium">Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col md:flex-row font-sans bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Mobile Header / Hamburger */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-[var(--bg)] border-b border-black/[0.08] sticky top-0 z-50 safe-area-top select-none">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
          <div className="h-16 overflow-hidden flex items-center">
            <ThemeAwareLogo variant="white" alt="Campus Blink" className="h-24 w-auto object-contain dark-preserve" />
          </div>
        </Link>
        <button onClick={() => setIsMobileOpen(true)} className="p-2 text-[var(--text-primary)]">
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
      <div className="hidden md:block w-[240px] fixed top-0 bottom-0 left-0 z-40 select-none">
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-dvh bg-[var(--bg-primary)]">
        
        {/* Header */}
        <header className="h-16 bg-[var(--bg)] border-b border-black/[0.08] flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
          <h1 className="font-syne font-bold text-base md:text-xl text-[var(--text-primary)] capitalize truncate max-w-[42vw] md:max-w-none">
            {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h1>
          
          <div className="flex-1 max-w-md mx-8 hidden lg:block">
            <div className="relative group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--yellow)] transition-colors" />
              <div
                className="w-full flex items-center justify-between bg-[var(--bg-tertiary)] border border-black/10 rounded-md py-2 pl-10 pr-4 text-sm text-[var(--text-secondary)] group-hover:border-[var(--yellow)]/50 transition-colors"
              >
                <span>Search users, orders, posts...</span>
                <span className="flex items-center justify-center p-1 rounded bg-black/5 text-[10px] font-bold text-[var(--text-secondary)] px-1.5 border border-black/10">
                  Cmd+K
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <ThemeToggle />
            <button onClick={() => navigate('/admin/alerts')} className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DC2626] rounded-md border-2 border-white" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-syne font-bold text-[var(--text-primary)] border border-black/10 group-hover:border-[var(--yellow)]/50 transition-colors">
                A
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3 md:p-8 safe-area-bottom">
          <AdminGlobalSearch />
          <Outlet />
        </main>

      </div>
    </div>
  );
};
