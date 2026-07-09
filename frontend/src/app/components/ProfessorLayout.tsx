import React, { useState, useEffect } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { Home, UtensilsCrossed, Printer, CreditCard, Menu, LogOut, User, Building2, Bell, Megaphone, Shield, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { ProfessorBadge } from './ProfessorBadge';
import { AlertSlidePanel } from './AlertSlidePanel';
import { PushPermissionBanner } from './PushPermissionBanner';
import { useNotificationStore } from '../../store/notificationStore';
import { useNotifications } from '../../hooks/useRealtime';
import { ThemeAwareLogo } from './ThemeAwareLogo';

const ProfessorNavItem = ({ to, icon: Icon, label, exact = false, onNavigate, badgeCount }: { to: string, icon: any, label: string, exact?: boolean, onNavigate: () => void, badgeCount?: number }) => {
  const location = useLocation();
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
      className={`group relative flex items-center gap-3 py-3 px-4 mx-3 my-1.5 rounded-2xl transition-all duration-300 font-sans text-sm ${
        isActive
          ? 'bg-blue-50/80 text-blue-700 font-bold shadow-[0_2px_12px_rgba(59,130,246,0.06)] dark:bg-prof-accent-blue-soft-bg dark:text-prof-accent-blue dark:shadow-none'
          : 'text-gray-500 font-medium hover:bg-blue-50/40 hover:text-blue-700 dark:text-prof-text-secondary dark:hover:bg-prof-bg-surface-hover dark:hover:text-prof-text-primary'
      }`}
    >
      <Icon size={20} strokeWidth={isActive ? 1.5 : 1.25} className={`transition-colors duration-300 ${isActive ? "text-blue-600 dark:text-prof-accent-blue" : "text-gray-400 group-hover:text-blue-500 dark:text-prof-text-secondary dark:group-hover:text-prof-text-primary"}`} />
      <span className="flex-1">{label}</span>
      {Number(badgeCount || 0) > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm dark:bg-prof-accent-red">
          {badgeCount}
        </span>
      )}
    </NavLink>
  );
};

