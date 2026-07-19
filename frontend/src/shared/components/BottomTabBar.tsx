import React from 'react';
import { NavLink, useLocation } from 'react-router';

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
 * Shared, icon-only, floating tab bar component used uniformly as the outer shell
 * across Student, Professor, and Admin dashboards.
 *
 * Adopts:
 * - Icon-only navigation with sr-only labels for clean, minimal aesthetics
 * - Solid black/white filled treatment (`fill="currentColor"`) for active tab, outline (`fill="none"`) at rest
 * - Small red status dot for notifications instead of numbered badges
 * - Generous 5-item spacing and comfortable touch targets
 * - Floating rounded bar with elevation/shadow and safe-area respecting positioning
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ items, onMenuClick }) => {
  const location = useLocation();

  return (
    <nav
      aria-label="Bottom Navigation"
      className="md:hidden shrink-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 rounded-t-2xl sm:rounded-t-3xl pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] px-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex items-center justify-around select-none transition-all duration-200 no-touch-callout"
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
                size={24}
                strokeWidth={isActive ? 2.25 : 1.75}
                fill={isActive ? 'currentColor' : 'none'}
                className={`transition-all duration-200 ${
                  isActive
                    ? 'text-gray-900 scale-105'
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              {item.hasDot && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"
                  aria-hidden="true"
                />
              )}
            </div>
            {/* Screen-reader label only (No text labels under any icon) */}
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
              className="group flex-1 flex items-center justify-center h-[52px] rounded-2xl active:scale-95 transition-all relative focus:outline-none"
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
            className="group flex-1 flex items-center justify-center h-[52px] rounded-2xl active:scale-95 transition-all relative focus:outline-none"
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
};
