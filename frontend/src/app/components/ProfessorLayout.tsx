import React, { useState, useEffect } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { Home, UtensilsCrossed, Printer, CreditCard, Menu, LogOut, User, Building2, Bell, Megaphone, Shield, Settings, ClipboardCheck, X, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { ProfessorBadge } from '../../shared/components/ProfessorBadge';
import { AlertSlidePanel } from './AlertSlidePanel';
import { PushPermissionBanner } from './PushPermissionBanner';
import { useNotificationStore } from '../../store/notificationStore';
import { useNotifications } from '../../hooks/useRealtime';
import { Logo } from './ui/Logo';

const ProfessorNavItem = ({ to, icon: Icon, label, exact = false, onNavigate, badgeCount }: { to: string, icon: any, label: string, exact?: boolean, onNavigate: () => void, badgeCount?: number }) => {
  const location = useLocation();
  const isChatSection = location.pathname.includes('/messages');
  const isActive = exact
    ? location.pathname === to
    : location.pathname.startsWith(to) && (to !== '/professor' || location.pathname === '/professor' || location.pathname === '/professor/home');

  return (
    <NavLink
      to={to}
      onClick={(e) => {
        if(to === '/professor/alerts') {
          e.preventDefault();
        }
        onNavigate();
      }}
      className={`group/nav relative flex items-center py-2.5 px-4 mx-4 my-0.5 rounded-xl transition-all duration-300 font-sans text-sm overflow-hidden ${
        isChatSection ? 'md:w-[52px] group-hover/sidebar:md:w-[228px] w-[228px]' : 'w-auto'
      } ${
        isActive
          ? 'bg-blue-50/80 text-blue-700 font-bold shadow-[0_2px_12px_rgba(59,130,246,0.06)] dark:bg-prof-accent-blue-soft-bg dark:text-prof-accent-blue dark:shadow-none'
          : 'text-gray-700 font-medium hover:bg-blue-50/40 hover:text-blue-800 dark:text-prof-text-secondary dark:hover:bg-prof-bg-surface-hover dark:hover:text-prof-text-primary'
      }`}
    >
      <div className="shrink-0 w-5 flex items-center justify-center">
        <Icon size={20} strokeWidth={isActive ? 1.5 : 1.25} className={`transition-colors duration-300 ${isActive ? "text-blue-600 dark:text-prof-accent-blue" : "text-gray-600 group-hover/nav:text-blue-600 dark:text-prof-text-secondary dark:group-hover/nav:text-prof-text-primary"}`} />
      </div>
      <span className={`ml-3 flex-1 whitespace-nowrap transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover/sidebar:md:opacity-100' : 'opacity-100'}`}>{label}</span>
      {Number(badgeCount || 0) > 0 && (
        <span className={`bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm dark:bg-prof-accent-red whitespace-nowrap transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover/sidebar:md:opacity-100' : 'opacity-100'}`}>
          {badgeCount}
        </span>
      )}
    </NavLink>
  );
};

export const ProfessorLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Support hardware back button in PWA for full screen menu
  useEffect(() => {
    if (!isMobileOpen) return;
    window.history.pushState({ panel: 'prof_menu' }, '');
    const handlePopState = () => { setIsMobileOpen(false); };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.panel === 'prof_menu') window.history.back();
    };
  }, [isMobileOpen]);
  
  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const profile = useAuthStore((state) => state.profile);
  useNotifications(profile?.id);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const location = useLocation();
  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    // Role protection
    if (profile && profile.role !== 'professor' && profile.role !== 'admin') {
      navigate('/student/home');
    }
  }, [profile, navigate]);

  const firstName = getFirstName(profile?.name, 'Professor');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/professor/home', icon: Home, label: 'Home', exact: true },
    { to: '/professor/attendance', icon: ClipboardCheck, label: 'Attendance', exact: false },
    { to: '/professor/messages', icon: MessageCircle, label: 'Messages', exact: false },
    { to: '/professor/canteen', icon: UtensilsCrossed, label: 'Canteen', exact: false },
    { to: '/professor/print', icon: Printer, label: 'Print Shop', exact: false },
    { to: '/professor/societies', icon: Building2, label: 'Societies', exact: false },
    { to: '/professor/notices', icon: Megaphone, label: 'Notices', exact: true },
    { to: '/professor/notices/faculty', icon: Shield, label: 'Faculty Hub', exact: true },
    { to: '/professor/payments', icon: CreditCard, label: 'Payments', exact: false },
    { to: '/professor/alerts', icon: Bell, label: 'Alerts', exact: true, badgeCount: unreadCount },
    { to: '/professor/profile', icon: User, label: 'My Profile', exact: false },
  ];

  const mobileNavItems: Array<{
    to: string;
    icon: any;
    label: string;
    exact?: boolean;
    isMenu?: boolean;
    badgeCount?: number;
  }> = [
    { to: '/professor/home', icon: Home, label: 'Home', exact: true },
    { to: '/professor/attendance', icon: ClipboardCheck, label: 'Attendance', exact: false },
    { to: '/professor/notices', icon: Megaphone, label: 'Notices', exact: false },
    { to: '/professor/profile', icon: User, label: 'Profile', exact: false },
    { to: '#menu', icon: Menu, label: 'Menu', isMenu: true },
  ];

  const isChatSection = location.pathname.includes('/messages');

  const sidebarContent = (
    <div className="w-[260px] h-full flex flex-col justify-between shrink-0">
      {/* Logo */}
      <div className="h-20 flex items-center shrink-0 pt-2 pl-8 pr-4">
        <Link to="/professor/home" className="no-underline cursor-pointer block">
          <div className={`origin-left transition-transform duration-300 ${
            isChatSection ? 'md:scale-[0.45] group-hover/sidebar:md:scale-100' : 'scale-100'
          }`}>
            <Logo alt="Campus Blink" className="h-8 w-auto object-contain transition-transform hover:scale-105" />
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2 hide-scrollbar">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <ProfessorNavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              exact={item.exact}
              onNavigate={() => { setIsMobileOpen(false); if (item.to === '/professor/alerts') setNotificationPanelOpen(true); }}
              badgeCount={item.badgeCount}
            />
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="p-4 bg-white dark:bg-prof-bg-surface shrink-0 pb-6 border-t border-transparent dark:border-prof-border-subtle">
        <div className="flex items-center gap-3 mb-4 pl-3 pr-2">
          <div className="w-11 h-11 rounded-[1.1rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-prof-bg-surface-raised dark:to-prof-bg-surface-raised flex items-center justify-center text-blue-700 dark:text-prof-text-primary font-syne font-bold text-lg border border-blue-100/50 dark:border-prof-border-strong shadow-sm shrink-0">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover/sidebar:md:opacity-100' : 'opacity-100'}`}>
            <h4 className="font-sans font-bold text-sm text-gray-900 dark:text-prof-text-primary truncate tracking-tight whitespace-nowrap">Prof. {firstName}</h4>
            <span className="text-[11px] font-medium text-gray-500 dark:text-prof-text-secondary truncate block whitespace-nowrap">{profile?.email}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <NavLink
            to="/professor/settings"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) => `group/nav relative flex items-center py-2.5 px-4 mx-3 rounded-xl transition-all duration-300 font-sans text-sm overflow-hidden ${
              isChatSection ? 'md:w-[52px] group-hover/sidebar:md:w-[212px] w-[212px]' : 'w-[212px]'
            } ${
              isActive 
                ? 'bg-blue-50/80 text-blue-700 font-bold shadow-[0_2px_12px_rgba(59,130,246,0.06)] dark:bg-prof-accent-blue-soft-bg dark:text-prof-accent-blue dark:shadow-none' 
                : 'text-gray-700 font-medium hover:bg-blue-50/40 hover:text-blue-800 dark:text-prof-text-secondary dark:hover:bg-prof-bg-surface-hover dark:hover:text-prof-text-primary'
            }`}
          >
            <div className="shrink-0 w-5 flex items-center justify-center">
              <Settings size={18} strokeWidth={location.pathname === '/professor/settings' ? 1.5 : 1.25} className={`transition-colors duration-300 ${location.pathname === '/professor/settings' ? 'text-blue-600 dark:text-prof-accent-blue' : 'text-gray-600 group-hover/nav:text-blue-600 dark:text-prof-text-secondary dark:group-hover/nav:text-prof-text-primary'}`} />
            </div>
            <span className={`ml-3 text-sm flex-1 whitespace-nowrap transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover/sidebar:md:opacity-100' : 'opacity-100'}`}>Settings</span>
          </NavLink>
          
          <button onClick={handleLogout} className={`w-full group/nav relative flex items-center py-2.5 px-4 mx-3 rounded-xl text-red-500 dark:text-prof-accent-red hover:bg-red-50/60 dark:hover:bg-prof-accent-red/10 hover:text-red-600 dark:hover:text-prof-accent-red transition-all duration-300 overflow-hidden ${
            isChatSection ? 'md:w-[52px] group-hover/sidebar:md:w-[212px] w-[212px]' : 'w-[212px]'
          }`}>
            <div className="shrink-0 w-5 flex items-center justify-center">
              <LogOut size={18} strokeWidth={1.25} className="text-red-500 dark:text-prof-accent-red/80 group-hover/nav:text-red-600 dark:group-hover/nav:text-prof-accent-red transition-colors" />
            </div>
            <span className={`ml-3 text-sm font-bold flex-1 whitespace-nowrap text-left transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover/sidebar:md:opacity-100' : 'opacity-100'}`}>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );

  const mobileDrawerItems = [
    { to: '/professor/home', icon: Home, label: 'Home', exact: true },
    { to: '/professor/attendance', icon: ClipboardCheck, label: 'Attendance', exact: false },
    { to: '/professor/messages', icon: MessageCircle, label: 'Messages', exact: false },
    { to: '/professor/canteen', icon: UtensilsCrossed, label: 'Canteen', exact: false },
    { to: '/professor/print', icon: Printer, label: 'Print Shop', exact: false },
    { to: '/professor/societies', icon: Building2, label: 'Societies', exact: false },
    { to: '/professor/notices', icon: Megaphone, label: 'Notices', exact: true },
    { to: '/professor/notices/faculty', icon: Shield, label: 'Faculty Hub', exact: true },
    { to: '/professor/payments', icon: CreditCard, label: 'Payments', exact: false },
    { to: '/professor/alerts', icon: Bell, label: 'Alerts', exact: true, badgeCount: unreadCount },
    { to: '/professor/profile', icon: User, label: 'My Profile', exact: false },
  ];

  const mobileDrawerContent = (
    <div className="flex flex-col h-full bg-white dark:bg-prof-bg-surface font-sans text-gray-900 dark:text-prof-text-primary select-none overflow-hidden pt-[env(safe-area-inset-top,16px)] pb-[max(env(safe-area-inset-bottom,16px),16px)]">
      {/* Top Branding & Header */}
      <div className="px-6 pt-4 pb-5 border-b border-gray-100 dark:border-prof-border-subtle flex flex-col items-center relative shrink-0 bg-white dark:bg-prof-bg-surface">
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close Sidebar"
          className="absolute right-4 top-4 w-9 h-9 rounded-xl bg-gray-50 dark:bg-prof-bg-surface-raised hover:bg-gray-100 dark:hover:bg-prof-bg-surface-hover text-gray-600 dark:text-prof-text-secondary flex items-center justify-center transition-colors active:scale-95"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <Link
          to="/professor/home"
          onClick={() => setIsMobileOpen(false)}
          className="no-underline cursor-pointer block mt-1"
        >
          <Logo alt="Campus Blink" className="h-7 w-auto object-contain mx-auto" />
        </Link>

        {/* Upgraded Faculty Badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-prof-accent-blue-soft-bg text-blue-700 dark:text-prof-accent-blue text-xs font-bold font-syne tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-prof-accent-blue"></span>
          FACULTY PORTAL
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 hide-scrollbar bg-white dark:bg-prof-bg-surface">
        {mobileDrawerItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to) &&
              (item.to !== '/professor' ||
                location.pathname === '/professor' ||
                location.pathname === '/professor/home');

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (item.to === '/professor/alerts') {
                  e.preventDefault();
                  setNotificationPanelOpen(true);
                }
                setIsMobileOpen(false);
              }}
              className={`group relative flex items-center gap-3.5 min-h-[46px] py-3 px-4 rounded-2xl transition-all duration-200 font-sans text-sm select-none ${
                isActive
                  ? 'bg-blue-50/80 dark:bg-prof-accent-blue-soft-bg text-blue-700 dark:text-prof-accent-blue font-bold'
                  : 'text-gray-700 dark:text-prof-text-secondary font-medium hover:bg-gray-50 dark:hover:bg-prof-bg-surface-hover dark:hover:text-prof-text-primary active:bg-gray-100/80'
              }`}
            >
              <item.icon
                size={20}
                strokeWidth={isActive ? 1.75 : 1.35}
                className={`transition-colors duration-200 shrink-0 ${
                  isActive ? 'text-blue-600 dark:text-prof-accent-blue' : 'text-gray-500 dark:text-prof-text-tertiary group-hover:text-blue-600 dark:group-hover:text-prof-text-primary'
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {Number(item.badgeCount || 0) > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {item.badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Pinned Bottom Actions */}
      <div className="shrink-0 border-t border-gray-100 dark:border-prof-border-subtle p-4 bg-white dark:bg-prof-bg-surface">
        {/* User profile block */}
        <div className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded-2xl bg-gray-50 dark:bg-prof-bg-surface-raised border border-gray-100 dark:border-prof-border-subtle">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-prof-accent-blue-soft-bg flex items-center justify-center text-blue-700 dark:text-prof-accent-blue font-syne font-bold text-base border border-blue-100 dark:border-prof-border-subtle shrink-0">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-sans font-bold text-sm text-gray-900 dark:text-prof-text-primary truncate tracking-tight">Prof. {firstName}</h4>
            <span className="text-[11px] font-medium text-gray-500 dark:text-prof-text-secondary truncate block">{profile?.email}</span>
          </div>
        </div>

        {/* Settings button */}
        <NavLink
          to="/professor/settings"
          onClick={() => setIsMobileOpen(false)}
          className={({ isActive }) =>
            `group flex items-center gap-3.5 min-h-[44px] py-2.5 px-3.5 rounded-2xl transition-all duration-200 font-sans text-sm ${
              isActive
                ? 'bg-blue-50/80 dark:bg-prof-accent-blue-soft-bg text-blue-700 dark:text-prof-accent-blue font-bold'
                : 'text-gray-700 dark:text-prof-text-secondary font-medium hover:bg-gray-50 dark:hover:bg-prof-bg-surface-hover dark:hover:text-prof-text-primary active:bg-gray-100/80'
            }`
          }
        >
          <Settings
            size={19}
            strokeWidth={1.35}
            className="text-gray-500 dark:text-prof-text-tertiary group-hover:text-blue-600 dark:group-hover:text-prof-text-primary transition-colors shrink-0"
          />
          <span className="flex-1 truncate">Settings</span>
        </NavLink>

        {/* Sign out button */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full group flex items-center gap-3.5 min-h-[44px] py-2.5 px-3.5 mt-1 rounded-2xl bg-rose-50/60 dark:bg-prof-accent-red/10 hover:bg-rose-50 dark:hover:bg-prof-accent-red/20 text-rose-600 dark:text-prof-accent-red hover:text-rose-700 dark:hover:text-prof-accent-red font-sans text-sm font-bold transition-all duration-200 border border-rose-100/60 dark:border-prof-accent-red/20"
        >
          <LogOut
            size={19}
            strokeWidth={1.4}
            className="text-rose-500 dark:text-prof-accent-red/80 group-hover:text-rose-600 dark:group-hover:text-prof-accent-red transition-colors shrink-0"
          />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh bg-[#FAFAFA] dark:bg-prof-bg-base flex-col md:flex-row font-sans text-gray-900 dark:text-prof-text-primary transition-colors duration-200 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-white/95 dark:bg-prof-bg-surface/95 backdrop-blur-md border-b border-transparent dark:border-prof-border-subtle shadow-[0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-none sticky top-0 z-50 select-none">
        <Link to="/professor/home" className="no-underline cursor-pointer flex items-center gap-2">
          <Logo alt="Campus Blink" className="h-6 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-2.5">
          <ProfessorBadge size="sm" />
          <button
            type="button"
            onClick={() => setNotificationPanelOpen(true)}
            aria-label="Open Notifications & Alerts"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50/80 dark:bg-prof-bg-surface-raised text-gray-700 dark:text-prof-text-primary hover:bg-gray-100 dark:hover:bg-prof-bg-surface-hover active:scale-95 transition-all"
          >
            <Bell className="w-5 h-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Full-Screen Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden flex">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-full max-w-full h-full bg-white dark:bg-prof-bg-surface shadow-[20px_0_50px_rgba(0,0,0,0.08)] dark:shadow-2xl flex flex-col z-10 animate-slideRight">
            {mobileDrawerContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Full Height Left) */}
      <aside className={`hidden md:block fixed top-0 bottom-0 left-0 h-dvh bg-white dark:bg-prof-bg-surface border-r border-gray-100 dark:border-prof-border-subtle z-40 select-none transition-all duration-300 group/sidebar overflow-hidden ${
        isChatSection ? 'w-[88px] hover:w-[260px]' : 'w-[260px]'
      }`}>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col w-full h-full md:pt-0 overflow-hidden transition-all duration-300 ${isChatSection ? 'md:ml-[88px]' : 'md:ml-[260px]'}`}>
        <main className="flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6">
          <Outlet />
        </main>
      </div>

      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />
      <PushPermissionBanner />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-prof-bg-surface border-t border-transparent dark:border-prof-border-subtle shadow-[0_-4px_25px_rgba(0,0,0,0.05)] dark:shadow-none flex items-center justify-around h-[calc(66px+env(safe-area-inset-bottom,8px))] pb-[env(safe-area-inset-bottom,8px)] z-[60] select-none px-1">
        {mobileNavItems.map((item) => {
          const isActive = item.isMenu
            ? false
            : item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          if (item.isMenu) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full pt-1.5 focus:outline-hidden"
              >
                <div className="relative flex items-center justify-center px-3.5 py-1 rounded-2xl text-gray-400 dark:text-prof-text-tertiary hover:text-gray-600 dark:hover:text-prof-text-primary transition-all duration-300">
                  <item.icon size={21} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-medium tracking-tight text-gray-400 dark:text-prof-text-tertiary">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (item.to === '/professor/alerts') {
                  e.preventDefault();
                  setNotificationPanelOpen(true);
                }
                setIsMobileOpen(false);
              }}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full pt-1.5 focus:outline-hidden"
            >
              <div className={`relative flex items-center justify-center px-3.5 py-1 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-50/80 dark:bg-prof-accent-blue-soft-bg text-blue-600 dark:text-prof-accent-blue' : 'text-gray-400 dark:text-prof-text-tertiary'}`}>
                <item.icon size={21} strokeWidth={isActive ? 2 : 1.5} className="transition-transform duration-300" />
                {Number(item.badgeCount || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-prof-bg-surface"></span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight transition-colors ${isActive ? 'font-semibold text-blue-600 dark:text-prof-accent-blue' : 'font-medium text-gray-400 dark:text-prof-text-tertiary'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
