import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Bell,
  BookOpen,
  Library,
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
// SearchOverlay removed
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

  if (pathname.startsWith('/student/canteen')) return 'canteen';
  if (pathname.startsWith('/student/print')) return 'print';
  if (pathname.startsWith('/student/notes')) return 'notes';
  if (pathname.startsWith('/student/community')) return 'community';

  if (pathname.startsWith('/student/notifications')) return 'alerts';
  if (pathname.startsWith('/student/profile')) return 'profile';
  return 'home';
}

function getMobileHeaderTitle(pathname: string) {
  if (pathname.startsWith('/student/community')) return 'Diaries';

  if (pathname.startsWith('/student/search')) return 'Search';
  if (pathname.startsWith('/student/canteen')) return 'Canteen';
  if (pathname.startsWith('/student/print')) return 'Print';
  if (pathname.startsWith('/student/notes')) return 'Notes';

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

  const isChatSection = false;
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

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehaviorY = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.overscrollBehaviorY = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehaviorY = '';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { icon: Home, path: '/student/home', label: 'Home', feature: 'home' },
    { icon: Search, path: '/student/search', label: 'Search People', feature: 'search' },
    { icon: BookOpen, path: '/student/community', label: 'Diaries', feature: 'community' },
    { icon: Store, path: '/student/campus-exchange', label: 'Campus Exchange', feature: 'exchange' },

    { icon: UtensilsCrossed, path: '/student/canteen', label: 'Canteen', feature: 'canteen' },
    { icon: Printer, path: '/student/print', label: 'Print', feature: 'print' },
    { icon: Library, path: '/student/notes', label: 'Notes', feature: 'notes' },

    { icon: Bell, path: '/student/notifications', label: 'Alerts', feature: 'alerts', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: User, path: '/student/profile', label: 'Profile', feature: 'profile' },
  ];

  const visibleNavItems = navItems.filter((item) => !disabledFeatures.includes(item.feature));
  const fallbackNavPath = visibleNavItems[0]?.path || '/student/settings';
  const bottomNavItems: TabBarItem[] = [
    { key: 'home', icon: Home, path: '/student/home', label: 'Home', exact: true },
    { key: 'notes', icon: Library, path: '/student/notes', label: 'Notes' },
    { key: 'community', icon: BookOpen, path: '/student/community', label: 'Diaries' },
    { key: 'notices', icon: Megaphone, path: '/student/notices', label: 'Notices' },
    { key: 'menu', icon: Menu, label: 'Menu', isMenu: true, hasDot: unreadCount > 0 },
  ];

  const isDiaryOpen = location.pathname.includes('/post/') || window.location.search.includes('diaryId') || location.pathname.endsWith('/create');

  return (
    /* Root shell */
    <div className="relative min-h-screen w-full bg-gray-50 pb-24 select-none no-touch-callout" style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}>
      {/* ── Global Nav (top header) ──────────────────────────────────────────
          DESIGN.md: global-nav — bg #000000, height 44px, text #ffffff, 12px/400/-0.12px
          Visible only on mobile (md:hidden), never on desktop (sidebar replaces it)
      */}
      {!isDiaryOpen && (
        <header
          className="safe-area-top safe-area-inline fixed top-0 z-50 flex w-full items-center justify-between px-4 md:hidden select-none bg-white/80 backdrop-blur-xl border-b border-gray-100"
          style={{
            height: 'calc(44px + env(safe-area-inset-top, 0px))',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          {/* Left: Logo or page title */}
          {(() => {
            const title = getMobileHeaderTitle(location.pathname);
            return title ? (
              <Link to={location.pathname} className="no-underline cursor-pointer flex items-center min-h-[44px] justify-start">
                {/* tagline token: 21px/600/0.231px — white on black nav */}
                <h1
                  className="capitalize text-gray-900"
                  style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', fontSize: '21px', fontWeight: 600, letterSpacing: '0.231px', lineHeight: 1.19 }}
                >
                  {title}
                </h1>
              </Link>
            ) : (
              <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer flex items-center min-h-[44px] min-w-[44px] justify-start">
                <Logo loading="lazy" alt="Campus Blink" className="h-6 w-auto object-contain" />
              </Link>
            );
          })()}

          {/* Right: icon action buttons — button-icon-circular spec: 44×44px */}
          <div className="flex items-center gap-0.5">
            {location.pathname === '/student/home' && (
              <button
                type="button"
                onClick={() => navigate('/student/search-people')}
                className="flex items-center justify-center rounded-full transition-colors active:scale-95 text-gray-900"
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
                aria-label="Search"
              >
                <Search size={20} strokeWidth={2} />
              </button>
            )}

            {/* Notification bell */}
            <button
              type="button"
              onClick={() => navigate('/student/notifications')}
              className="relative flex items-center justify-center rounded-full transition-colors active:scale-95 text-gray-900"
              style={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
              aria-label="Open notifications"
            >
              <Bell size={20} strokeWidth={2} />
              {Number(unreadCount || 0) > 0 && (
                /* Notification badge — rose-500 is a functional signal, not a brand accent */
                <span className="absolute right-1.5 top-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-black">
                  {Number(unreadCount) > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile avatar */}
            <button
              type="button"
              onClick={() => navigate('/student/profile')}
              className="overflow-hidden rounded-full transition-transform active:scale-95 flex items-center justify-center ml-1 border border-gray-200 bg-gray-50 text-gray-900"
              style={{ width: 32, height: 32, minWidth: 44, minHeight: 44 }}
              aria-label="Open profile"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="profile" className="h-full w-full object-cover rounded-full" style={{ width: 32, height: 32 }} />
              ) : (
                <div className="flex items-center justify-center text-gray-900"><User size={16} /></div>
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
          onOpenAlerts={undefined}
          isChatSection={isChatSection}
        />
      </div>

      {/* ── Mobile Slide-Up Bottom Sheet / Drawer ──────────────────────────
          DESIGN.md: bg #ffffff, rounded-t-[22px], hairline border-t (#e0e0e0)
          No box-shadow on chrome — depth comes from backdrop blur + color change.
      */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[70] md:hidden flex flex-col justify-end">
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sheet */}
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
              className="relative w-full max-h-[85vh] flex flex-col z-10 overflow-hidden overscroll-y-none"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '22px 22px 0 0',
                borderTop: '1px solid #e0e0e0',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                touchAction: 'pan-x pan-y',
              }}
            >
              {/* Drawer handle pill */}
              <div
                className="mx-auto mt-3 mb-1 shrink-0 rounded-full"
                style={{ width: 36, height: 5, backgroundColor: '#d2d2d7' }}
              />

              {/* Drawer header row */}
              <div
                className="h-12 flex items-center justify-between px-5 shrink-0"
                style={{ borderBottom: '1px solid #e0e0e0' }}
              >
                {/* body-strong token: 17px/600/-0.374px */}
                <span style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px' }}>
                  More Services &amp; Settings
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-full active:scale-95 transition-transform"
                  style={{ width: 28, height: 28, backgroundColor: '#f5f5f7', color: '#7a7a7a' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable drawer body */}
              <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-4" style={{ backgroundColor: '#f5f5f7' }}>

                {/* Campus Services section */}
                <div>
                  {/* caption-strong: 14px/600/-0.224px */}
                  <p
                    className="px-1 mb-2"
                    style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px', lineHeight: 1.29, textTransform: 'uppercase' }}
                  >
                    Campus Services
                  </p>

                  {/* store-utility-card style: bg #ffffff, border hairline #e0e0e0, rounded-[18px], no shadow */}
                  <div
                    className="overflow-hidden"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18 }}
                  >
                    {([
                      { icon: Layout, label: 'Campus Notices', path: '/student/notices' },
                      { icon: Store, label: 'Campus Exchange Market', path: '/student/campus-exchange' },
                      { icon: UtensilsCrossed, label: 'Canteen Food Orders', path: '/student/canteen' },
                      { icon: Printer, label: 'Print Shop Requests', path: '/student/print' },
                      { icon: Library, label: 'Study Notes & Materials', path: '/student/notes' },
                    ] as { icon: any; label: string; path: string; badge?: string }[]).map((link, idx, arr) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => menuCloseAndNavigate(link.path)}
                          className="w-full flex items-center justify-between px-4 active:bg-[#f5f5f7] transition-colors text-left"
                          style={{
                            paddingTop: 14,
                            paddingBottom: 14,
                            borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {/* rounded.sm: 8px icon container, canvas-parchment bg */}
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f5f5f7', color: '#1d1d1f' }}
                            >
                              <IconComp className="w-4 h-4" />
                            </div>
                            {/* body: 17px/400/-0.374px */}
                            <span style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 400, letterSpacing: '-0.374px' }}>
                              {link.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {link.badge ? (
                              <span className="bg-rose-500 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-full">
                                {link.badge}
                              </span>
                            ) : null}
                            <ChevronRight className="w-4 h-4" style={{ color: '#d2d2d7' }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Account & Settings section */}
                <div>
                  <p
                    className="px-1 mb-2"
                    style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px', lineHeight: 1.29, textTransform: 'uppercase' }}
                  >
                    Account &amp; Settings
                  </p>

                  <div
                    className="overflow-hidden"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18 }}
                  >
                    {[
                      { icon: Settings, label: 'Settings', path: '/student/settings' },
                      { icon: Bell, label: 'Notifications', path: '/student/notifications', badge: unreadCount > 0 ? unreadCount : undefined },
                      { icon: Bookmark, label: 'Help & Feedback', path: '/student/settings/feedback' },
                    ].map((link, idx, arr) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => menuCloseAndNavigate(link.path)}
                          className="w-full flex items-center justify-between px-4 active:bg-[#f5f5f7] transition-colors text-left"
                          style={{
                            paddingTop: 12,
                            paddingBottom: 12,
                            borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f5f5f7', color: '#7a7a7a' }}
                            >
                              <IconComp className="w-4 h-4" />
                            </div>
                            {/* caption: 14px/400/-0.224px */}
                            <span style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 400, letterSpacing: '-0.224px' }}>
                              {link.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {link.badge && link.label === 'Notifications' ? (
                              <span className="bg-rose-500 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-full">
                                {link.badge}
                              </span>
                            ) : null}
                            <ChevronRight className="w-4 h-4" style={{ color: '#d2d2d7' }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sign Out — destructive action, red is functional not a brand accent */}
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); useAuthStore.getState().logout(); navigate('/'); }}
                    className="w-full mt-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    style={{
                      backgroundColor: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: 18,
                      padding: '14px 0',
                      color: '#e11d48',
                      fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: '-0.224px',
                    }}
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

      {/* ── Main Content ──────────────────────────────── */}
      <main
        className={`w-full ${isChatSection ? 'md:pl-[92px]' : 'md:pl-[260px]'}`}
        style={{ paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))' }}
      >
          {/* Announcement banner — flat surface, hairline border, no shadow */}
          {activeAnnouncement && (
            <div
              className="m-6 px-4 py-4"
              style={{ borderRadius: 11, border: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  {/* body-strong: 17px/600/-0.374px */}
                  <h4 style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 600, letterSpacing: '-0.374px', lineHeight: 1.24 }}>
                    {activeAnnouncement.title}
                  </h4>
                  {/* body: 17px/400/-0.374px */}
                  <p className="mt-1" style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 400, letterSpacing: '-0.374px', lineHeight: 1.47 }}>
                    {activeAnnouncement.content}
                  </p>
                </div>
                {/* button-pearl-capsule: bg #fafafc, text #333333, rounded-[11px], caption 14px */}
                <button
                  onClick={dismissAnnouncement}
                  className="shrink-0 transition-transform active:scale-95"
                  style={{
                    backgroundColor: '#fafafc',
                    border: '3px solid #f0f0f0',
                    borderRadius: 11,
                    padding: '8px 14px',
                    color: '#333333',
                    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                    fontSize: 14,
                    fontWeight: 400,
                    letterSpacing: '-0.224px',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="w-full h-full">
            {currentFeatureDisabled ? (
              /* Feature-disabled state — flat card, no shadow per DESIGN.md */
              <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-12">
                <div
                  className="w-full max-w-xl p-8 text-center"
                  style={{ borderRadius: 18, border: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}
                >
                  <div
                    className="mx-auto mb-4 flex items-center justify-center rounded-full"
                    style={{ width: 64, height: 64, backgroundColor: '#fef9c3', color: '#92400e' }}
                  >
                    <Star className="h-7 w-7" />
                  </div>
                  {/* caption-strong */}
                  <p style={{ color: '#b45309', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px', textTransform: 'uppercase' }}>
                    Access limited
                  </p>
                  {/* display-md: 34px/600/-0.374px */}
                  <h2 className="mt-3" style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 34, fontWeight: 600, letterSpacing: '-0.374px', lineHeight: 1.47 }}>
                    This section is turned off for your account.
                  </h2>
                  {/* body: 17px/400/-0.374px */}
                  <p className="mt-3" style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 400, letterSpacing: '-0.374px', lineHeight: 1.47 }}>
                    An admin has disabled this feature for your profile. Contact the admin team if you need access restored.
                  </p>
                  {/* CTA buttons */}
                  <div className="mt-6 flex justify-center gap-3">
                    {/* button-primary: bg #0066cc, text #fff, rounded-pill, 11px×22px padding */}
                    <NavLink
                      to={fallbackNavPath}
                      className="transition-transform active:scale-95"
                      style={{
                        backgroundColor: '#0066cc',
                        color: '#ffffff',
                        borderRadius: 9999,
                        padding: '11px 22px',
                        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        fontSize: 17,
                        fontWeight: 400,
                        letterSpacing: '-0.374px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Open available section
                    </NavLink>
                    {/* button-secondary-pill: transparent bg, #0066cc text, 1px #0066cc border, pill */}
                    <NavLink
                      to="/student/settings"
                      className="transition-transform active:scale-95"
                      style={{
                        backgroundColor: 'transparent',
                        color: '#0066cc',
                        border: '1px solid #0066cc',
                        borderRadius: 9999,
                        padding: '11px 22px',
                        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        fontSize: 17,
                        fontWeight: 400,
                        letterSpacing: '-0.374px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Settings
                    </NavLink>
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

        {/* Flush Native Bottom Navigation Bar */}
        {!isMobileMenuOpen && (
          <BottomTabBar items={bottomNavItems} onMenuClick={() => setIsMobileMenuOpen(true)} />
        )}

      {/* SearchOverlay removed */}
      <AlertSlidePanel isOpen={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)} />
      <PushPermissionBanner />
    </div>
  );
};