export const ProfessorLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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
    { to: '/professor/canteen', icon: UtensilsCrossed, label: 'Canteen', exact: false },
    { to: '/professor/print', icon: Printer, label: 'Print Shop', exact: false },
    { to: '/professor/societies', icon: Building2, label: 'Societies', exact: false },
    { to: '/professor/notices', icon: Megaphone, label: 'Notices', exact: true },
    { to: '/professor/notices/faculty', icon: Shield, label: 'Faculty Hub', exact: true },
    { to: '/professor/payments', icon: CreditCard, label: 'Payments', exact: false },
    { to: '/professor/alerts', icon: Bell, label: 'Alerts', exact: true, badgeCount: unreadCount },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-prof-bg-surface dark:border-r dark:border-prof-border-subtle rounded-3xl dark:rounded-none shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
      {/* Logo */}
      <div className="h-20 flex items-center justify-center shrink-0 pt-2">
        <Link to="/professor/home" className="no-underline cursor-pointer block transform hover:scale-105 transition-transform">
          <ThemeAwareLogo alt="Campus Blink" className="h-28 w-auto object-contain" />
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 hide-scrollbar">
        <div className="mb-6 px-6 flex justify-center">
          <ProfessorBadge size="md" />
        </div>
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
          <div className="mt-8 pt-4 mx-2">
            <ProfessorNavItem
              to="/professor/profile"
              icon={User}
              label="My Profile"
              onNavigate={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="p-5 bg-white dark:bg-prof-bg-surface shrink-0 pb-6 border-t border-transparent dark:border-prof-border-subtle">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-11 h-11 rounded-[1.1rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-prof-bg-surface-raised dark:to-prof-bg-surface-raised flex items-center justify-center text-blue-700 dark:text-prof-text-primary font-syne font-bold text-lg border border-blue-100/50 dark:border-prof-border-strong shadow-sm shrink-0">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-sans font-bold text-sm text-gray-900 dark:text-prof-text-primary truncate tracking-tight">Prof. {firstName}</h4>
            <span className="text-[11px] font-medium text-gray-500 dark:text-prof-text-secondary truncate block">{profile?.email}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <NavLink
            to="/professor/settings/notifications"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) => `group flex items-center gap-3 py-2.5 px-4 mx-1 rounded-2xl transition-all duration-300 ${
              isActive 
                ? 'bg-blue-50/80 text-blue-700 font-bold shadow-[0_2px_12px_rgba(59,130,246,0.06)] dark:bg-prof-accent-blue-soft-bg dark:text-prof-accent-blue dark:shadow-none' 
                : 'text-gray-500 font-medium hover:bg-blue-50/40 hover:text-blue-700 dark:text-prof-text-secondary dark:hover:bg-prof-bg-surface-hover dark:hover:text-prof-text-primary'
            }`}
          >
            <Settings size={18} strokeWidth={location.pathname === '/professor/settings/notifications' ? 1.5 : 1.25} className={`transition-colors duration-300 ${location.pathname === '/professor/settings/notifications' ? 'text-blue-600 dark:text-prof-accent-blue' : 'text-gray-400 group-hover:text-blue-500 dark:text-prof-text-secondary dark:group-hover:text-prof-text-primary'}`} />
            <span className="text-sm">Settings</span>
          </NavLink>
          
          <button onClick={handleLogout} className="w-full group flex items-center gap-3 py-2.5 px-4 mx-1 rounded-2xl text-red-500 dark:text-prof-accent-red hover:bg-red-50/60 dark:hover:bg-prof-accent-red/10 hover:text-red-600 dark:hover:text-prof-accent-red transition-all duration-300">
            <LogOut size={18} strokeWidth={1.25} className="text-red-400 dark:text-prof-accent-red/80 group-hover:text-red-500 dark:group-hover:text-prof-accent-red transition-colors" />
            <span className="text-sm font-bold">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#FAFAFA] dark:bg-prof-bg-base flex flex-col md:flex-row font-sans text-gray-900 dark:text-prof-text-primary">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-16 px-5 bg-white dark:bg-prof-bg-surface dark:border-b dark:border-prof-border-subtle shadow-sm dark:shadow-none sticky top-0 z-50 safe-area-top select-none">
        <Link to="/professor/home" className="no-underline cursor-pointer">
          <div className="h-14 overflow-hidden flex items-center pt-1">
            <ThemeAwareLogo alt="Campus Blink" className="h-24 w-auto object-contain" />
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <ProfessorBadge size="sm" />
          <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-prof-bg-surface-hover text-gray-700 dark:text-prof-text-primary transition-colors">
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute top-4 left-4 bottom-4 w-[280px]">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Floating Architectural Panel) */}
      <div className="hidden md:block w-[280px] fixed top-4 bottom-4 left-4 z-40 select-none">
        {sidebarContent}
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-[304px] flex flex-col min-h-dvh">
        <main className="flex-1 safe-area-bottom">
          <Outlet />
        </main>
      </div>

      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />
      <PushPermissionBanner />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-prof-bg-surface/90 backdrop-blur-md border-t border-gray-100 dark:border-prof-border-subtle shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-none flex items-center justify-around h-[72px] z-40 safe-area-bottom select-none pb-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
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
              className="flex flex-col items-center justify-center gap-1.5 flex-1 h-full pt-2"
            >
              <div className="relative">
                <item.icon size={22} strokeWidth={isActive ? 2 : 1.25} className={`transition-transform duration-300 ${isActive ? 'text-blue-600 dark:text-prof-accent-blue scale-110' : 'text-gray-400 dark:text-prof-text-secondary'}`} />
                {Number(item.badgeCount || 0) > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 dark:bg-prof-accent-red opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 dark:bg-prof-accent-red border-2 border-white dark:border-prof-bg-surface"></span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-wide transition-colors ${isActive ? 'text-blue-700 dark:text-prof-accent-blue' : 'text-gray-400 dark:text-prof-text-secondary'}`}>
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
