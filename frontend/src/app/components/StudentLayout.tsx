import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  Home,
  LogOut,
  Menu,
  Layout,
  MessageCircle,
  Printer,
  Search,
  ShoppingBag,
  Store,
  User,
  UtensilsCrossed,
  X,
  Star,
  Settings,
  Users,
  Bookmark,
  ShieldAlert,
  Sparkles,
  ClipboardCheck,
  ChevronRight,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useNotifications, useMyOrderStatus } from '../../hooks/useRealtime';
import { getActiveAnnouncementForUser } from '../../api/announcements';
import { SearchOverlay } from './SearchOverlay';
import { AlertSlidePanel } from './AlertSlidePanel';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { Logo } from './ui/Logo';
import { FeatureErrorBoundary } from '../../shared/components/FeatureErrorBoundary';
import { DashboardSidebar } from './DashboardSidebar';
import { PushPermissionBanner } from './PushPermissionBanner';
import { BottomTabBar, TabBarItem } from '../../shared/components/BottomTabBar';

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

function getMobileHeaderTitle(pathname: string) {
  if (pathname.startsWith('/student/community')) return 'Diaries';
  if (pathname.startsWith('/student/messages')) return 'Messages';
  if (pathname.startsWith('/student/search')) return 'Search';
  if (pathname.startsWith('/student/canteen')) return 'Canteen';
  if (pathname.startsWith('/student/print')) return 'Print';
  if (pathname.startsWith('/student/societies')) return 'Societies';
  if (pathname.startsWith('/student/notices')) return 'Notices';
  if (pathname.startsWith('/student/campus-exchange') || pathname.startsWith('/student/marketplace') || pathname.startsWith('/student/buy-sell') || pathname.startsWith('/student/buy-and-sell')) return 'Marketplace';
  return null;
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

  const menuCloseAndNavigate = (path: string) => {
    setIsMobileMenuOpen(false);
    if (window.history.state?.panel === 'student_menu') {
      window.history.back();
    }
    setTimeout(() => {
      navigate(path);
    }, 10);
  };

  // Support hardware back button for mobile menu
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    window.history.pushState({ panel: 'student_menu' }, '');
    const handlePopState = () => { setIsMobileMenuOpen(false); };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobileMenuOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Support hardware back button for search overlay
  useEffect(() => {
    if (!searchPanelOpen) return;
    window.history.pushState({ panel: 'search_overlay' }, '');
    const handlePopState = () => { setSearchPanelOpen(false); };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [searchPanelOpen]);

  const closeSearchPanel = () => {
    setSearchPanelOpen(false);
    if (window.history.state?.panel === 'search_overlay') {
      window.history.back();
    }
  };

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
    { icon: BookOpen, path: '/student/community', label: 'Diaries', feature: 'community' },
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
  const bottomNavItems: TabBarItem[] = [
    { key: 'home', icon: Home, path: '/student/home', label: 'Home', exact: true },
    { key: 'messages', icon: MessageCircle, path: '/student/messages', label: 'Chat' },
    { key: 'community', icon: BookOpen, path: '/student/community', label: 'Diaries' },
    { key: 'notices', icon: Megaphone, path: '/student/notices', label: 'Notices' },
    { key: 'menu', icon: Menu, label: 'Menu', isMenu: true, hasDot: unreadCount > 0 },
  ];

  const isDiaryOpen = location.pathname.includes('/post/') || window.location.search.includes('diaryId') || location.pathname.endsWith('/create');

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-[#101113] text-gray-900 dark:text-white font-sans overflow-hidden select-none no-touch-callout transition-colors">
      {/* Refined Native Top Header */}
      {!isDiaryOpen && (
      <header className="safe-area-top safe-area-inline fixed top-0 z-50 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] w-full items-center justify-between border-b border-gray-100 dark:border-slate-800 bg-white/95 dark:bg-[#101113]/95 backdrop-blur-md px-4 md:hidden shadow-2xs select-none transition-colors">
        {(() => {
          const title = getMobileHeaderTitle(location.pathname);
          return title ? (
            <Link to={location.pathname} className="no-underline cursor-pointer flex items-center min-h-[44px] justify-start">
              <h1 className="font-syne font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white capitalize">{title}</h1>
            </Link>
          ) : (
            <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer flex items-center min-h-[44px] min-w-[44px] justify-start">
              <Logo loading="lazy" alt="Campus Blink" className="h-6 w-auto object-contain" />
            </Link>
          );
        })()}
        <div className="flex items-center gap-1 sm:gap-2">
          {location.pathname === '/student/home' && (
            <button
              type="button"
              onClick={() => setSearchPanelOpen(true)}
              className="relative rounded-full p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 transition-colors hover:bg-gray-100 active:scale-[0.97]"
              aria-label="Search"
            >
              <Search size={20} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotificationPanelOpen(true)}
            className="relative rounded-full p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 transition-colors hover:bg-gray-100 active:scale-[0.97]"
            aria-label="Open notifications"
          >
            <Bell size={20} strokeWidth={2} />
            {Number(unreadCount || 0) > 0 && (
              <span className="absolute right-1.5 top-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white shadow-xs">
                {Number(unreadCount) > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/student/profile')}
            className="h-9 w-9 min-h-[44px] min-w-[44px] overflow-hidden rounded-full border border-gray-200 bg-gray-50 active:scale-[0.97] transition-transform flex items-center justify-center ml-1"
            aria-label="Open profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400"><User size={16} /></div>
            )}
          </button>
        </div>
      </header>
      )}

      {/* Desktop Sidebar Container (Strictly md:block) */}
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
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setIsMobileMenuOpen(false);
                }
              }}
              className="relative w-full max-h-[85vh] bg-white rounded-t-[28px] shadow-[0_-16px_50px_rgba(0,0,0,0.15)] flex flex-col z-10 overflow-hidden border-t border-gray-100 pb-[env(safe-area-inset-bottom,16px)]"
            >
              {/* Drawer Handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />
              <div className="h-12 flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
                <span className="font-syne font-bold text-lg text-slate-900">More Services & Settings</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-gray-100 active:scale-95 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans bg-gray-50/60">
                {/* Campus Services Section */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">Campus Services</p>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs divide-y divide-gray-100 overflow-hidden">
                    {([
                      { icon: Layout, label: 'Campus Notices', path: '/student/notices' },

                      { icon: Store, label: 'Campus Exchange Market', path: '/student/campus-exchange' },
                      { icon: UtensilsCrossed, label: 'Canteen Food Orders', path: '/student/canteen' },
                      { icon: Printer, label: 'Print Shop Requests', path: '/student/print' },
                      { icon: Building2, label: 'Societies & Clubs', path: '/student/societies' },
                    ] as { icon: any; label: string; path: string; badge?: string }[]).map((link, idx) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => menuCloseAndNavigate(link.path)}
                          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-slate-700">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{link.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {link.badge ? (
                              <span className="bg-rose-500 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-full">
                                {link.badge}
                              </span>
                            ) : null}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-gray-200/80 my-1" />

                {/* Quieter Account & Settings Footer Group */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">Account & Settings</p>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs divide-y divide-gray-100 overflow-hidden">
                    {[
                      { icon: Settings, label: 'Settings', path: '/student/settings' },
                      { icon: Bell, label: 'Notifications', path: '/student/notifications', badge: unreadCount > 0 ? unreadCount : undefined },
                      { icon: Bookmark, label: 'Help & Feedback', path: '/student/settings/feedback' },
                    ].map((link, idx) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => menuCloseAndNavigate(link.path)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-slate-500">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{link.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {link.badge && link.label === 'Notifications' ? (
                              <span className="bg-rose-500 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-full">
                                {link.badge}
                              </span>
                            ) : null}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); useAuthStore.getState().logout(); navigate('/'); }}
                    className="w-full mt-3 bg-rose-50/80 border border-rose-200/60 rounded-2xl p-3.5 flex items-center justify-center gap-2 text-rose-600 font-bold text-sm shadow-2xs active:scale-[0.98] transition-all hover:bg-rose-100/80"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out of Campus Blink
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content + Header + Bottom Nav Wrapper */}
      <div className={`flex-1 flex flex-col w-full h-full overflow-hidden bg-gray-50 dark:bg-[#101113] text-slate-900 dark:text-slate-100 transition-colors ${isChatSection ? 'md:pl-[92px]' : 'md:pl-[260px]'}`}>
        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto w-full pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-0 pb-32 md:pb-8">
          {activeAnnouncement && (
            <div className="m-6 rounded-lg px-4 py-4 border border-[var(--border)] bg-white shadow-soft">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                 <div>
                    <h4 className="font-syne font-bold text-gray-900 text-[16px]">{activeAnnouncement.title}</h4>
                    <p className="font-sans text-gray-600 text-[14px] mt-1">{activeAnnouncement.content}</p>
                 </div>
                 <button onClick={dismissAnnouncement} className="btn-secondary">Dismiss</button>
              </div>
            </div>
          )}
          <div className="w-full h-full">
            {currentFeatureDisabled ? (
              <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-12">
                <div className="w-full max-w-xl rounded-[28px] border border-black/10 bg-white p-8 text-center shadow-[0_16px_40px_rgba(13,13,13,0.08)]">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Star className="h-7 w-7" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Access limited</p>
                  <h2 className="mt-3 font-syne text-3xl font-extrabold text-gray-900">This section is turned off for your account.</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600">An admin has disabled this feature for your profile. Contact the admin team if you need access restored.</p>
                  <div className="mt-6 flex justify-center gap-3">
                    <NavLink to={fallbackNavPath} className="rounded-md bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-amber-500 hover:text-white">Open available section</NavLink>
                    <NavLink to="/student/settings" className="rounded-md border border-black/10 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100">Settings</NavLink>
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

        {/* Flush Native Bottom Navigation Bar (direct sibling below main) */}
        <BottomTabBar items={bottomNavItems} onMenuClick={() => setIsMobileMenuOpen(true)} />
      </div>



      {/* Search Overlay */}
      <SearchOverlay isOpen={searchPanelOpen} onClose={closeSearchPanel} />
      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />
      <PushPermissionBanner />
    </div>
  );
};
