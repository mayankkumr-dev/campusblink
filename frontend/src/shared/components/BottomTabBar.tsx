import React, { useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useAuthStore } from '../../store/authStore';


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
 * Shared floating pill bottom tab bar — DESIGN.md compliant.
 *
 * Design system mappings:
 * - Container: floating-sticky-bar spec — bg canvas-parchment #f5f5f7 at 80% opacity,
 *   backdrop-filter blur, hairline border #e0e0e0, height ~64px, rounded-full pill.
 * - Active pill: bg ink #1d1d1f (near-black), white icon + label.
 * - Inactive: text ink-muted-48 #7a7a7a, icon strokeWidth 1.8.
 * - Labels: nav-link token — 12px/400/-0.12px tracking.
 * - Touch targets: minimum 44×44px per DESIGN.md responsive spec.
 * - Active/press micro-interaction: active:scale-95 (system-wide).
 * - Scroll-reactive hide/show: slides down when scrolling down.
 * - LayoutId animated indicator for smooth tab switching.
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ items, onMenuClick }) => {
  const location = useLocation();
  const scrollDirection = useScrollDirection({ threshold: 12 });
  const { profile } = useAuthStore();
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



  return (
    /*
     * DESIGN.md floating-sticky-bar:
     * bg canvas-parchment (#f5f5f7) at 80% opacity, backdrop-filter blur,
     * hairline border #e0e0e0, height guidance ~64px, rounded-full pill shape.
     * No box-shadow on chrome — depth from blur + surface color change.
     */
    <nav
      aria-label="Bottom Navigation"
      className={`md:hidden fixed bottom-0 left-0 right-0 w-full z-[999] flex items-center justify-between select-none transition-all duration-300 ease-in-out bg-white/95 dark:bg-[#171A21]/95 backdrop-blur-xl border-t border-gray-200 dark:border-[#262A33] pb-safe ${
        scrollDirection === 'down' && !location.pathname.startsWith('/student/notices')
          ? 'translate-y-[160%] opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
      style={{
        minHeight: 58,
        paddingTop: '6px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
      }}
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
                className="absolute inset-0 rounded-full z-0 bg-[#1d1d1f] dark:bg-[#2D4EF5]"
              />
            )}
            <div className="relative z-10 flex items-center justify-center">
              <Icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.8}
                style={{
                  transition: 'all 0.2s ease',
                  // Active: white (on ink pill); Inactive: ink-muted-48 #7a7a7a
                  color: isActive ? '#ffffff' : '#7a7a7a',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
              />
              {item.hasDot && (
                /* Notification dot — rose-500 functional signal */
                <span
                  className="absolute -top-1 -right-1.5 min-w-[8px] h-2 px-0.5 rounded-full bg-rose-500 animate-pulse"
                  style={{ boxShadow: '0 0 0 2px rgba(245,245,247,0.8)' }}
                  aria-hidden="true"
                />
              )}
            </div>
            {/* nav-link token: 12px/400/-0.12px tracking */}
            <span
              className="relative z-10 truncate max-w-[64px]"
              style={{
                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '-0.12px',
                lineHeight: 1,
                color: isActive ? '#ffffff' : '#7a7a7a',
                transition: 'all 0.2s ease',
              }}
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
              className="group flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-full relative focus:outline-none active:scale-95 transition-transform duration-150"
              style={{ minHeight: 44, minWidth: 44 }}
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
            onMouseEnter={() => {}}
            onTouchStart={() => {}}
            aria-label={item.label}
            className="group flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-full relative focus:outline-none active:scale-95 transition-transform duration-150"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
};
