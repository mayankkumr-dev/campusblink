const fs = require('fs');

const content = `import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Home, Store, Coffee, Printer, Users, User, Bell, Settings, Menu, X, LogOut, Star } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useNotifications, useMyOrderStatus } from '../../hooks/useRealtime';
import { getActiveAnnouncementForUser } from '../../api/announcements';

export const StudentLayout: React.FC = () => {
  const location = useLocation();
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const [activeAnnouncement, setActiveAnnouncement] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useNotifications(profile?.id);
  useMyOrderStatus(profile?.id);

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
    { icon: Home, path: '/student/home', label: 'Home' },
    { icon: Store, path: '/student/buy-sell', label: 'Market' },
    { icon: Coffee, path: '/student/canteen', label: 'Canteen' },
    { icon: Printer, path: '/student/print', label: 'Print' },
    { icon: Users, path: '/student/community', label: 'Community' },
    { icon: Bell, path: '/student/notifications', label: 'Alerts', badge: unreadCount },
    { icon: User, path: '/student/profile', label: 'Profile' },
    { icon: Settings, path: '/student/settings', label: 'Settings' }
  ];

  return (
    <div className="flex h-dvh bg-[#FAFAF8] text-[#0D0D0D] font-sans overflow-hidden">
      
      {/* Mobile Top Navbar */}
      <div className="md:hidden fixed top-0 w-full h-[60px] bg-[#FFFFFF] border-b border-[#E8E8E8] z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-lg font-syne font-bold">
           <span>Campus Blink</span>
        </div>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-[#0D0D0D]">
          <Menu size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Desktop + Mobile Drawer */}
      <nav className={\`fixed md:static top-0 left-0 h-dvh w-[240px] bg-[#FFFFFF] border-r border-[#E8E8E8] z-[70] flex flex-col transition-transform duration-200 \${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}\`}>
        
        <div className="h-[60px] border-b border-[#E8E8E8] flex items-center justify-between px-4 shrink-0">
          <div className="font-syne font-bold text-lg text-[#0D0D0D]">Campus Blink</div>
          <button className="md:hidden text-[#9B9B9B] hover:text-[#0D0D0D]" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="py-[20px] px-4 pb-[8px]">
          <span className="font-sans font-medium text-[11px] text-[#9B9B9B] uppercase tracking-[1px]">Main Navigation</span>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto w-full hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={\`flex items-center gap-[10px] h-[36px] px-[12px] mx-[8px] my-[2px] rounded-md transition-colors duration-150 \${isActive ? 'bg-[#FEFCE8] text-[#0D0D0D] font-medium' : 'text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]'}\`}
              >
                <div className="relative">
                  <Icon size={16} className={isActive ? 'text-[#CA8A04]' : 'text-[#9B9B9B] group-hover:text-[#0D0D0D]'} />
                  {item.badge && item.badge > 0 && (
                     <span className="absolute -top-[4px] -right-[4px] h-[6px] w-[6px] rounded-full bg-[#DC2626]" />
                  )}
                </div>
                <span className={\`text-[14px] leading-none mb-[-1px] \${isActive ? 'font-semibold' : ''}\`}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
        
        {/* User Info Bottom */}
        <div className="mt-auto border-t border-[#E8E8E8] p-4 shrink-0">
          <div className="flex items-center gap-3 mb-4">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} className="w-8 h-8 rounded-full border border-[#E8E8E8] object-cover" alt="avatar" />
             ) : (
               <div className="w-8 h-8 rounded-full bg-[#F5F4F0] flex items-center justify-center text-[#6B6B6B] border border-[#E8E8E8]">
                 <User size={16}/>
               </div>
             )}
             <div className="flex flex-col min-w-0 flex-1">
               <span className="text-[14px] font-medium text-[#0D0D0D] truncate">{profile?.name || 'Student'}</span>
               <span className="text-[11px] bg-[#EFF6FF] text-[#1D4ED8] rounded-[4px] px-[6px] py-[2px] w-fit font-medium mt-[2px] tracking-[0.4px] uppercase">Student</span>
             </div>
          </div>
          <button onClick={() => signOut()} className="w-full flex items-center gap-[10px] h-[36px] px-[12px] rounded-md text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D] transition-colors duration-150">
             <LogOut size={16} className="text-[#9B9B9B]"/>
             <span className="text-[14px] leading-none mb-[-1px] font-medium">Log out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full h-full pt-[60px] md:pt-0 overflow-y-auto bg-[#FAFAF8]">
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
          <Outlet />
        </div>
      </main>
    </div>
  );
};
`;

fs.writeFileSync('src/app/components/StudentLayout.tsx', content);
