import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Bell, Home, MoreHorizontal, Search, Store, User, Users, Star, Settings, UtensilsCrossed, Printer, Building2, ClipboardCheck, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useNotifications, useMyOrderStatus } from '../../hooks/useRealtime';
import { getActiveAnnouncementForUser } from '../../api/announcements';
import { SearchSlidePanel } from './SearchBar';
import { AlertSlidePanel } from './AlertSlidePanel';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { Logo } from './ui/Logo';
import { FeatureErrorBoundary } from '../../shared/components/FeatureErrorBoundary';
import { DashboardSidebar } from './DashboardSidebar';
import { PushPermissionBanner } from './PushPermissionBanner';

function getFeatureKeyFromPath(pathname: string) {
  if (pathname.startsWith('/student/search')) return 'search';
  if (pathname.startsWith('/student/campus-exchange') || pathname.startsWith('/student/marketplace') || pathname.startsWith('/student/buy-sell') || pathname.startsWith('/student/buy-and-sell') || pathname.startsWith('/student/roommate') || pathname.startsWith('/student/wishlist')) return 'exchange';
  if (pathname.startsWith('/student/messages')) return 'messages';
  if (pathname.startsWith('/student/canteen')) return 'canteen';
  if (pathname.startsWith('/student/print')) return 'print';
  if (pathname.startsWith('/student/community')) return 'community';
  if (pathname.startsWith('/student/societies')) return 'societies';
  if (pathname.startsWith('/student/notifications')) return 'alerts';
  if (pathname.startsWith('/student/profile')) return 'profile';
  return 'home';
}

