import React from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useScrollDirection } from '../../hooks/useScrollDirection';

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

  if (location.pathname.includes('/post/') || window.location.search.includes('diaryId') || location.pathname.endsWith('/edit') || location.pathname.endsWith('/create')) {
    return null;
  }

  return (
    <nav
      aria-label="Bottom Navigation"
      className={`md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(0.65rem+env(safe-area-inset-bottom,0px))] w-[94%] max-w-md z-50 bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl saturate-[180%] border border-white/40 dark:border-white/10 ring-1 ring-gray-900/5 dark:ring-white/5 rounded-full px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center justify-around select-none transition-all duration-300 ease-in-out no-touch-callout min-h-[58px] ${
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
                className="absolute inset-0 bg-slate-900 dark:bg-white rounded-full shadow-sm z-0"
              />
            )}
            <div className="relative z-10 flex items-center justify-center">
              <Icon
                size={20}
                strokeWidth={isActive ? 2.3 : 1.8}
                className={`transition-all duration-200 ${
                  isActive
                    ? 'text-white dark:text-slate-900 scale-105'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              />
              {item.hasDot && (
                <span
                  className="absolute -top-1 -right-1.5 min-w-[8px] h-2 px-0.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
                  aria-hidden="true"
                />
              )}
            </div>
            <span
              className={`relative z-10 text-[10px] sm:text-[11px] font-bold tracking-tight leading-none truncate max-w-[64px] transition-all duration-200 ${
                isActive
                  ? 'text-white dark:text-slate-900 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-semibold'
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
              className="group flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] py-1.5 px-2 rounded-full active:scale-95 transition-all duration-200 relative focus:outline-none hover:bg-slate-100/60 dark:hover:bg-slate-800/50"
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
            aria-label={item.label}
            className="group flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] py-1.5 px-2 rounded-full active:scale-95 transition-all duration-200 relative focus:outline-none hover:bg-slate-100/60 dark:hover:bg-slate-800/50"
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
};



