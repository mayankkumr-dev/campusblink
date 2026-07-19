import React from 'react';
import { NavLink, useLocation } from 'react-router';
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
 * Shared, icon-only, Uber-style floating pill tab bar component used uniformly
 * across Student, Professor, and Admin dashboards.
 *
 * Features:
 * - Dynamic scroll-reactive hide/show: slides down off-screen when scrolling down, instantly returns when scrolling up
 * - Uber floating pill design: centered bottom capsule (`rounded-full`) with `bg-white/90 backdrop-blur-xl`
 * - Pure whites and ultra-soft, diffused drop-shadows (`shadow-2xl shadow-gray-200/50`)
 * - Icon-only navigation (`fill="currentColor"` when active) with small notification dots
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ items, onMenuClick }) => {
  const location = useLocation();
  const scrollDirection = useScrollDirection({ threshold: 12 });

  return (
    <nav
      aria-label="Bottom Navigation"
      className={`md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] w-[92%] max-w-md z-50 bg-white/90 backdrop-blur-xl border border-gray-100/80 ring-1 ring-gray-900/5 rounded-full px-3 py-2 shadow-2xl shadow-gray-200/50 flex items-center justify-around select-none transition-all duration-300 ease-in-out no-touch-callout ${
        scrollDirection === 'down'
          ? 'translate-y-[150%] opacity-0 pointer-events-none'
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
            <div className="relative flex items-center justify-center">
              <Icon
                size={22}
                strokeWidth={isActive ? 2.25 : 1.75}
                fill={isActive ? 'currentColor' : 'none'}
                className={`transition-all duration-200 ${
                  isActive
                    ? 'text-gray-900 scale-110'
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              {item.hasDot && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"
                  aria-hidden="true"
                />
              )}
            </div>
            <span className="sr-only">{item.label}</span>
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
              className={`group flex-1 flex items-center justify-center h-[46px] rounded-full active:scale-95 transition-all relative focus:outline-none ${
                isActive ? 'bg-gray-100/80' : 'hover:bg-gray-50/60'
              }`}
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
            }}
            aria-label={item.label}
            className={`group flex-1 flex items-center justify-center h-[46px] rounded-full active:scale-95 transition-all relative focus:outline-none ${
              isActive ? 'bg-gray-100/80' : 'hover:bg-gray-50/60'
            }`}
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
};

