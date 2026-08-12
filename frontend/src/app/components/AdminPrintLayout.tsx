import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link, Navigate } from 'react-router';
import { LayoutGrid, Settings, LogOut, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { decorateShopStatus } from '../../lib/shopStatus';
import { useShopStatus } from '../../hooks/useRealtime';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { Logo } from './ui/Logo';

export const AdminPrintLayout: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const scrollDirection = useScrollDirection({ threshold: 12 });
  const [shop, setShop] = useState<any>(null);
  
  useEffect(() => {
    async function loadShop() {
      if (!profile?.id) return;
      const { data } = await supabase.from('print_shops').select('*').eq('owner_id', profile.id).single();
      if (data) {
        setShop(decorateShopStatus(data));
      }
    }
    loadShop();
  }, [profile?.id]);

  useShopStatus('print_shops', shop?.id, (updatedShop) => {
    setShop((current: any) => ({ ...current, ...decorateShopStatus(updatedShop) }));
  });

  const navItems = [
    { icon: LayoutGrid, label: 'Live Orders', path: '/print-dashboard/live' },
    { icon: ShoppingBag, label: 'History', path: '/print-dashboard/history' },
    { icon: Settings, label: 'Settings', path: '/print-dashboard/settings' },
  ];

  const isActivePath = (itemPath: string) => {
    if (itemPath === '/print-dashboard/live') {
      return location.pathname.startsWith('/print-dashboard/live');
    }
    return location.pathname === itemPath;
  };

  return (
    <div className="flex h-dvh bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-[#1c1c1e] border-r border-[#e0e0e0] dark:border-[#38383a] flex-col relative z-20 shadow-sm">
        <div className="h-20 flex items-center px-6 border-b border-[#e0e0e0] dark:border-[#38383a]">
          <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer flex items-center transition-transform hover:scale-105">
            <Logo alt="Campus Blink" loading="eager" className="h-8 w-auto object-contain" />
          </Link>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item, i) => {
            const isActive = isActivePath(item.path);
            return (
              <Link
                key={i}
                to={item.path}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-[#0066cc] text-white font-semibold shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] font-medium'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#86868b]'}`} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-[#e0e0e0] dark:border-[#38383a] bg-[#f5f5f7] dark:bg-[#1c1c1e]">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              useAuthStore.getState().logout();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[#ff3b30] bg-white dark:bg-[#2c2c2e] border border-[#ff3b30]/30 hover:bg-[#ff3b30]/10 transition-colors font-semibold text-xs"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto pb-24 md:pb-0">
        <Outlet context={{ shop, setShop }} />
      </main>

      {/* Mobile PWA Bottom Nav (Frosted Pill) */}
      <nav
        className={`md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] w-[92%] max-w-md z-50 bg-[#ffffff]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border border-[#e0e0e0]/50 dark:border-[#38383a]/50 ring-1 ring-black/5 dark:ring-white/5 rounded-full px-3 py-2 shadow-2xl flex items-center justify-around select-none transition-transform duration-300 ${
          scrollDirection === 'down' ? 'translate-y-[150%]' : 'translate-y-0'
        }`}
      >
        {navItems.map((item) => {
          const isActive = isActivePath(item.path);
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex-1 flex items-center justify-center h-[46px] rounded-full transition-colors relative ${
                isActive ? 'bg-[#000000]/5 dark:bg-[#ffffff]/10' : ''
              }`}
            >
              <item.icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.75}
                className={isActive ? 'text-[#1d1d1f] dark:text-[#f5f5f7] scale-110 transition-transform' : 'text-[#86868b]'}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
