import React, { useState } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { 
  Home, Users, ShoppingBag, ShoppingCart, Flag, MessageSquare, Mail, History,
  LayoutTemplate, DollarSign, Settings, Megaphone, Wrench,
  FileSignature, Download, Bell, Search, Menu, LogOut, UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import { ThemeAwareLogo } from './ThemeAwareLogo';

const NavItem = ({
  to,
  icon: Icon,
  label,
  exact = false,
  onNavigate,
  badgeCount,
}: {
  to: string;
  icon: any;
  label: string;
  exact?: boolean;
  onNavigate: () => void;
  badgeCount?: number;
}) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to) && (to !== '/admin' || location.pathname === '/admin');

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={`group flex items-center justify-between px-3.5 py-2.5 my-0.5 rounded-2xl transition-all font-sans text-xs font-semibold ${
        isActive
          ? 'bg-amber-500 text-white shadow-2xs'
          : 'text-text-secondary hover:bg-surface-elevated/80 hover:text-text-primary'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={16}
          className={`stroke-[1.8] transition-colors ${
            isActive ? 'text-white' : 'text-text-secondary/70 group-hover:text-text-primary'
          }`}
        />
        <span>{label}</span>
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
          {badgeCount}
        </span>
      )}
    </NavLink>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="pt-5 pb-1.5 px-3.5 font-sans font-bold text-[10px] text-text-secondary/70 uppercase tracking-widest">
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

    const channel = supabase
      .channel('admin_professors_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.professor' },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = () => {
    navigate('/student/home');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-border-subtle text-text-primary overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Logo Area */}
      <div className="h-20 border-b border-border-subtle flex items-center justify-between px-6 shrink-0 overflow-hidden">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer flex items-center">
          <ThemeAwareLogo
            height={48}
            alt="Campus Blink Admin"
            className="h-12 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Nav Scroll Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar py-4 px-3.5">
        <SectionLabel label="Overview" />
        <NavItem
          to="/admin"
          icon={Home}
          label="Dashboard"
          exact
          onNavigate={() => setIsMobileOpen(false)}
        />

        <SectionLabel label="Accounts & Management" />
        <NavItem
          to="/admin/accounts"
          icon={Users}
          label="Accounts Hub"
          onNavigate={() => setIsMobileOpen(false)}
          badgeCount={pendingProfsCount > 0 ? pendingProfsCount : undefined}
        />

        <SectionLabel label="Shop Operations" />
        <NavItem
          to="/admin/orders"
          icon={ShoppingBag}
          label="Operations Hub"
          onNavigate={() => setIsMobileOpen(false)}
        />

        <SectionLabel label="Marketplace" />
        <NavItem
          to="/admin/marketplace"
          exact
          icon={ShoppingCart}
          label="All Listings"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/marketplace/reported"
          icon={Flag}
          label="Reported Listings"
          onNavigate={() => setIsMobileOpen(false)}
        />

        <SectionLabel label="Community & Notices" />
        <NavItem
          to="/admin/community-hub"
          icon={MessageSquare}
          label="Community Hub"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/notice-admins"
          icon={UserCheck}
          label="Notice Admins Access"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/notices"
          icon={Megaphone}
          label="Compose Notice"
          onNavigate={() => setIsMobileOpen(false)}
        />

        <SectionLabel label="Email Center" />
        <NavItem
          to="/admin/email/compose"
          icon={Mail}
          label="Compose Email"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/email/history"
          icon={History}
          label="Email History"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/email/templates"
          icon={LayoutTemplate}
          label="Templates"
          onNavigate={() => setIsMobileOpen(false)}
        />

        <SectionLabel label="Finance" />
        <NavItem
          to="/admin/finance/revenue"
          icon={DollarSign}
          label="Revenue"
          onNavigate={() => setIsMobileOpen(false)}
        />

        <SectionLabel label="Platform" />
        <NavItem
          to="/admin/settings"
          icon={Settings}
          label="Settings"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/feedback"
          icon={MessageSquare}
          label="App Feedback"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/announcements"
          icon={Megaphone}
          label="Announcements"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/contact-issues"
          icon={Wrench}
          label="Contact Issues"
          onNavigate={() => setIsMobileOpen(false)}
        />

        <SectionLabel label="Legal & Audit" />
        <NavItem
          to="/admin/legal"
          exact
          icon={FileSignature}
          label="Terms Editor"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/legal/export"
          icon={Download}
          label="Data Export"
          onNavigate={() => setIsMobileOpen(false)}
        />
        <NavItem
          to="/admin/audit"
          icon={History}
          label="Audit Log"
          onNavigate={() => setIsMobileOpen(false)}
        />
      </div>

      {/* Admin Profile Bottom Area */}
      <div className="p-4 border-t border-border-subtle shrink-0 bg-surface-elevated">
        <div className="flex items-center gap-3 mb-3.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-accent-amber flex items-center justify-center font-syne font-extrabold text-sm border border-accent-amber-soft">
            A
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-sans font-bold text-xs text-text-primary truncate">
              Admin Console
            </h4>
            <span className="inline-flex items-center rounded-full bg-accent-green/15 border border-emerald-200 px-2 py-0.5 text-[9px] uppercase font-bold text-accent-green mt-0.5">
              Super Admin
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-xl text-accent-red bg-surface border border-rose-200 hover:bg-rose-50 transition-colors font-bold text-xs shadow-2xs"
        >
          <LogOut size={14} />
          <span>Exit Console</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col md:flex-row font-sans bg-surface text-text-primary">
      {/* Mobile Header / Hamburger */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-surface border-b border-border-subtle sticky top-0 z-50 safe-area-top select-none shadow-2xs">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
          <ThemeAwareLogo height={40} alt="Campus Blink" className="h-10 w-auto object-contain" />
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-text-primary rounded-xl hover:bg-surface-elevated"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-[82vw] max-w-[280px] transform transition-transform duration-300 safe-area-top safe-area-bottom">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 fixed top-0 bottom-0 left-0 z-40 select-none">
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-dvh bg-surface">
        {/* Header */}
        <header className="h-20 bg-white/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-6 lg:px-10 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <h1 className="font-syne font-extrabold text-lg md:text-2xl text-text-primary capitalize tracking-tight truncate">
              {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>

          <div className="flex-1 max-w-md mx-8 hidden lg:block">
            <div
              className="relative group cursor-pointer"
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/70 group-hover:text-amber-500 transition-colors" />
              <div className="w-full flex items-center justify-between bg-surface border border-border-subtle rounded-2xl py-2.5 pl-10 pr-3.5 text-xs text-text-secondary group-hover:border-amber-400 group-hover:bg-white transition-all">
                <span>Search administrative logs, users, orders...</span>
                <span className="flex items-center justify-center rounded-lg bg-surface px-2 py-0.5 text-[10px] font-bold text-text-secondary border border-border-subtle shadow-2xs">
                  Cmd+K
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/alerts')}
              className="relative rounded-2xl border border-border-subtle bg-surface p-2.5 text-text-secondary transition-colors hover:bg-surface-elevated"
              aria-label="Admin Notifications"
            >
              <Bell className="w-4.5 h-4.5 stroke-[2]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            </button>

            <div className="flex items-center gap-3 pl-2 border-l border-border-subtle">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xs font-syne font-bold shadow-xs">
                A
              </div>
              <div className="hidden xl:block">
                <p className="text-xs font-bold text-text-primary leading-tight">Super Admin</p>
                <p className="text-[10px] text-text-secondary/70 font-medium">Enterprise Backend</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 safe-area-bottom">
          <AdminGlobalSearch />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
