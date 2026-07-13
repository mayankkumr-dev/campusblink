import React, { useState, useMemo } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router';
import {
  Home, Users, ShoppingBag, ShoppingCart, Flag, MessageSquare, Mail, History,
  LayoutTemplate, DollarSign, Settings, Megaphone, Wrench,
  FileSignature, Download, Bell, Search, Menu, LogOut, UserCheck,
  GraduationCap, Printer, BarChart3, X, ChevronRight, Zap
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getPendingProfessors } from '../../api/professor';
import { AdminGlobalSearch } from './AdminGlobalSearch';

/* ─────────────────────────────────────────────────────────
   SidebarNavLink — navigates via React Router
───────────────────────────────────────────────────────── */
const SidebarNavLink: React.FC<{
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  onNavigate: () => void;
  badgeCount?: number;
}> = ({ to, icon: Icon, label, exact = false, onNavigate, badgeCount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to) && (to !== '/admin' || location.pathname === '/admin');

  return (
    <button
      type="button"
      onClick={() => { navigate(to); onNavigate(); }}
      className={`relative group w-full flex items-center justify-between px-4 md:px-3 py-3 md:py-[7px] my-0 md:my-[1px] md:rounded-xl transition-all duration-150 font-sans text-[14px] md:text-[13px] font-medium text-left min-h-[44px] md:min-h-0 ${
        isActive
          ? 'bg-[#F5A524] text-[#0D0F14] font-bold shadow-sm'
          : 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A] dark:text-[#E2E8F0] dark:hover:bg-[#262B36] dark:hover:text-[#FFFFFF]'
      }`}
    >
      {/* Mobile Active Indicator */}
      {isActive && (
        <span className="md:hidden absolute left-0 top-0 bottom-0 w-[4px] bg-[#F5A524] rounded-r-full" />
      )}
      <div className="flex items-center gap-3 md:gap-2.5 min-w-0">
        <Icon
          size={16}
          className={`shrink-0 transition-colors ${
            isActive ? 'text-[#0D0F14] font-bold' : 'text-[#64748B] group-hover:text-[#0F172A] dark:text-[#94A3B8] dark:group-hover:text-[#FFFFFF]'
          }`}
        />
        <span className="truncate leading-none mt-[1px] md:mt-0">{label}</span>
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold shrink-0 ml-1 ${
          isActive ? 'bg-[#0D0F14] text-[#FFFFFF]' : 'bg-[#F43F5E] text-[#FFFFFF]'
        }`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
};

/* ─────────────────────────────────────────────────────────
   AccordionCategory — replaces SectionLabel
───────────────────────────────────────────────────────── */
const AccordionCategory: React.FC<{ label: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ label, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="mb-0">
      {/* Desktop label */}
      <div className="hidden md:block px-3 pt-5 pb-1 font-sans font-bold text-[11px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-widest select-none">
        {label}
      </div>
      
      {/* Mobile toggle */}
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full flex items-center justify-between px-4 py-3 min-h-[44px] font-sans font-bold text-[13px] text-[#1E293B] dark:text-[#F8FAFC] uppercase tracking-wider hover:bg-[#F1F5F9] dark:hover:bg-[#262B36] transition-colors"
      >
        {label}
        <ChevronRight size={14} className={`text-[#64748B] dark:text-[#94A3B8] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Children */}
      <div className={`md:block ${isOpen ? 'block pb-1' : 'hidden'}`}>
        {children}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Breadcrumb title helper
───────────────────────────────────────────────────────── */
const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/alerts': 'Smart Alerts',
  '/admin/accounts': 'Accounts & Access',
  '/admin/orders': 'Shop Operations',
  '/admin/marketplace': 'Marketplace Listings',
  '/admin/marketplace/reported': 'Reported Listings',
  '/admin/community-hub': 'Community Hub',
  '/admin/community': 'All Community Posts',
  '/admin/community/reported': 'Reported Posts',
  '/admin/community/notice': 'Post Community Notice',
  '/admin/notice-admins': 'Notice Admin Access',
  '/admin/notices': 'Compose Notice',
  '/admin/email': 'Email Center',
  '/admin/email/compose': 'Compose Email',
  '/admin/email/history': 'Email History',
  '/admin/email/templates': 'Email Templates',
  '/admin/finance': 'Financial Overview',
  '/admin/finance/revenue': 'Revenue & Payouts',
  '/admin/finance/credits': 'Reputation Credits',
  '/admin/settings': 'Platform Settings',
  '/admin/feedback': 'App Feedback',
  '/admin/announcements': 'Announcements',
  '/admin/contact-issues': 'Contact Issues',
  '/admin/legal': 'Terms & Legal Docs',
  '/admin/legal/export': 'Data Export',
  '/admin/audit': 'Audit Log',
  '/admin/users': 'All Users',
  '/admin/users/banned': 'Banned Accounts',
  '/admin/users/roles': 'Role Permissions',
  '/admin/invites': 'Invitations',
  '/admin/invites/waitlist': 'Invite Waitlist',
  '/admin/professors': 'All Professors',
  '/admin/professors/pending': 'Pending Approvals',
  '/admin/canteen': 'Canteen Shops',
  '/admin/canteen/orders': 'Canteen Orders',
  '/admin/canteen/menu': 'Canteen Menu Catalog',
  '/admin/print': 'Print Shops',
  '/admin/print/orders': 'Print Orders',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Dynamic segment fallback (e.g. /admin/users/:id)
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 3) return PAGE_TITLES[`/${parts[0]}/${parts[1]}`] || 'Admin Console';
  return 'Admin Console';
}

/* ─────────────────────────────────────────────────────────
   AdminLayout — main shell
───────────────────────────────────────────────────────── */
export const AdminLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [pendingProfsCount, setPendingProfsCount] = React.useState(0);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  React.useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      const { data } = await getPendingProfessors();
      if (mounted) setPendingProfsCount(data?.length || 0);
    };

    fetchCount();

    const channel = supabase
      .channel('admin_professors_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleExitConsole = () => navigate('/student/home');
  const closeMenu = () => setIsMobileOpen(false);

  const adminInitial = (profile?.name || profile?.email || 'A').charAt(0).toUpperCase();
  const adminName = profile?.name || 'Super Admin';

  /* ── Sidebar content ─────────────────────────────────── */
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-admin-bg-surface border-r border-slate-200 dark:border-admin-border-subtle overflow-hidden transition-colors">
      {/* Logo Area */}
      <div className="h-[64px] border-b border-slate-100 dark:border-admin-border-subtle flex items-center justify-between px-5 shrink-0 transition-colors">
        <Link to={user ? '/student/home' : '/'} className="flex items-center gap-2 no-underline">
          <div className="w-7 h-7 rounded-lg bg-[#F5A524] flex items-center justify-center shrink-0 transition-colors">
            <span className="text-[#0D0F14] font-syne font-extrabold text-sm leading-none transition-colors">CB</span>
          </div>
          <div>
            <p className="font-syne font-extrabold text-sm text-[#0F172A] dark:text-[#FFFFFF] leading-none transition-colors">Campus Blink</p>
            <p className="font-sans text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium leading-none mt-0.5 transition-colors">Super Admin</p>
          </div>
        </Link>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={closeMenu}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-admin-text-tertiary dark:hover:text-admin-text-primary dark:hover:bg-admin-bg-surface-hover transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav Scroll Area */}
      <div className="flex-1 overflow-y-auto py-1 md:py-3 px-0 md:px-2.5 hide-scrollbar">
        <AccordionCategory label="Overview" defaultOpen={true}>
          <SidebarNavLink to="/admin" icon={Home} label="Dashboard" exact onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/alerts" icon={Bell} label="Smart Alerts" onNavigate={closeMenu} />
        </AccordionCategory>

        <AccordionCategory label="Accounts">
          <SidebarNavLink
            to="/admin/accounts"
            icon={Users}
            label="Accounts Hub"
            onNavigate={closeMenu}
            badgeCount={pendingProfsCount > 0 ? pendingProfsCount : undefined}
          />
        </AccordionCategory>

        <AccordionCategory label="Operations">
          <SidebarNavLink to="/admin/orders" icon={ShoppingBag} label="Shop Operations" onNavigate={closeMenu} />
        </AccordionCategory>

        <AccordionCategory label="Marketplace">
          <SidebarNavLink to="/admin/marketplace" exact icon={ShoppingCart} label="All Listings" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/marketplace/reported" icon={Flag} label="Reported Listings" onNavigate={closeMenu} />
        </AccordionCategory>

        <AccordionCategory label="Community">
          <SidebarNavLink to="/admin/community-hub" icon={MessageSquare} label="Community Hub" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/notice-admins" icon={UserCheck} label="Notice Admin Access" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/notices" icon={Megaphone} label="Compose Notice" onNavigate={closeMenu} />
        </AccordionCategory>

        <AccordionCategory label="Email Center">
          <SidebarNavLink to="/admin/email/compose" icon={Mail} label="Compose Email" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/email/history" icon={History} label="Email History" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/email/templates" icon={LayoutTemplate} label="Templates" onNavigate={closeMenu} />
        </AccordionCategory>

        <AccordionCategory label="Finance">
          <SidebarNavLink to="/admin/finance" exact icon={BarChart3} label="Overview" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/finance/revenue" icon={DollarSign} label="Revenue" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/finance/credits" icon={Zap} label="Reputation Credits" onNavigate={closeMenu} />
        </AccordionCategory>

        <AccordionCategory label="Platform">
          <SidebarNavLink to="/admin/settings" icon={Settings} label="Settings" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/feedback" icon={MessageSquare} label="App Feedback" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/announcements" icon={Megaphone} label="Announcements" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/contact-issues" icon={Wrench} label="Contact Issues" onNavigate={closeMenu} />
        </AccordionCategory>

        <AccordionCategory label="Legal & Audit">
          <SidebarNavLink to="/admin/legal" exact icon={FileSignature} label="Terms Editor" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/legal/export" icon={Download} label="Data Export" onNavigate={closeMenu} />
          <SidebarNavLink to="/admin/audit" icon={History} label="Audit Log" onNavigate={closeMenu} />
        </AccordionCategory>

        {/* Bottom padding */}
        <div className="h-4" />
      </div>

      {/* Admin Profile Footer */}
      <div className="shrink-0 border-t border-slate-100 dark:border-admin-border-subtle p-3 md:p-3 transition-colors bg-white dark:bg-admin-bg-surface z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] md:shadow-none">
        <div className="flex items-center gap-2.5 px-2 md:px-1 mb-2.5 md:mb-2.5">
          <div className="w-9 h-9 md:w-8 md:h-8 rounded-xl bg-[#F5A524] text-[#0D0F14] flex items-center justify-center font-syne font-extrabold text-[15px] md:text-sm shrink-0 transition-colors">
            {adminInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans font-bold text-sm md:text-[13px] text-[#0F172A] dark:text-[#FFFFFF] truncate leading-tight transition-colors">{adminName}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 transition-colors">
              <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
              Super Admin
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExitConsole}
          className="w-full flex items-center justify-center gap-1.5 h-11 md:h-8 px-3 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors font-semibold text-[13px] md:text-[12px]"
        >
          <LogOut size={16} className="md:w-[13px] md:h-[13px]" />
          <span>Exit Console</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="admin-theme min-h-dvh flex flex-col md:flex-row font-sans bg-slate-50 text-slate-900 dark:bg-admin-bg-base dark:text-admin-text-primary transition-colors"
    >
      {/* ── Mobile Header ──────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-white dark:bg-admin-bg-surface border-b border-slate-200 dark:border-admin-border-subtle sticky top-0 z-50 safe-area-top shadow-sm transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500 dark:bg-admin-accent flex items-center justify-center transition-colors">
            <span className="text-white dark:text-admin-bg-surface-elevated font-syne font-extrabold text-xs transition-colors">CB</span>
          </div>
          <span className="font-syne font-extrabold text-sm text-slate-900 dark:text-admin-text-primary transition-colors">Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-slate-600 dark:text-admin-text-secondary rounded-xl hover:bg-slate-100 dark:hover:bg-admin-bg-surface-hover transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile Drawer ──────────────────────────────── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={closeMenu}
          />
          <div className="relative w-[85%] max-w-[320px] h-full shadow-2xl bg-white dark:bg-admin-bg-surface" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <div className="hidden md:block w-60 fixed top-0 bottom-0 left-0 z-40 select-none">
        {sidebarContent}
      </div>

      {/* ── Main Content ────────────────────────────────── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-dvh bg-slate-50 dark:bg-admin-bg-base transition-colors">

        {/* Top Header Bar */}
        <header className="h-[64px] bg-white dark:bg-admin-bg-surface border-b border-slate-200 dark:border-admin-border-subtle flex items-center justify-between px-5 lg:px-8 shrink-0 sticky top-0 z-30 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:shadow-none transition-colors">

          {/* Page Title + Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden md:flex items-center gap-1 text-slate-400 dark:text-admin-text-secondary text-xs font-medium transition-colors">
              <span>Admin</span>
              <ChevronRight size={12} />
            </div>
            <h1 className="font-syne font-extrabold text-base md:text-lg text-slate-900 dark:text-admin-text-primary tracking-tight truncate transition-colors">
              {pageTitle}
            </h1>
          </div>

          {/* Search Bar (desktop) */}
          <div className="flex-1 max-w-sm mx-6 hidden lg:block">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 bg-slate-50 dark:bg-admin-bg-surface-raised border border-slate-200 dark:border-admin-border-subtle rounded-xl py-2 px-3.5 text-xs text-slate-400 dark:text-admin-text-tertiary hover:border-amber-300 dark:hover:border-admin-accent hover:bg-white dark:hover:bg-admin-bg-surface-hover transition-all group"
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
            >
              <div className="flex items-center gap-2">
                <Search size={13} className="text-slate-400 dark:text-admin-text-tertiary group-hover:text-amber-500 dark:group-hover:text-admin-accent transition-colors shrink-0" />
                <span className="transition-colors">Search users, orders, logs…</span>
              </div>
              <kbd className="hidden xl:flex items-center gap-0.5 rounded-md bg-white dark:bg-admin-bg-surface-hover border border-slate-200 dark:border-admin-border-subtle px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:text-admin-text-tertiary shadow-sm dark:shadow-none transition-colors">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile search trigger */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-admin-text-secondary hover:bg-slate-100 dark:hover:bg-admin-bg-surface-hover transition-colors"
              onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            {/* Alerts bell */}
            <button
              type="button"
              onClick={() => navigate('/admin/alerts')}
              className="relative p-2 rounded-xl text-slate-500 dark:text-admin-text-secondary hover:bg-slate-100 dark:hover:bg-admin-bg-surface-hover border border-transparent hover:border-slate-200 dark:hover:border-admin-border-subtle transition-all"
              aria-label="Smart Alerts"
            >
              <Bell size={16} />
              {/* Red dot — always visible since alerts always exist */}
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-admin-bg-surface transition-colors" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 dark:bg-admin-border-subtle mx-1 transition-colors" />

            {/* Admin avatar */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 dark:bg-admin-accent text-white dark:text-admin-bg-surface-elevated flex items-center justify-center font-syne font-extrabold text-sm shadow-sm shadow-amber-200 dark:shadow-none transition-colors">
                {adminInitial}
              </div>
              <div className="hidden xl:block">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-admin-text-primary leading-none transition-colors">{adminName}</p>
                <p className="text-[10px] text-slate-400 dark:text-admin-text-secondary font-medium leading-none mt-0.5 transition-colors">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 safe-area-bottom">
          <AdminGlobalSearch />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
