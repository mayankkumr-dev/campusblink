import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Logo } from './ui/Logo';
import {
  Home,
  Search,
  Users,
  BookOpen,
  Store,
  Coffee,
  Printer,
  Building2,
  Bell,
  User,
  Settings,
  ChevronRight,
  Sparkles,
  Newspaper,
  Sun,
  Moon,
  Monitor,
  ClipboardCheck,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from 'next-themes';

export interface DashboardSidebarProps {
  profile?: {
    name?: string;
    username?: string;
    avatar_url?: string;
    campus_credits?: number;
    college?: string;
  } | null;
  unreadCount?: number;
  onOpenSearch?: () => void;
  onOpenAlerts?: () => void;
  isChatSection?: boolean;
  isMobileMenu?: boolean;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  profile,
  unreadCount = 0,
  onOpenSearch,
  onOpenAlerts,
  isChatSection = false,
  isMobileMenu = false,
}) => {
  const location = useLocation();
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4" style={{ color: '#0066cc' }} />;
    return <Moon className="w-4 h-4" style={{ color: '#0066cc' }} />;
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light Mode';
    return 'Dark Mode';
  };


  // Fetch unread notice count on mount and when profile loads
  useEffect(() => {
    const fetchCount = async () => {
      if (!profile?.college) return;
      const lastSeen = localStorage.getItem('campus_blink_notices_last_seen');
      if (!lastSeen) {
        setUnreadNoticeCount(0);
        return;
      }
      const { count } = await supabase
        .from('official_notices')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .gt('created_at', lastSeen);
      setUnreadNoticeCount(Math.min(count || 0, 99));
    };

    fetchCount();

    // Reset badge when user visits notices page
    const handleSeen = () => setUnreadNoticeCount(0);
    window.addEventListener('notices-seen', handleSeen);
    return () => window.removeEventListener('notices-seen', handleSeen);
  }, [profile?.college]);


  const navItems = [
    {
      label: 'Home',
      path: '/student/home',
      icon: Home,
      action: undefined,
    },
    {
      label: 'Search People',
      path: '/student/search-people',
      icon: Search,
    },
    {
      label: 'Diaries',
      path: '/student/community',
      icon: BookOpen,
      action: undefined,
    },

    {
      label: 'Campus Exchange',
      path: '/student/campus-exchange',
      icon: Store,
      action: undefined,
    },
    {
      label: 'Canteen',
      path: '/student/canteen',
      icon: Coffee,
      action: undefined,
    },
    {
      label: 'Print',
      path: '/student/print',
      icon: Printer,
      action: undefined,
    },

    {
      label: 'Notices',
      path: '/student/notices',
      icon: Newspaper,
      badge: unreadNoticeCount > 0 ? unreadNoticeCount : undefined,
      action: undefined,
    },
    {
      label: 'Alerts',
      path: '/student/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      action: onOpenAlerts,
    },
    {
      label: 'Profile',
      path: '/student/profile',
      icon: User,
      action: undefined,
    },
    {
      label: 'Settings',
      path: '/student/settings',
      icon: Settings,
      action: undefined,
    },
  ];

  const displayName = profile?.name || 'Campus Student';
  const displayCollege = profile?.college || 'Verified Campus Member';

  return (
    /*
     * DESIGN.md: sidebar is sub-nav-frosted equivalent on desktop.
     * bg #ffffff (canvas), border-r hairline #e0e0e0, no shadows.
     * Width collapses to icon-only (88px) in chat section, hovers to full (260px).
     */
    <aside
      className={`${isMobileMenu ? 'w-full h-full static flex-1' : 'group fixed top-0 left-0 h-dvh z-[40]'} select-none transition-all duration-300 overflow-hidden ${
        !isMobileMenu && isChatSection ? 'w-[260px] md:w-[88px] hover:md:w-[260px]' : (!isMobileMenu ? 'w-[260px]' : '')
      }`}
      style={{
        backgroundColor: '#ffffff',
        borderRight: isMobileMenu ? 'none' : '1px solid #e0e0e0',
      }}
    >
      <div className={`${isMobileMenu ? 'w-full' : 'w-[260px]'} h-full flex flex-col justify-between`}>

        {/* ── Top: Branding & User Profile ────────────────────────────────── */}
        <div
          className="flex flex-col px-4 pt-5 pb-4 space-y-4 shrink-0"
          style={{ borderBottom: '1px solid #e0e0e0' }}
        >
          {/* Campus Blink Logo */}
          <div className="flex items-center justify-between">
            <NavLink to="/student/home" className="flex items-center gap-2.5 no-underline py-1 pl-1">
              <div
                className={`origin-left transition-transform duration-300 ${
                  isChatSection ? 'md:scale-[0.45] group-hover:md:scale-100' : 'scale-100'
                }`}
              >
                <Logo
                  alt="Campus Blink"
                  className="object-contain h-8 w-auto transition-transform duration-300"
                />
              </div>
            </NavLink>
          </div>

          {/*
           * User Profile Card — store-utility-card style:
           * bg canvas-parchment #f5f5f7, border hairline #e0e0e0, rounded-[18px], no shadow
           */}
          <div
            className={`flex items-center gap-3 transition-all duration-300 cursor-default overflow-hidden ${
              !isMobileMenu && isChatSection ? 'md:w-[56px] group-hover:md:w-full w-full' : 'w-full'
            }`}
            style={{
              backgroundColor: '#f5f5f7',
              border: '1px solid #e0e0e0',
              borderRadius: 18,
              padding: '8px',
            }}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover"
                  style={{ border: '1px solid #e0e0e0' }}
                />
              ) : (
                /* Placeholder: Action Blue soft bg */
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: 'rgba(0,102,204,0.1)', color: '#0066cc', border: '1px solid rgba(0,102,204,0.15)' }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online indicator — accent-green functional dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ backgroundColor: '#10B981', borderColor: '#f5f5f7' }} />
            </div>

            {/* Name + college */}
            <div
              className={`min-w-0 flex-1 whitespace-nowrap transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover:md:opacity-100' : 'opacity-100'}`}
            >
              {/* caption-strong: 14px/600/-0.224px */}
              <p
                className="truncate leading-tight"
                style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 600, letterSpacing: '-0.224px' }}
              >
                {displayName}
              </p>
              {/* fine-print / nav-link: 12px/400/-0.12px */}
              <p
                className="truncate mt-0.5"
                style={{ color: '#7a7a7a', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 400, letterSpacing: '-0.12px' }}
              >
                {displayCollege}
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation Links ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 hide-scrollbar">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            const baseStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: 9,
              fontSize: 14,
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              fontWeight: isActive ? 600 : 400,
              letterSpacing: '-0.224px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              textDecoration: 'none',
              width: '100%',
              // Active: Action Blue soft bg + Action Blue text
              // Inactive: transparent, ink-muted-48 text
              backgroundColor: isActive ? 'rgba(0,102,204,0.09)' : 'transparent',
              color: isActive ? '#0066cc' : '#7a7a7a',
            };

            const widthClass = !isMobileMenu && isChatSection
              ? 'md:w-[48px] group-hover:md:w-full w-full'
              : 'w-full';

            const content = (
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <IconComponent
                    size={20}
                    strokeWidth={isActive ? 2 : 1.6}
                    style={{ color: isActive ? '#0066cc' : '#7a7a7a', transition: 'color 0.2s ease' }}
                  />
                  {(item as any).badge !== undefined && (
                    /* Notification badge — rose-500 functional signal */
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {(item as any).badge}
                    </span>
                  )}
                </div>
                <span
                  className={`truncate whitespace-nowrap transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover:md:opacity-100' : 'opacity-100'}`}
                >
                  {item.label}
                </span>
              </div>
            );

            if (item.action) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={`${widthClass} active:scale-95`}
                  style={baseStyle}
                >
                  {content}
                </button>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`${widthClass} active:scale-95`}
                style={baseStyle}
              >
                {content}
              </NavLink>
            );
          })}
        </div>

        {/* ── Bottom Footer: Theme Toggle ──────────────────────────────────── */}
        <div
          className="p-4 shrink-0"
          style={{ borderTop: '1px solid #e0e0e0' }}
        >
          {/*
           * button-dark-utility style adapted: bg canvas-parchment, text ink,
           * rounded.sm (8px), caption 14px/400/-0.224px
           */}
          <button
            onClick={cycleTheme}
            className={`flex items-center justify-start gap-3 transition-all duration-300 overflow-hidden whitespace-nowrap active:scale-95 ${
              isChatSection ? 'md:w-[42px] group-hover:md:w-full w-full' : 'w-full'
            }`}
            style={{
              backgroundColor: '#f5f5f7',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <div className="shrink-0 flex items-center justify-center">
              {getThemeIcon()}
            </div>
            <span
              className={`text-xs font-semibold transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover:md:opacity-100' : 'opacity-100'}`}
              style={{ color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 400, letterSpacing: '-0.224px' }}
            >
              {getThemeLabel()}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};
