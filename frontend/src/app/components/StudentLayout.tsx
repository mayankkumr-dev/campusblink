import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Bell, Home, Menu, X, Search, Store, User, Users, Star, Settings, UtensilsCrossed, Printer, Building2, ClipboardCheck, MessageCircle, LogOut, ChevronRight, Bookmark, ShieldAlert, Sparkles } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Support hardware back button for mobile menu
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    window.history.pushState({ panel: 'student_menu' }, '');
    const handlePopState = () => { setIsMobileMenuOpen(false); };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.panel === 'student_menu') window.history.back();
    };
  }, [isMobileMenuOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    { icon: Users, path: '/student/community', label: 'Diaries', feature: 'community' },
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
    { icon: Users, path: '/student/community', label: 'Diaries', feature: 'community' },
    { icon: Store, path: '/student/campus-exchange', label: 'Exchange', feature: 'exchange' },
    { icon: Menu, label: 'Menu', feature: 'more', isMenu: true },
  ];

  return (
    <div className="flex h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden select-none no-touch-callout">
      {/* Refined Native Top Header */}
      <header className="safe-area-top safe-area-inline fixed top-0 z-50 flex h-13 w-full items-center justify-between border-b border-gray-100 bg-white/85 backdrop-blur-xl px-4 md:hidden shadow-2xs select-none">
        <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer flex items-center">
          <Logo loading="lazy" alt="Campus Blink" className="h-6 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotificationPanelOpen(true)}
            className="relative rounded-full p-2 text-slate-700 transition-colors hover:bg-gray-100 active:scale-95"
            aria-label="Open notifications"
          >
            <Bell size={19} strokeWidth={2} />
            {Number(unreadCount || 0) > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/student/profile')}
            className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-gray-50 active:scale-95 transition-transform"
            aria-label="Open profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400"><User size={15} /></div>
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

      {/* iOS Settings-Style Mobile Slide-Up Bottom Sheet / Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[70] md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-h-[85vh] bg-white rounded-t-[28px] shadow-[0_-16px_50px_rgba(0,0,0,0.15)] flex flex-col z-10 overflow-hidden border-t border-gray-100 pb-[env(safe-area-inset-bottom,16px)]"
            >
              {/* Drawer Handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />
              <div className="h-12 flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
                <span className="font-syne font-bold text-lg text-slate-900">Campus Blink Navigation</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-gray-100 active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans bg-gray-50/60">
                {/* Core Section */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">Core Hub</p>
                  <div className="bg-white rounded-2xl border border-gray-100/90 shadow-2xs divide-y divide-gray-100 overflow-hidden">
                    {[
                      { icon: Home, label: 'Dashboard Home', path: '/student/home', color: 'text-blue-600 bg-blue-50' },
                      { icon: Users, label: 'Campus Diaries & Stories', path: '/student/community', color: 'text-purple-600 bg-purple-50' },
                      { icon: Search, label: 'Search Campus Peers', path: '/student/search', color: 'text-teal-600 bg-teal-50' },
                    ].map((link, idx) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => { setIsMobileMenuOpen(false); navigate(link.path); }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${link.color}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{link.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Services Section */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">Campus Services</p>
                  <div className="bg-white rounded-2xl border border-gray-100/90 shadow-2xs divide-y divide-gray-100 overflow-hidden">
                    {[
                      { icon: Store, label: 'Campus Exchange (Marketplace)', path: '/student/campus-exchange', color: 'text-amber-600 bg-amber-50' },
                      { icon: UtensilsCrossed, label: 'Canteen Food Orders', path: '/student/canteen', color: 'text-orange-600 bg-orange-50' },
                      { icon: Printer, label: 'Print Shop Requests', path: '/student/print', color: 'text-cyan-600 bg-cyan-50' },
                      { icon: Building2, label: 'Societies & Clubs', path: '/student/societies', color: 'text-indigo-600 bg-indigo-50' },
                      { icon: MessageCircle, label: 'Direct Messages', path: '/student/messages', color: 'text-pink-600 bg-pink-50' },
                    ].map((link, idx) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => { setIsMobileMenuOpen(false); navigate(link.path); }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${link.color}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{link.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Account & Settings Section */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">Account & Preferences</p>
                  <div className="bg-white rounded-2xl border border-gray-100/90 shadow-2xs divide-y divide-gray-100 overflow-hidden">
                    {[
                      { icon: User, label: 'My Student Profile', path: '/student/profile', color: 'text-slate-700 bg-slate-100' },
                      { icon: Bookmark, label: 'Saved Bookmarks', path: '/student/bookmarks', color: 'text-violet-600 bg-violet-50' },
                      { icon: Bell, label: 'Alerts & Notifications', path: '/student/notifications', color: 'text-rose-600 bg-rose-50' },
                      { icon: Settings, label: 'Account Settings', path: '/student/settings', color: 'text-slate-700 bg-slate-100' },
                    ].map((link, idx) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => { setIsMobileMenuOpen(false); navigate(link.path); }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${link.color}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{link.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logout Action */}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); useAuthStore.getState().logout(); navigate('/'); }}
                  className="w-full mt-2 bg-rose-50 border border-rose-200/60 rounded-2xl p-3.5 flex items-center justify-center gap-2 text-rose-600 font-bold text-sm shadow-2xs active:scale-[0.98] transition-transform"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out of Campus Blink
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content + Header + Bottom Nav Wrapper */}
      <div className={`flex-1 flex flex-col w-full h-full overflow-hidden bg-[var(--bg-primary)] ${isChatSection ? 'md:pl-[92px]' : 'md:pl-[260px]'}`}>
        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto w-full pt-[52px] md:pt-0 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
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
        </main>

        {/* Floating Pill-Shaped Glassmorphism Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 rounded-full bg-white/85 backdrop-blur-xl border border-white/60 shadow-[0_12px_36px_rgba(0,0,0,0.09)] px-2 py-2 flex items-center justify-around select-none">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isMenu ? false : location.pathname.startsWith(item.path || '');

            if (item.isMenu) {
              return (
                <button
                  key={item.label}
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all px-3 py-1 rounded-full text-slate-500 hover:text-slate-900 active:scale-90"
                >
                  <Icon size={20} className="text-slate-500" />
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.path || '/student/home'}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all px-3 py-1 rounded-full active:scale-90 ${isActive ? 'text-blue-600 bg-blue-50/80' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
                <span className="leading-none">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>



      {/* Instagram-style Search Slide Panel */}
      <SearchSlidePanel isOpen={searchPanelOpen} onClose={() => setSearchPanelOpen(false)} />
      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />
      <PushPermissionBanner />
    </div>
  );
};
