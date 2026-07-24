import React, { useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

export interface TabBarItem {
  key: string;
  icon: React.ElementType;
  label: string;
  path?: string;
  exact?: boolean;
  isMenu?: boolean;
  hasDot?: boolean;
  onClick?: () => void;
}

export interface BottomTabBarProps {
  items: TabBarItem[];
  onMenuClick?: () => void;
}

/**
 * Shared floating pill bottom tab bar component used uniformly
 * across Student, Professor, and Admin mobile paths (md:hidden).
 *
 * Features:
 * - Dynamic scroll-reactive hide/show: slides down off-screen when scrolling down, returns on scroll up
 * - Uber floating pill design: centered bottom capsule with `bg-white/75 backdrop-blur-2xl dark:bg-slate-900/75` (frosted glass)
 * - Swiping layoutId indicator (`framer-motion` layoutId="activeBottomTabPill") when switching tabs
 * - Visible, scannable labels (`≤8 chars`, `10-11px font-bold`) and guaranteed `44×44pt` minimum touch target areas
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ items, onMenuClick }) => {
  const location = useLocation();
  const scrollDirection = useScrollDirection({ threshold: 12 });
  const { profile } = useAuthStore();
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (
    location.pathname.includes('/post/') ||
    location.search.includes('diaryId') ||
    location.pathname.endsWith('/edit') ||
    location.pathname.endsWith('/create') ||
    (location.pathname.includes('/messages') && (location.search.includes('chat=') || location.search.includes('newChat=')))
  ) {
    return null;
  }

  const handlePrefetch = (path?: string) => {
    if (path && (path.includes('/messages') || path.includes('/chat')) && profile?.id) {
      if (prefetchTimeoutRef.current) clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = setTimeout(() => {
        fetchConversations(profile.id);
      }, 50); // Small debounce
    }
  };

  return (
    <nav
      aria-label="Bottom Navigation"
      className={`md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(0.65rem+env(safe-area-inset-bottom,0px))] w-[94%] max-w-md z-50 bg-white/75 backdrop-blur-2xl saturate-[180%] border border-white/40 ring-1 ring-gray-900/5 rounded-full px-5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center justify-between select-none transition-all duration-300 ease-in-out min-h-[58px] ${
        scrollDirection === 'down'
          ? 'translate-y-[160%] opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.isMenu
          ? false
          : item.path
          ? item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)
          : false;

        const content = (
          <>
            {isActive && (
              <motion.div
                layoutId="activeBottomTabPill"
                transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                className="absolute inset-0 bg-slate-900 rounded-full shadow-sm z-0"
              />
            )}
            <div className="relative z-10 flex items-center justify-center">
              <Icon
                size={20}
                strokeWidth={isActive ? 2.3 : 1.8}
                className={`transition-all duration-200 ${
                  isActive
                    ? 'text-white scale-105'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              />
              {item.hasDot && (
                <span
                  className="absolute -top-1 -right-1.5 min-w-[8px] h-2 px-0.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"
                  aria-hidden="true"
                />
              )}
            </div>
            <span
              className={`relative z-10 text-[10px] sm:text-[11px] font-bold tracking-tight leading-none truncate max-w-[64px] transition-all duration-200 ${
                isActive
                  ? 'text-white font-extrabold'
                  : 'text-slate-500 font-semibold'
              }`}
            >
              {item.label}
            </span>
          </>
        );

        if (item.isMenu || !item.path) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.isMenu && onMenuClick) onMenuClick();
              }}
              aria-label={item.label}
              className="group flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] py-1.5 px-2 rounded-full active:scale-95 transition-all duration-200 relative focus:outline-none hover:bg-slate-100/60"
            >
              {content}
            </button>
          );
        }

        return (
          <NavLink
            key={item.key}
            to={item.path}
            onClick={() => {
              if (item.onClick) item.onClick();
              if (location.pathname === item.path && item.path.includes('/search')) {
                window.dispatchEvent(new CustomEvent('focus-search-bar'));
              }
            }}
            onMouseEnter={() => handlePrefetch(item.path)}
            onTouchStart={() => handlePrefetch(item.path)}
            aria-label={item.label}
            className="group flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] py-1.5 px-2 rounded-full active:scale-95 transition-all duration-200 relative focus:outline-none hover:bg-slate-100/60"
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
};



