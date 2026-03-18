import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Home, Store, Coffee, Printer, Users, User, Bell, Settings, Menu, X, Star, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useNotifications, useMyOrderStatus } from '../../hooks/useRealtime';
import { getActiveAnnouncementForUser } from '../../api/announcements';
import { SearchSlidePanel } from './SearchBar';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import campusBlinkLogo from '../../../logo/logo.png';

function getFeatureKeyFromPath(pathname: string) {
  if (pathname.startsWith('/student/search')) return 'search';
  if (pathname.startsWith('/student/campus-exchange') || pathname.startsWith('/student/campus-excahnge') || pathname.startsWith('/student/marketplace') || pathname.startsWith('/student/buy-sell') || pathname.startsWith('/student/buy-and-sell') || pathname.startsWith('/student/roommate') || pathname.startsWith('/student/campus-exchange/messages') || pathname.startsWith('/student/wishlist')) return 'exchange';
  if (pathname.startsWith('/student/canteen')) return 'canteen';
  if (pathname.startsWith('/student/print')) return 'print';
  if (pathname.startsWith('/student/community')) return 'community';
  if (pathname.startsWith('/student/notifications')) return 'alerts';
  if (pathname.startsWith('/student/profile')) return 'profile';
  return 'home';
}

export const StudentLayout: React.FC = () => {
  const location = useLocation();
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const [activeAnnouncement, setActiveAnnouncement] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const { disabledFeatures } = useFeatureAccess(profile);

  useNotifications(profile?.id);
  useMyOrderStatus(profile?.id);

  const isChatSection = location.pathname.startsWith('/student/campus-exchange/messages');
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
    { icon: Store, path: '/student/campus-exchange', label: 'Campus Excahnge', feature: 'exchange' },
    { icon: Coffee, path: '/student/canteen', label: 'Canteen', feature: 'canteen' },
    { icon: Printer, path: '/student/print', label: 'Print', feature: 'print' },
    { icon: Users, path: '/student/community', label: 'Community', feature: 'community' },
    { icon: Bell, path: '/student/notifications', label: 'Alerts', feature: 'alerts', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: User, path: '/student/profile', label: 'Profile', feature: 'profile' },
  ];

  const visibleNavItems = navItems.filter((item) => !disabledFeatures.includes(item.feature));
  const fallbackNavPath = visibleNavItems[0]?.path || '/student/settings';

  return (
    <div className="flex h-dvh bg-[#FAFAF8] text-[#0D0D0D] font-sans overflow-hidden">
      
      {/* Mobile Top Navbar */}
      <div className="safe-area-top safe-area-inline md:hidden fixed top-0 w-full h-[60px] bg-[#FFFFFF] border-b border-[#E8E8E8] z-50 flex items-center justify-between px-4 gap-2">
        <div className="flex items-center">
          <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
            <img src={campusBlinkLogo} alt="Campus Blink" className="h-11 w-auto object-contain" />
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-[#0D0D0D]">
            <Menu size={24} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Desktop + Mobile Drawer */}
      <nav className={`fixed top-0 left-0 h-dvh bg-[#FFFFFF] border-r border-[#E8E8E8] z-[70] flex flex-col transition-[transform,width] duration-200 ${isChatSection ? 'w-[260px] md:w-[92px]' : 'w-[260px]'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        <div className="h-[70px] border-b border-[#E8E8E8] flex items-center justify-between px-4 shrink-0">
          <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
            <img src={campusBlinkLogo} alt="Campus Blink" className={`w-auto object-contain transition-all duration-200 ${isChatSection ? 'h-16 md:h-12' : 'h-16'}`} />
          </Link>
          <button className="md:hidden text-[#9B9B9B] hover:text-[#0D0D0D]" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className={`py-[20px] px-4 pb-[8px] ${isChatSection ? 'hidden md:block' : ''}`}>
          <span className={`font-sans font-bold text-[12px] text-[#9B9B9B] uppercase tracking-[1px] ${isChatSection ? 'md:hidden' : ''}`}>Main Navigation</span>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto w-full hide-scrollbar">
          {visibleNavItems.map((item) => {
            const isSearchItem = item.feature === 'search';
            const isActive = isSearchItem ? searchPanelOpen : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            const isProfileItem = item.path === '/student/profile';

            if (isSearchItem) {
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); setSearchPanelOpen(true); }}
                  className={`flex items-center h-[48px] mx-[8px] my-[2px] rounded-md transition-colors duration-150 w-[calc(100%-16px)] ${isChatSection ? 'gap-[12px] px-[14px] md:justify-center md:px-0' : 'gap-[12px] px-[14px]'} ${isActive ? 'bg-[#FEFCE8] text-[#0D0D0D] font-bold' : 'text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]'}`}
                >
                  <Icon size={20} className={isActive ? 'text-[#CA8A04]' : 'text-[#9B9B9B]'} />
                  <span className={`text-[16px] leading-none mb-[-1px] font-bold whitespace-nowrap ${isChatSection ? 'md:hidden' : ''}`}>{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center h-[48px] mx-[8px] my-[2px] rounded-md transition-colors duration-150 ${isChatSection ? 'gap-[12px] px-[14px] md:justify-center md:px-0' : 'gap-[12px] px-[14px]'} ${isActive ? 'bg-[#FEFCE8] text-[#0D0D0D] font-bold' : 'text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]'}`}
              >
                <div className="relative">
                  {isProfileItem && profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="profile" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <Icon size={20} className={isActive ? 'text-[#CA8A04]' : 'text-[#9B9B9B]'} />
                  )}
                  {Number(item.badge || 0) > 0 && (
                     <span className="absolute -top-[4px] -right-[4px] h-[6px] w-[6px] rounded-full bg-[#DC2626]" />
                  )}
                </div>
                <span className={`text-[16px] leading-none mb-[-1px] font-bold whitespace-nowrap ${isChatSection ? 'md:hidden' : ''} ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
        
        {/* User Info Bottom */}
        <div className="mt-auto border-t border-[#E8E8E8] p-4 shrink-0">
           <NavLink to="/student/settings" onClick={() => setMobileMenuOpen(false)} className={`w-full flex items-center gap-[12px] h-[48px] px-[14px] rounded-md transition-colors duration-150 ${isChatSection ? 'md:justify-center md:px-0' : ''} ${location.pathname.startsWith('/student/settings') ? 'bg-[#FEFCE8] text-[#0D0D0D] font-bold' : 'text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]'}`}>
             <Settings size={18} className={location.pathname.startsWith('/student/settings') ? 'text-[#CA8A04]' : 'text-[#9B9B9B]'} />
             <span className={`text-[16px] leading-none mb-[-1px] font-bold whitespace-nowrap ${isChatSection ? 'md:hidden' : ''}`}>Settings</span>
           </NavLink>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col w-full h-full pt-[60px] md:pt-0 overflow-hidden bg-[#FAFAF8] ${isChatSection ? 'md:pl-[92px]' : 'md:pl-[260px]'}`}>
        {/* Scrollable main content */}
        <div className="flex-1 overflow-y-auto">
        {activeAnnouncement && (
          <div className="m-6 rounded-lg px-4 py-4 border border-[#E8E8E8] bg-[#FFFFFF] shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
               <div>
                  <h4 className="font-syne font-bold text-[#0D0D0D] text-[16px]">{activeAnnouncement.title}</h4>
                  <p className="font-sans text-[#6B6B6B] text-[14px] mt-1">{activeAnnouncement.content}</p>
               </div>
               <button onClick={dismissAnnouncement} className="btn-secondary">Dismiss</button>
            </div>
          </div>
        )}
        <div className="w-full h-full">
          {currentFeatureDisabled ? (
            <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-12">
              <div className="w-full max-w-xl rounded-[28px] border border-black/10 bg-white p-8 text-center shadow-[0_16px_40px_rgba(13,13,13,0.08)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF8D4] text-[#CA8A04]">
                  <Star className="h-7 w-7" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#CA8A04]">Access limited</p>
                <h2 className="mt-3 font-syne text-3xl font-extrabold text-[#0D0D0D]">This section is turned off for your account.</h2>
                <p className="mt-3 text-sm leading-6 text-[#6B6B6B]">An admin has disabled this feature for your profile. Contact the admin team if you need access restored.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <NavLink to={fallbackNavPath} className="rounded-md bg-[#0D0D0D] px-5 py-3 text-sm font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D]">Open available section</NavLink>
                  <NavLink to="/student/settings" className="rounded-md border border-black/10 bg-[#FAFAF8] px-5 py-3 text-sm font-bold text-[#0D0D0D] hover:bg-[#F2F0EB]">Settings</NavLink>
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
        </div>
      </main>

      {/* Instagram-style Search Slide Panel */}
      <SearchSlidePanel isOpen={searchPanelOpen} onClose={() => setSearchPanelOpen(false)} />
    </div>
  );
};
