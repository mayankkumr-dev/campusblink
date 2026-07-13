import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { NavLink, useLocation } from 'react-router';
import { Logo } from './ui/Logo';
import {
  Home,
  Search,
  Users,
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
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  profile,
  unreadCount = 0,
  onOpenSearch,
  onOpenAlerts,
  isChatSection = false,
}) => {
  const location = useLocation();
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

  const { theme, setTheme } = useTheme();
  
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4 text-accent-blue" />;
    return <Moon className="w-4 h-4 text-accent-blue" />;
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
      path: '/student/search',
      icon: Search,
      action: onOpenSearch,
    },
    {
      label: 'Community',
      path: '/student/community',
      icon: Users,
      action: undefined,
    },
    {
      label: 'Messages',
      path: '/student/messages',
      icon: MessageCircle,
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
      label: 'Societies',
      path: '/student/societies',
      icon: Building2,
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
    <aside
      className={`group fixed top-0 left-0 h-dvh bg-surface border-r border-border-subtle z-[40] select-none transition-all duration-300 overflow-hidden ${
        isChatSection ? 'w-[260px] md:w-[88px] hover:md:w-[260px]' : 'w-[260px]'
      }`}
    >
      <div className="w-[260px] h-full flex flex-col justify-between">
        {/* Top Section: Branding & User Profile Container */}
        <div className="flex flex-col border-b border-border-subtle px-4 pt-5 pb-4 space-y-4 shrink-0">
          {/* Campus Blink Logo */}
        <div className="flex items-center justify-between">
          <NavLink to="/student/home" className="flex items-center gap-2.5 no-underline group/logo py-1 pl-1">
            <div className={`origin-left transition-transform duration-300 ${
              isChatSection ? 'md:scale-[0.45] group-hover:md:scale-100' : 'scale-100'
            }`}>
              <Logo
                alt="Campus Blink"
                className="object-contain h-8 w-auto transition-transform duration-300 group-hover/logo:scale-105"
              />
            </div>
          </NavLink>
        </div>

          {/* User Profile Container Card */}
          <div className={`bg-surface border border-border-subtle rounded-2xl p-2 flex items-center gap-3 transition-all duration-300 hover:bg-surface-elevated cursor-default overflow-hidden ${
            isChatSection ? 'md:w-[56px] group-hover:md:w-full w-full' : 'w-full'
          }`}>
            <div className="relative shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover border border-border-subtle"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent-blue-soft border border-accent-blue-soft flex items-center justify-center text-accent-blue font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-green border-2 border-surface rounded-full" />
            </div>

            <div className={`min-w-0 flex-1 whitespace-nowrap transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover:md:opacity-100' : 'opacity-100'}`}>
              <p className="font-syne font-bold text-sm text-text-primary truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-text-secondary truncate mt-0.5">
                {displayCollege}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 hide-scrollbar">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            const className = `flex items-center px-3.5 py-2.5 rounded-xl text-sm transition-all duration-300 group/nav overflow-hidden ${
              isChatSection ? 'md:w-[48px] group-hover:md:w-full w-full' : 'w-full'
            } ${
              isActive
                ? 'bg-accent-blue-soft text-accent-blue font-semibold shadow-2xs'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary font-medium'
            }`;
            
            const content = (
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <IconComponent
                    size={20}
                    strokeWidth={isActive ? 2 : 1.6}
                    className={isActive ? 'text-accent-blue' : 'text-text-secondary/70 group-hover/nav:text-text-primary transition-colors'}
                  />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`truncate whitespace-nowrap transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover:md:opacity-100' : 'opacity-100'}`}>
                  {item.label}
                </span>
              </div>
            );

            if (item.action) {
              return (
                <button key={item.label} type="button" onClick={item.action} className={className}>
                  {content}
                </button>
              );
            }

            return (
              <NavLink key={item.label} to={item.path} className={className}>
                {content}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Footer Area */}
        <div className="p-4 border-t border-border-subtle shrink-0">
          <button 
            onClick={cycleTheme}
            className={`bg-surface-elevated hover:bg-bg-hover rounded-xl p-3 border border-border-subtle flex items-center justify-start gap-3 transition-all duration-300 overflow-hidden whitespace-nowrap ${
              isChatSection ? 'md:w-[42px] group-hover:md:w-full w-full' : 'w-full'
            }`}
          >
            <div className="shrink-0 flex items-center justify-center">
              {getThemeIcon()}
            </div>
            <span className={`text-xs font-semibold text-text-primary transition-opacity duration-300 ${isChatSection ? 'opacity-100 md:opacity-0 group-hover:md:opacity-100' : 'opacity-100'}`}>
              {getThemeLabel()}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};
