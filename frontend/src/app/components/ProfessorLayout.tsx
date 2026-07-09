import React, { useState, useEffect } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { Home, UtensilsCrossed, Printer, CreditCard, Menu, LogOut, User, Building2, Bell } from 'lucide-react';
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
      className={`flex items-center gap-[10px] h-[40px] px-[14px] mx-[8px] my-[2px] rounded-md transition-colors font-sans text-[14px] font-medium ${
        isActive
          ? 'bg-[#FEF9C3] text-[var(--yellow-dark)] font-semibold'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon size={18} className={isActive ? "text-[var(--yellow-dark)]" : "text-[var(--text-muted)]"} />
      {label}
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
      navigate('/student');
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
    { to: '/professor/payments', icon: CreditCard, label: 'Payments', exact: false },
    { to: '/professor/alerts', icon: Bell, label: 'Alerts', exact: true, badgeCount: unreadCount },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border-r border-black/10 text-[var(--text-primary)] overflow-hidden">
      {/* Logo */}
      <div className="h-[60px] border-b border-black/10 flex items-center px-4 shrink-0 overflow-hidden">
        <Link to="/professor/home" className="no-underline cursor-pointer">
          <ThemeAwareLogo alt="Campus Blink" className="h-24 w-auto object-contain" />
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 px-2">
        <div className="mb-4 px-4">
          <ProfessorBadge size="md" />
        </div>
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
        <div className="mt-4">
          <ProfessorNavItem
            to="/professor/profile"
            icon={User}
            label="Profile"
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>
      </div>

      {/* Profile */}
      <div className="p-4 border-t border-black/10 shrink-0 bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-md bg-[#FEF9C3] flex items-center justify-center text-[var(--yellow-dark)] font-syne font-bold text-sm border border-[#F59E0B]/30">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="font-sans font-bold text-sm text-[var(--text-primary)] truncate">Prof. {firstName}</h4>
            <span className="text-[10px] text-[var(--text-secondary)] truncate block">{profile?.email}</span>
          </div>
        </div>
        <NavLink
          to="/professor/settings/notifications"
          className="mb-3 flex items-center gap-[10px] h-[36px] px-[12px] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Bell size={16} className="text-[var(--text-muted)]" />
          <span className="text-[14px] font-medium">Notification Settings</span>
        </NavLink>
        <button onClick={handleLogout} className="w-full flex items-center gap-[10px] h-[36px] px-[12px] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <LogOut size={16} className="text-[var(--text-muted)]" />
          <span className="text-[14px] font-medium">Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] flex flex-col md:flex-row font-sans text-[var(--text-primary)]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-[var(--bg)] border-b border-black/10 sticky top-0 z-50 safe-area-top select-none">
        <Link to="/professor/home" className="no-underline cursor-pointer">
          <div className="h-14 overflow-hidden flex items-center">
            <ThemeAwareLogo alt="Campus Blink" className="h-24 w-auto object-contain" />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ProfessorBadge size="sm" />
          <button onClick={() => setIsMobileOpen(true)} className="p-2 text-[var(--text-primary)]">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[300px]">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[240px] fixed top-0 bottom-0 left-0 z-40 select-none">
        {sidebarContent}
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-dvh bg-[var(--bg-primary)]">
        <main className="flex-1 p-4 md:p-8 safe-area-bottom">
          <Outlet />
        </main>
      </div>

      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />
      <PushPermissionBanner />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg)] border-t border-black/10 flex items-center justify-around h-16 z-40 safe-area-bottom select-none">
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
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
            >
              <div className="relative">
                <item.icon size={20} className={isActive ? 'text-[var(--yellow-dark)]' : 'text-[var(--text-muted)]'} />
                {Number(item.badgeCount || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC2626] border border-white"></span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-[var(--yellow-dark)]' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
