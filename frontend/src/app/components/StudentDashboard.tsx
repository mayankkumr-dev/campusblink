import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  ChevronRight,
  Store,
  Coffee,
  Printer,
  Users,
  Bell,
  MessageSquare,
  ArrowUpRight,
  Check,
  Activity,
  Award,
  Share2,
  Clock,
  ExternalLink,
  WifiOff
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { supabase } from '../../lib/supabase';
import { getMyInviteOverview, requestInviteRefresh } from '../../api/invites';
import toast from 'react-hot-toast';
import { ListSkeleton, PostSkeleton } from './ui/Skeletons';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const profile = useAuthStore((state) => state.profile);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isInviteLoading, setIsInviteLoading] = useState(true);
  const [isRefreshingInvites, setIsRefreshingInvites] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const firstName = useMemo(() => getFirstName(profile?.name, 'Student'), [profile?.name]);
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
        ...((postsResp.data || []).map((item) => ({ type: 'Community', title: 'Community Post', subtitle: item.title || 'Posted in community', time: item.created_at, status: 'posted' }))),
        ...((listingsResp.data || []).map((item) => ({ type: 'Buy/Sell', title: 'Marketplace Listing', subtitle: item.title || 'Marketplace listing', time: item.created_at, status: item.is_sold ? 'sold' : 'posted' }))),
        ...((canteenResp.data || []).map((item) => ({ type: 'Canteen', title: 'Canteen Order', subtitle: `Order #${String(item.id).slice(0, 6)}`, time: item.created_at, status: item.status || 'placed' }))),
        ...((printResp.data || []).map((item) => ({ type: 'Print', title: 'Print Request', subtitle: item.file_name || 'Print order', time: item.created_at, status: item.status || 'pending' }))),
      ]
        .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
        .slice(0, 4)
        .map((item) => ({
          ...item,
          time: new Date(item.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
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
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast.success('Invite code copied.');
    } catch {
      toast.error('Could not copy invite code.');
    }
  };

  const handleShareInvite = async (code: string) => {
    const message = `Join me on Campus Blink! Use my invite code: ${code} Sign up at https://campusblink.vercel.app`;
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Community':
        return <Users className="w-5 h-5 text-accent-purple" />;
      case 'Print':
        return <Printer className="w-5 h-5 text-cyan-600 dark:text-cyan-400 transition-colors" />;
      case 'Canteen':
        return <Coffee className="w-5 h-5 text-accent-amber" />;
      default:
        return <Store className="w-5 h-5 text-accent-blue" />;
    }
  };

  const getActivityIconBg = (type: string) => {
    switch (type) {
      case 'Community':
        return 'bg-accent-purple/15 border border-purple-100';
      case 'Print':
        return 'bg-accent-teal/15 border border-cyan-100';
      case 'Canteen':
        return 'bg-accent-amber-soft border border-amber-100';
      default:
        return 'bg-accent-blue-soft border border-accent-blue-soft';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'ready' || s === 'completed' || s === 'delivered') {
      return 'bg-accent-green/15 text-accent-green border border-accent-green/20';
    }
    if (s === 'preparing' || s === 'pending' || s === 'placed') {
      return 'bg-accent-amber-soft text-accent-amber border border-accent-amber-soft/20';
    }
    if (s === 'posted' || s === 'active') {
      return 'bg-accent-blue-soft text-blue-700 border border-blue-200/60';
    }
    return 'bg-surface-elevated text-text-primary border border-border-subtle';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-background min-h-full">
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="bg-amber-500/15 dark:bg-amber-950/50 border border-amber-400/50 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-200 font-syne">
                You are currently offline
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 font-medium">
                Campus Blink is running in offline mode. Cached features are available and new actions will sync automatically when your connection is restored.
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs self-start sm:self-auto shrink-0">
            Offline Mode
          </span>
        </div>
      )}

      {/* Hero Header Card (Light Mode Premium SaaS Aesthetic) */}
      <div className="md:bg-surface md:border md:border-border-subtle md:rounded-3xl max-md:bg-white max-md:border-none max-md:rounded-[24px] max-md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle Decorative Light Pattern Accents */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-48 h-48 bg-amber-50/50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 max-md:gap-4">
          <div className="space-y-3 max-md:space-y-1.5">
            <h1 className="font-syne font-extrabold text-3xl md:text-4xl max-md:text-2xl text-slate-900 tracking-tight leading-tight">
              Hello, {firstName}.
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl max-md:text-xs max-md:leading-relaxed">
              Welcome back to your campus command center. Explore listings, track canteen & print requests, and connect with your peers.
            </p>
          </div>

          {/* Mini Reputation Snapshot Card */}
          <div className="flex items-center gap-4 max-md:gap-3 bg-surface md:border md:border-border-subtle max-md:bg-slate-50 max-md:border-none rounded-2xl p-4 md:px-5 md:py-4 shrink-0 max-md:shadow-[0_2px_12px_rgb(0,0,0,0.03)] max-md:mt-2">
            <div className="w-11 h-11 max-md:w-9 max-md:h-9 rounded-xl max-md:rounded-lg bg-amber-50 md:border md:border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
              <Award className="w-6 h-6 max-md:w-4 max-md:h-4" />
            </div>
            <div>
              <p className="text-[11px] max-md:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Reputation Score
              </p>
              <div className="flex items-baseline gap-1.5 max-md:gap-1 mt-0.5 max-md:mt-0">
                <span className="font-syne font-extrabold text-2xl max-md:text-lg text-slate-900">
                  {repBalance}
                </span>
                <span className="text-xs max-md:text-[10px] font-semibold text-slate-500">pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Quick Service Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          {
            title: 'Buy & Sell',
            subtitle: 'Campus Marketplace',
            badge: 'All Colleges',
            path: '/student/buy-sell',
            icon: Store,
            iconClass: 'bg-accent-blue-soft text-accent-blue border border-accent-blue-soft',
          },
          {
            title: 'Canteen',
            subtitle: 'Order Food & Drinks',
            badge: 'Your Campus Only',
            path: '/student/canteen',
            icon: Coffee,
            iconClass: 'bg-accent-amber-soft text-accent-amber border border-amber-100',
          },
          {
            title: 'Print Shop',
            subtitle: 'Document Services',
            badge: 'Your Campus Only',
            path: '/student/print',
            icon: Printer,
            iconClass: 'bg-accent-teal/15 text-cyan-600 border border-cyan-100',
          },
          {
            title: 'Community',
            subtitle: 'Discussions & Posts',
            badge: 'All Colleges',
            path: '/student/community',
            icon: Users,
            iconClass: 'bg-accent-purple/15 text-accent-purple border border-purple-100',
          },
        ].map((item, i) => {
          const IconComponent = item.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className="md:bg-surface md:border md:border-border-subtle max-md:bg-white max-md:border-none max-md:shadow-[0_4px_24px_rgb(0,0,0,0.04)] rounded-[20px] md:rounded-2xl p-4 md:p-5 text-left flex flex-col justify-between hover:border-slate-300 md:hover:shadow-md transition-all duration-200 group min-h-[140px] md:min-h-[148px]"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl max-md:rounded-[14px] flex items-center justify-center ${item.iconClass.replace('border', 'md:border')} transition-transform group-hover:scale-105`}>
                  <IconComponent className="w-5 h-5 max-md:w-4 max-md:h-4" />
                </div>
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-slate-400 max-md:bg-slate-50 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                  <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
              </div>

              <div className="mt-3 md:mt-4">
                <h3 className="font-syne font-bold text-[13px] md:text-lg text-slate-900 leading-tight mb-1 md:mb-0">
                  {item.title}
                </h3>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium mb-2.5 line-clamp-1">
                  {item.subtitle}
                </p>
                <span className="inline-block px-2 md:px-2.5 py-0.5 rounded-full text-[9px] md:text-[11px] font-semibold bg-slate-50 md:bg-surface-elevated md:border md:border-border-subtle text-slate-500">
                  {item.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Split: Recent Activity & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Activity (7 columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-syne font-bold text-xl text-slate-900 max-md:px-2">
                Recent Activity
              </h2>
              <p className="text-xs text-slate-500 font-medium max-md:px-2">
                Latest updates across your campus interactions
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full max-md:bg-slate-50 md:bg-surface-elevated md:border md:border-border-subtle text-xs font-semibold text-slate-500">
              <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-colors" />
              Live
            </span>
          </div>

          <div className="md:bg-surface md:border md:border-border-subtle max-md:bg-transparent max-md:border-none rounded-2xl p-0 md:p-6 md:shadow-xs">
            {isInviteLoading && recentActivity.length === 0 ? (
              <div className="space-y-4 py-2">
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-12 text-center space-y-2 max-md:bg-white max-md:rounded-[24px] max-md:shadow-[0_4px_24px_rgb(0,0,0,0.03)]">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="font-syne font-bold text-base text-slate-900">No recent activity</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto px-4">
                  Your campus activity including community discussions, canteen orders, and print requests will appear right here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-md:divide-none max-md:space-y-2">
                {recentActivity.map((act, index) => (
                  <div
                    key={index}
                    className="py-4 max-md:py-3 max-md:px-4 max-md:bg-white max-md:rounded-[20px] max-md:shadow-[0_2px_12px_rgb(0,0,0,0.02)] first:pt-0 max-md:first:pt-3 last:pb-0 max-md:last:pb-3 flex items-center justify-between gap-4 hover:bg-slate-50/60 md:-mx-2 md:px-2 md:rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 md:gap-3.5 min-w-0">
                      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl max-md:rounded-[12px] flex-shrink-0 flex items-center justify-center ${getActivityIconBg(act.type).replace('border', 'md:border')}`}>
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-syne font-bold text-[13px] md:text-sm text-slate-900 truncate">
                          {act.title}
                        </h4>
                        <p className="text-[10px] md:text-xs text-slate-500 truncate mt-0.5">
                          {act.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <span className="text-[9px] md:text-[11px] text-slate-400 font-medium mb-1">
                        {act.time}
                      </span>
                      <span className={`inline-block px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full text-[9px] md:text-[11px] font-semibold capitalize ${getStatusBadgeStyle(act.status).replace('border', 'md:border')}`}>
                        {act.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Insights & Actions Stack (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Actions Card */}
          <div className="md:bg-surface md:border md:border-border-subtle rounded-2xl p-0 md:p-6 md:shadow-xs">
            <h2 className="font-syne font-bold text-lg text-slate-900 mb-3 max-md:px-2">
              Quick Actions
            </h2>
            <div className="flex md:flex-col gap-3 md:space-y-2.5 md:gap-0 overflow-x-auto snap-x hide-scrollbar max-md:-mx-4 max-md:px-4 max-md:pb-2">
              <button
                onClick={() => navigate('/student/community?compose=1&type=notice')}
                className="snap-start shrink-0 max-md:w-[240px] p-3 md:p-3.5 rounded-[20px] md:rounded-xl bg-white md:bg-surface max-md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:bg-blue-50/50 md:border md:border-border-subtle hover:border-blue-200 flex items-center justify-between text-sm font-semibold text-slate-900 hover:text-blue-700 transition-all group"
              >
                <span className="flex items-center gap-2.5 md:gap-3">
                  <div className="w-8 h-8 rounded-lg max-md:bg-slate-50 md:bg-surface md:border md:border-border-subtle flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                    <MessageSquare className="w-4 h-4 max-md:w-3.5 max-md:h-3.5" />
                  </div>
                  <span className="max-md:text-[13px]">Post a Notice</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/student/buy-sell?compose=1')}
                className="snap-start shrink-0 max-md:w-[240px] p-3 md:p-3.5 rounded-[20px] md:rounded-xl bg-white md:bg-surface max-md:shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:bg-blue-50/50 md:border md:border-border-subtle hover:border-blue-200 flex items-center justify-between text-sm font-semibold text-slate-900 hover:text-blue-700 transition-all group"
              >
                <span className="flex items-center gap-2.5 md:gap-3">
                  <div className="w-8 h-8 rounded-lg max-md:bg-slate-50 md:bg-surface md:border md:border-border-subtle flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                    <Store className="w-4 h-4 max-md:w-3.5 max-md:h-3.5" />
                  </div>
                  <span className="max-md:text-[13px]">Sell an Item</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Your Invites Card */}
          <div className="md:bg-surface md:border md:border-border-subtle max-md:bg-white max-md:border-none max-md:shadow-[0_4px_24px_rgb(0,0,0,0.03)] rounded-[24px] md:rounded-2xl p-5 md:p-6 md:shadow-xs space-y-4">
            <div>
              <h2 className="font-syne font-bold text-lg text-slate-900">
                Your Invites
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Share invite codes with verified campus friends
              </p>
            </div>

            {isInviteLoading ? (
              <ListSkeleton rows={2} />
            ) : availableCodes.length > 0 ? (
              <div className="space-y-3">
                {availableCodes.slice(0, 2).map((item: any) => (
                  <div
                    key={item.id}
                    className="md:bg-surface md:border md:border-border-subtle max-md:bg-slate-50 max-md:border-none rounded-[16px] md:rounded-xl p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[13px] md:text-sm tracking-wider text-slate-900">
                        {item.code}
                      </span>
                      <button
                        onClick={() => handleCopyInvite(item.code)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 text-text-secondary hover:text-text-primary transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === item.code ? (
                          <Check className="w-4 h-4 text-accent-green" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                      <span className="text-[11px] font-medium text-slate-500">
                        Ready to use
                      </span>
                      <button
                        onClick={() => handleShareInvite(item.code)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg max-md:rounded-[10px] bg-slate-900 text-white font-semibold text-[11px] md:text-xs hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="md:bg-surface md:border md:border-border-subtle max-md:bg-slate-50 max-md:border-none rounded-[16px] md:rounded-xl p-4 text-center space-y-3">
                <p className="text-[11px] md:text-xs text-slate-500 font-medium">
                  You have helped {usedCodesCount} friends join Campus Blink!
                </p>
                {cooldownRemaining > 0 ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      New invites available in
                    </p>
                    <p className="font-mono font-bold text-[13px] md:text-sm text-slate-900 mt-1">
                      {cooldownHours}:{cooldownMinutes}:{cooldownSeconds}
                    </p>
                  </div>
                ) : canRefreshNow ? (
                  <button
                    onClick={handleRefreshInvites}
                    disabled={isRefreshingInvites}
                    className="w-full py-2.5 px-3 rounded-[12px] md:rounded-xl bg-slate-900 text-white font-semibold text-[12px] hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    {isRefreshingInvites ? 'Generating...' : 'Generate New Invites'}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Reputation Progress Card */}
          <div className="md:bg-surface md:border md:border-border-subtle max-md:bg-white max-md:border-none max-md:shadow-[0_4px_24px_rgb(0,0,0,0.03)] rounded-[24px] md:rounded-2xl p-5 md:p-6 md:shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-syne font-bold text-lg text-slate-900">
                Reputation Points
              </h2>
              <span className="text-[10px] md:text-xs font-semibold text-accent-blue bg-accent-blue-soft border border-accent-blue-soft px-2.5 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-syne font-extrabold text-3xl text-slate-900">
                {repBalance}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Campus Credits
              </span>
            </div>
            <div className="h-2 md:h-2.5 w-full bg-slate-100 md:bg-surface-elevated border-none md:border md:border-border-subtle rounded-full overflow-hidden mt-3.5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(5, (repBalance / 100) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] md:text-[11px] text-slate-400 mt-2.5 leading-relaxed">
              {repToTrusted > 0
                ? `${repToTrusted} more points to reach Trusted Campus Member status.`
                : 'You have achieved Trusted Campus Member status!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