export const StudentLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const [activeAnnouncement, setActiveAnnouncement] = useState<any | null>(null);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const { disabledFeatures } = useFeatureAccess(profile);

  useNotifications(profile?.id);
  useMyOrderStatus(profile?.id);

  const isChatSection = location.pathname.startsWith('/student/messages');
  const currentFeatureKey = getFeatureKeyFromPath(location.pathname);
  const currentFeatureDisabled = disabledFeatures.includes(currentFeatureKey);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    const loadAnnouncement = async () => {
      const { data } = await getActiveAnnouncementForUser(profile.id);
      if (!mounted) return;
      if (!data) {
        setActiveAnnouncement(null);
        return;
      }
      const hasVisibleText = [data.title, data.content].some((value) => String(value || '').trim().length > 0);
      if (!hasVisibleText) {
        setActiveAnnouncement(null);
        return;
      }
      const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncementIds') || '[]');
      if (Array.isArray(dismissed) && dismissed.includes(data.id)) {
        setActiveAnnouncement(null);
        return;
      }
      setActiveAnnouncement(data);
    };
    loadAnnouncement();
    return () => { mounted = false; };
  }, [profile?.id]);

  const dismissAnnouncement = () => {
    if (!activeAnnouncement?.id) return;
    const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncementIds') || '[]');
    const next = Array.isArray(dismissed) ? Array.from(new Set([...dismissed, activeAnnouncement.id])) : [activeAnnouncement.id];
    localStorage.setItem('dismissedAnnouncementIds', JSON.stringify(next));
    setActiveAnnouncement(null);
  };

  const navItems = [
    { icon: Home, path: '/student/home', label: 'Home', feature: 'home' },
    { icon: Search, path: '/student/search', label: 'Search People', feature: 'search' },
    { icon: Users, path: '/student/community', label: 'Community', feature: 'community' },
    { icon: Store, path: '/student/campus-exchange', label: 'Campus Exchange', feature: 'exchange' },
    { icon: MessageCircle, path: '/student/messages', label: 'Messages', feature: 'messages' },
    { icon: UtensilsCrossed, path: '/student/canteen', label: 'Canteen', feature: 'canteen' },
    { icon: Printer, path: '/student/print', label: 'Print', feature: 'print' },
    { icon: Building2, path: '/student/societies', label: 'Societies', feature: 'societies' },
    { icon: Bell, path: '/student/notifications', label: 'Alerts', feature: 'alerts', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: User, path: '/student/profile', label: 'Profile', feature: 'profile' },
  ];

  const visibleNavItems = navItems.filter((item) => !disabledFeatures.includes(item.feature));
  const fallbackNavPath = visibleNavItems[0]?.path || '/student/settings';
  const bottomNavItems = [
    { icon: Home, path: '/student/home', label: 'Home', feature: 'home' },
    { icon: Search, path: '/student/search', label: 'Search', feature: 'search' },
    { icon: Users, path: '/student/community', label: 'Community', feature: 'community' },
    { icon: Store, path: '/student/campus-exchange', label: 'Exchange', feature: 'exchange' },
    { icon: MoreHorizontal, path: '/student/more', label: 'More', feature: 'more' },
  ];

  return (
    <div className="flex h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden select-none no-touch-callout">
      {/* Fixed Top App Bar */}
      <header className="safe-area-top safe-area-inline fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-black/10 bg-[var(--bg)] px-4 md:hidden select-none">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
          <div className="h-16 overflow-hidden flex items-center">
            <Logo loading="lazy" alt="Campus Blink" className="h-7 w-auto object-contain" />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotificationPanelOpen(true)}
            className="relative rounded-full p-2 text-[var(--text-primary)] transition-colors hover:bg-black/5"
            aria-label="Open notifications"
          >
            <Bell size={20} strokeWidth={2} />
            {Number(unreadCount || 0) > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#DC2626]" />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/student/profile')}
            className="h-10 w-10 overflow-hidden rounded-full border border-black/10 bg-[var(--bg-secondary)]"
            aria-label="Open profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]"><User size={18} /></div>
            )}
          </button>
        </div>
      </header>

      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <DashboardSidebar
          profile={profile}
          unreadCount={unreadCount}
          onOpenSearch={() => setSearchPanelOpen(true)}
          onOpenAlerts={() => setNotificationPanelOpen(true)}
          isChatSection={isChatSection}
        />
      </div>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col w-full h-full pt-[60px] md:pt-0 overflow-hidden bg-[var(--bg-primary)] ${isChatSection ? 'md:pl-[92px]' : 'md:pl-[260px]'}`}>
        {/* Scrollable main content */}
        <div className="flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {activeAnnouncement && (
          <div className="m-6 rounded-lg px-4 py-4 border border-[var(--border)] bg-[var(--bg-primary)] shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
               <div>
                  <h4 className="font-syne font-bold text-[var(--text-primary)] text-[16px]">{activeAnnouncement.title}</h4>
                  <p className="font-sans text-[var(--text-secondary)] text-[14px] mt-1">{activeAnnouncement.content}</p>
               </div>
               <button onClick={dismissAnnouncement} className="btn-secondary">Dismiss</button>
            </div>
          </div>
        )}
        <div className="w-full h-full">
          {currentFeatureDisabled ? (
            <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-12">
              <div className="w-full max-w-xl rounded-[28px] border border-black/10 bg-[var(--bg)] p-8 text-center shadow-[0_16px_40px_rgba(13,13,13,0.08)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--yellow-light)] text-[var(--yellow-dark)]">
                  <Star className="h-7 w-7" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--yellow-dark)]">Access limited</p>
                <h2 className="mt-3 font-syne text-3xl font-extrabold text-[var(--text-primary)]">This section is turned off for your account.</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">An admin has disabled this feature for your profile. Contact the admin team if you need access restored.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <NavLink to={fallbackNavPath} className="rounded-md bg-[var(--text-primary)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]">Open available section</NavLink>
                  <NavLink to="/student/settings" className="rounded-md border border-black/10 bg-[var(--bg-primary)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">Settings</NavLink>
                </div>
              </div>
            </div>
          ) : (
            <FeatureErrorBoundary featureName="Student Section">
              <Outlet />
            </FeatureErrorBoundary>
          )}
        </div>
        </div>
      </main>

      {/* Fixed Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-[calc(5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] w-full grid-cols-5 border-t border-black/10 bg-white px-1 md:hidden select-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path || '');

          return (
            <NavLink
              key={item.label}
              to={item.path || '/student/home'}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
            >
              <Icon size={20} className={isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} />
              <span className="leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>



      {/* Instagram-style Search Slide Panel */}
      <SearchSlidePanel isOpen={searchPanelOpen} onClose={() => setSearchPanelOpen(false)} />
      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />
      <PushPermissionBanner />
    </div>
  );
};
