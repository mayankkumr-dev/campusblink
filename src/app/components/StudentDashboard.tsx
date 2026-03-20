import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Bell, Zap, Store, Coffee, Printer, Users, ChevronRight, MessageSquare, ArrowRight, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { getFirstName, getTimeGreeting } from '../../lib/user';
import { supabase } from '../../lib/supabase';
import { getMyInviteOverview, requestInviteRefresh } from '../../api/invites';
import toast from 'react-hot-toast';

// using the stacked logo format
const onlyLogoTransparent = '/logo/only_logo_transparent.png';
const textTransparent = '/logo/text_transparent.png';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const profile = useAuthStore((state) => state.profile);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [isRefreshingInvites, setIsRefreshingInvites] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());

  const firstName = useMemo(() => getFirstName(profile?.name, 'Student'), [profile?.name]);
  const greeting = useMemo(() => getTimeGreeting(), []);
  const repBalance = Number(profile?.campus_credits ?? 0);
  const repToTrusted = Math.max(0, 300 - repBalance);

  useEffect(() => {
    let isMounted = true;

    const loadRecentActivity = async () => {
      if (!profile?.id) return;

      const [postsResp, listingsResp, canteenResp, printResp] = await Promise.all([
        supabase.from('posts').select('id, title, created_at').eq('author_id', profile.id).order('created_at', { ascending: false }).limit(2),
        supabase.from('listings').select('id, title, created_at, is_sold').eq('seller_id', profile.id).order('created_at', { ascending: false }).limit(2),
        supabase.from('canteen_orders').select('id, status, created_at, shop_id').eq('student_id', profile.id).order('created_at', { ascending: false }).limit(2),
        supabase.from('print_orders').select('id, file_name, status, created_at').eq('student_id', profile.id).order('created_at', { ascending: false }).limit(2),
      ]);

      const combined = [
        ...((postsResp.data || []).map((item) => ({ type: 'Community', title: item.title || 'Posted in community', time: item.created_at, status: 'posted' }))),
        ...((listingsResp.data || []).map((item) => ({ type: 'Buy/Sell', title: item.title || 'Marketplace listing', time: item.created_at, status: item.is_sold ? 'sold' : 'live' }))),
        ...((canteenResp.data || []).map((item) => ({ type: 'Canteen', title: `Order #${String(item.id).slice(0, 6)}`, time: item.created_at, status: item.status || 'placed' }))),
        ...((printResp.data || []).map((item) => ({ type: 'Print', title: item.file_name || 'Print order', time: item.created_at, status: item.status || 'queued' }))),
      ]
        .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
        .slice(0, 4)
        .map((item) => ({
          ...item,
          time: new Date(item.time).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        }));

      if (isMounted) {
        setRecentActivity(combined);
      }
    };

    loadRecentActivity();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    let isMounted = true;

    const loadInvites = async () => {
      setIsInviteLoading(true);
      const { data } = await getMyInviteOverview(profile.id);
      if (isMounted && data) {
        setInviteData(data);
      }
      if (isMounted) {
        setIsInviteLoading(false);
      }
    };

    loadInvites();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const cooldownMs = inviteData?.profile?.next_invite_refresh_at
    ? new Date(inviteData.profile.next_invite_refresh_at).getTime() - clockNow
    : 0;

  const cooldownRemaining = Math.max(0, Math.floor(cooldownMs / 1000));
  const cooldownHours = String(Math.floor(cooldownRemaining / 3600)).padStart(2, '0');
  const cooldownMinutes = String(Math.floor((cooldownRemaining % 3600) / 60)).padStart(2, '0');
  const cooldownSeconds = String(cooldownRemaining % 60).padStart(2, '0');

  const usedCodesCount = Number(inviteData?.usedCodes?.length || 0);
  const availableCodes = inviteData?.availableCodes || [];
  const canRefreshNow = Boolean(inviteData?.profile?.next_invite_refresh_at) && cooldownRemaining <= 0;

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Invite code copied.');
    } catch {
      toast.error('Could not copy invite code.');
    }
  };

  const handleShareInvite = async (code: string) => {
    const message = `Join me on Campus Blink! Use my invite code: ${code} Sign up at campusblink.me`;
    try {
      if (navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
        toast.success('Invite message copied.');
      }
    } catch {
      toast.error('Could not share invite right now.');
    }
  };

  const handleRefreshInvites = async () => {
    if (!profile?.id) return;
    setIsRefreshingInvites(true);
    const { error } = await requestInviteRefresh(profile.id);
    if (error) {
      toast.error(typeof error === 'string' ? error : 'Could not refresh invites right now.');
      setIsRefreshingInvites(false);
      return;
    }

    const { data } = await getMyInviteOverview(profile.id);
    if (data) setInviteData(data);
    toast.success('Your invites are refreshed.');
    setIsRefreshingInvites(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500 bg-[#FAFAF8] min-h-screen">
      {/* Top Bar */}
      <div className="flex justify-between items-center pt-2">
        <div className="md:hidden h-[45px] flex items-center mb-4">
           <Link to={profile ? '/student/home' : '/'} className="no-underline cursor-pointer flex flex-col items-start justify-center drop-shadow-[0_0_8px_rgba(255,214,0,0.5)] transition-transform hover:scale-105">
             <img src={onlyLogoTransparent} alt="Campus Blink Icon" loading="eager" className="h-[45px] w-auto object-contain shrink-0 ml-1" />
             <img src={textTransparent} alt="Campus Blink" loading="eager" className="h-[60px] w-auto object-contain -mt-3 shrink-0" />
            </Link>
        </div>
        <div className="hidden md:block">
          <h1 className="font-syne font-extrabold text-3xl tracking-tight text-[#0D0D0D]">Overview</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/80  px-4 py-2 rounded-xl flex items-center gap-2 border border-black/10 shadow-soft transition-transform hover:scale-105 cursor-pointer">
            <Star className="w-4 h-4 text-[#FFD600] animate-pulse" />
            <span className="font-syne font-bold text-sm text-[#0D0D0D]">⭐ {repBalance}</span>
          </div>
          <button
            onClick={() => navigate('/student/notifications')}
            className="relative p-3 bg-white/80  border border-black/10 rounded-xl hover:bg-[#F2F0EB] transition-all duration-300 group hover:scale-105 shadow-soft"
          >
            <Bell className="w-5 h-5 text-[#6B6B6B] group-hover:text-[#0D0D0D]" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FFD600] rounded-xl ring-2 ring-white animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Hero Greeting */}
      <div className="relative rounded-[2rem] p-6 md:p-10 overflow-hidden group shadow-medium transition-transform hover:-translate-y-1 duration-500 border border-black/5">
        <div className="absolute inset-0 bg-white z-0" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD600]/30 rounded-full blur-[80px] mix-blend-multiply transition-opacity duration-700 group-hover:opacity-100 opacity-60 z-0" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#C4817A]/10 rounded-full blur-[100px] z-0" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="student-greeting-title font-syne font-extrabold md:text-5xl mb-2 text-[#0D0D0D] tracking-tight">
              {greeting}, <span className="text-[#FFD600] drop-shadow-sm">{firstName}</span> ☀️
            </h2>
            <p className="font-sans text-[#6B6B6B] text-lg">Your campus is buzzing today. What's the move?</p>
          </div>
          <Star className="hidden md:block w-24 h-24 text-[#0D0D0D] opacity-[0.03] -rotate-12 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 group-hover:opacity-[0.08]" />
        </div>
      </div>

      {/* 2x2 Modules with GenZ Aesthetics */}
      <div className="module-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { icon: Store, title: 'Buy & Sell', status: 'All Colleges 🌐', path: '/student/buy-sell', bg: 'bg-[#FFFFFF]#FFD600]/20 to-[#FFD600]/5', color: 'text-[#0D0D0D]', border: 'hover:border-[#FFD600]', glow: 'hover:shadow-medium' },
          { icon: Coffee, title: 'Canteen', status: 'Your Campus Only 🏫', path: '/student/canteen', bg: 'bg-[#FFFFFF]/20 to-orange-600/5', color: 'text-orange-500', border: 'hover:border-orange-500/50', glow: 'hover:shadow-medium' },
          { icon: Printer, title: 'Print Shop', status: 'Your Campus Only 🏫', path: '/student/print', bg: 'bg-[#FFFFFF]/20 to-blue-600/5', color: 'text-blue-500', border: 'hover:border-blue-500/50', glow: 'hover:shadow-medium' },
          { icon: Users, title: 'Community', status: 'All Colleges 🌐', path: '/student/community', bg: 'bg-[#FFFFFF]/20 to-green-600/5', color: 'text-green-500', border: 'hover:border-green-500/50', glow: 'hover:shadow-medium' },
        ].map((mod, i) => (
          <button
            key={i}
            onClick={() => navigate(mod.path)}
            className={`module-card bg-white border border-black/10 rounded-[2rem] p-4 md:p-5 text-left relative overflow-hidden transition-all duration-300 group hover:-translate-y-2 focus:outline-none shadow-soft ${mod.border} ${mod.glow}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FFFFFF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <mod.icon className="absolute -bottom-4 -right-4 w-24 h-24 text-[#0D0D0D] opacity-[0.03] -rotate-12 group-hover:scale-125 group-hover:rotate-0 group-hover:opacity-[0.06] transition-all duration-500" />
            
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${mod.bg} border border-black/5`}>
               <mod.icon className={`w-6 h-6 ${mod.color}`} />
            </div>
            <h3 className="module-title font-syne font-extrabold text-[#0D0D0D] leading-tight mb-1 transition-all">
              {mod.title}
            </h3>
            <p className="module-subtitle font-sans text-[#6B6B6B] font-medium tracking-wide">{mod.status}</p>
          </button>
        ))}
      </div>

      {/* Content Split Layout for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-syne font-bold text-2xl tracking-tight text-[#0D0D0D]">Recent Activity</h3>
            <button onClick={() => navigate('/student/notifications')} className="font-sans text-xs uppercase font-bold text-[#6B6B6B] hover:text-[#0D0D0D] tracking-wider transition-colors flex items-center group">
              View All <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="bg-white/80  border border-black/10 rounded-[1.5rem] p-6 text-sm text-[#6B6B6B]">
                Your recent campus activity will show up here once you start posting, ordering, or listing.
              </div>
            ) : recentActivity.map((activity, i) => (
              <div key={i} className="bg-white/80  border border-black/10 hover:border-black/20 rounded-[1.5rem] p-4 flex items-center justify-between group transition-all duration-300 cursor-pointer hover:bg-[#F2F0EB]">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-12 rounded-full bg-[#FFFFFF]#FFD600] to-yellow-600/20" />
                  <div>
                    <span className="font-sans text-[10px] uppercase tracking-[2px] text-[#6B6B6B] font-bold mb-1 block">
                      {activity.type}
                    </span>
                    <p className="activity-order-id font-syne font-semibold text-[#0D0D0D] transition-colors">{activity.title}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="activity-date text-xs text-[#6B6B6B] font-sans">{activity.time}</span>
                  <Badge variant="outline" className={`status-badge text-[10px] px-2 py-0.5 rounded-xl border border-black/10 ${activity.status === 'completed' || activity.status === 'ready' || activity.status === 'sold' ? 'text-green-600 bg-green-50/50' : 'text-[#0D0D0D] bg-[#F2F0EB]'}`}>
                    {activity.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar / Extra Widgets */}
        <div className="space-y-6">
          <div className="bg-white border border-black/10 rounded-[2rem] overflow-hidden shadow-soft">
            <div className="h-2 bg-[#FFD600]" />
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-syne font-bold text-2xl text-[#0D0D0D]">Your Invites ✉️</h3>
                <p className="font-sans text-sm text-[#6B6B6B]">Share Campus Blink with friends</p>
                <p className="font-sans text-xs font-bold uppercase tracking-[0.16em] text-[#CA8A04] mt-1">+20 Reputation when a friend joins</p>
              </div>

              {isInviteLoading ? (
                <div className="rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-5 text-sm text-[#6B6B6B]">Loading invite codes...</div>
              ) : availableCodes.length > 0 ? (
                <div className="space-y-3">
                  {availableCodes.map((item: any) => (
                    <div key={item.id} className="rounded-2xl border border-[#FFD600]/30 bg-[#FFFBE8] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-syne font-extrabold text-[20px] tracking-[0.1em] text-[#A16207]">{item.code}</p>
                        <button onClick={() => handleCopyInvite(item.code)} className="rounded-xl bg-white border border-black/10 px-3 py-1.5 text-xs font-bold text-[#0D0D0D] hover:bg-[#F2F0EB]">📋 Copy</button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/30 px-2.5 py-1 text-[11px] font-bold text-[#166534] uppercase tracking-[0.15em]">Available</span>
                        <button onClick={() => handleShareInvite(item.code)} className="rounded-xl bg-[#0D0D0D] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D]">Share</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border border-black/10 bg-[#FAFAF8] p-4">
                  <p className="font-sans text-sm text-[#0D0D0D] font-bold">You have helped {usedCodesCount} friends join! 🎉</p>

                  {cooldownRemaining > 0 ? (
                    <>
                      <p className="font-sans text-xs uppercase tracking-[0.16em] font-bold text-[#6B6B6B]">New invites available in:</p>
                      <p className="font-syne font-extrabold text-3xl text-[#A16207]">{cooldownHours}:{cooldownMinutes}:{cooldownSeconds}</p>
                      <div className="h-2 rounded-xl bg-black/10 overflow-hidden">
                        <div
                          className="h-full bg-[#FFD600] transition-[width] duration-1000"
                          style={{ width: `${Math.max(0, Math.min(100, ((48 * 3600 - cooldownRemaining) / (48 * 3600)) * 100))}%` }}
                        />
                      </div>
                    </>
                  ) : null}

                  {canRefreshNow ? (
                    <button
                      onClick={handleRefreshInvites}
                      disabled={isRefreshingInvites}
                      className="w-full rounded-xl bg-[#FFD600] px-4 py-2.5 text-sm font-bold text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-[#FFD600]"
                    >
                      {isRefreshingInvites ? 'Generating...' : 'Generate New Invites'}
                    </button>
                  ) : null}

                  {inviteData?.usedCodes?.length > 0 ? (
                    <div className="space-y-2 border-t border-black/10 pt-3">
                      {inviteData.usedCodes.slice(0, 3).map((usedItem: any) => (
                        <div key={usedItem.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-sans text-[#0D0D0D] truncate">{usedItem?.usedByProfile?.name || 'A student'} joined</span>
                          <span className="text-xs text-[#6B6B6B]">{new Date(usedItem.used_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#FAFAF8] border border-black/10 rounded-[2rem] p-6 relative overflow-hidden group hover:border-black/20 transition-colors shadow-soft">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD600]/10 rounded-full blur-2xl" />
            <h3 className="font-syne font-bold text-xl mb-4 relative z-10 flex items-center gap-2 text-[#0D0D0D]">
              <Zap className="w-5 h-5 text-[#FFD600]" /> 
              Quick Actions
            </h3>
            <div className="space-y-2 relative z-10">
              <button onClick={() => navigate('/student/community?compose=1&type=notice')} className="w-full bg-[#FFFFFF] hover:bg-[#0D0D0D] hover:text-white hover:scale-[1.02] border border-black/10 transition-all duration-300 rounded-2xl py-3 px-4 font-sans font-bold text-sm text-[#0D0D0D] flex justify-between items-center group/btn shadow-sm">
                Post a Notice
                <ChevronRight className="w-4 h-4 text-[#6B6B6B] group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
              </button>
              <button onClick={() => navigate('/student/buy-sell?compose=1')} className="w-full bg-[#FFFFFF] hover:bg-[#0D0D0D] hover:text-white hover:scale-[1.02] border border-black/10 transition-all duration-300 rounded-2xl py-3 px-4 font-sans font-bold text-sm text-[#0D0D0D] flex justify-between items-center group/btn shadow-sm">
                Sell an Item
                <ChevronRight className="w-4 h-4 text-[#6B6B6B] group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          {/* Reputation Mini-Card */}
          <div className="bg-[linear-gradient(140deg,#121212_0%,#232323_54%,#2C2C2C_100%)] border border-black/30 shadow-medium rounded-[2rem] p-6 flex flex-col justify-between relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,214,0,0.16),transparent_45%)]" />
             <Star className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10 rotate-12" />
             <div>
               <p className="font-sans text-xs text-[#D1D1D1] uppercase tracking-widest font-bold mb-2">Your Reputation ⭐</p>
               <div className="flex items-center gap-2 mb-2">
                 <Star className="w-6 h-6 text-[#FFD600] animate-pulse" />
                 <span className="font-syne font-extrabold text-3xl text-white">{repBalance}</span>
               </div>
               <p className="font-sans text-xs text-[#C6C6C6] max-w-[85%]">{repToTrusted > 0 ? `${repToTrusted} more Reputation to unlock Pay at Counter privilege!` : '300 Reputation = Trusted Member ⭐'}</p>
             </div>
             <button className="mt-4 font-sans text-xs uppercase font-bold text-white hover:text-[#FFD600] tracking-wider transition-colors flex items-center w-fit">
               How to earn & use Reputation? <ArrowRight className="w-3 h-3 ml-1" />
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};
