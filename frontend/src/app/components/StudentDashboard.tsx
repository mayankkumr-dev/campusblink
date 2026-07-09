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
  ExternalLink
} from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle';
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
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'Print':
        return <Printer className="w-5 h-5 text-cyan-600" />;
      case 'Canteen':
        return <Coffee className="w-5 h-5 text-amber-600" />;
      default:
        return <Store className="w-5 h-5 text-blue-600" />;
    }
  };

  const getActivityIconBg = (type: string) => {
    switch (type) {
      case 'Community':
        return 'bg-purple-50 border border-purple-100';
      case 'Print':
        return 'bg-cyan-50 border border-cyan-100';
      case 'Canteen':
        return 'bg-amber-50 border border-amber-100';
      default:
        return 'bg-blue-50 border border-blue-100';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'ready' || s === 'completed' || s === 'delivered') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    }
    if (s === 'preparing' || s === 'pending' || s === 'placed') {
      return 'bg-amber-50 text-amber-700 border border-amber-200/60';
    }
    if (s === 'posted' || s === 'active') {
      return 'bg-blue-50 text-blue-700 border border-blue-200/60';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200/60';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-full">
      {/* Top Header Row (Mobile / Quick Profile Bar) */}
      <div className="flex justify-between items-center md:hidden bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-2xs">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo2/Blue_transparent.png" alt="Campus Blink" className="h-8 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate('/student/notifications')}
            className="relative p-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Hero Header Card (Light Mode Premium SaaS Aesthetic) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle Decorative Light Pattern Accents */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-48 h-48 bg-amber-50/50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <h1 className="font-syne font-extrabold text-3xl md:text-4xl text-slate-900 tracking-tight leading-tight">
              Hello, {firstName}.
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl">
              Welcome back to your campus command center. Explore listings, track canteen & print requests, and connect with your peers.
            </p>
          </div>

          {/* Mini Reputation Snapshot Card */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 md:px-5 md:py-4 shrink-0">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Reputation Score
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-syne font-extrabold text-2xl text-slate-900">
                  {repBalance}
                </span>
                <span className="text-xs font-semibold text-slate-500">pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Quick Service Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Buy & Sell',
            subtitle: 'Campus Marketplace',
            badge: 'All Colleges',
            path: '/student/buy-sell',
            icon: Store,
            iconClass: 'bg-blue-50 text-blue-600 border border-blue-100',
          },
          {
            title: 'Canteen',
            subtitle: 'Order Food & Drinks',
            badge: 'Your Campus Only',
            path: '/student/canteen',
            icon: Coffee,
            iconClass: 'bg-amber-50 text-amber-600 border border-amber-100',
          },
          {
            title: 'Print Shop',
            subtitle: 'Document Services',
            badge: 'Your Campus Only',
            path: '/student/print',
            icon: Printer,
            iconClass: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
          },
          {
            title: 'Community',
            subtitle: 'Discussions & Posts',
            badge: 'All Colleges',
            path: '/student/community',
            icon: Users,
            iconClass: 'bg-purple-50 text-purple-600 border border-purple-100',
          },
        ].map((item, i) => {
          const IconComponent = item.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-200 group min-h-[148px]"
            >
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.iconClass} transition-transform group-hover:scale-105`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-syne font-bold text-lg text-slate-900">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-2.5">
                  {item.subtitle}
                </p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 border border-slate-200/70 text-slate-600">
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
              <h2 className="font-syne font-bold text-xl text-slate-900">
                Recent Activity
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Latest updates across your campus interactions
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-600">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              Live
            </span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-xs">
            {isInviteLoading && recentActivity.length === 0 ? (
              <div className="space-y-4 py-2">
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="font-syne font-bold text-base text-slate-900">No recent activity</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your campus activity including community discussions, canteen orders, and print requests will appear right here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((act, index) => (
                  <div
                    key={index}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${getActivityIconBg(act.type)}`}>
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-syne font-bold text-sm text-slate-900 truncate">
                          {act.title}
                        </h4>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {act.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <span className="text-[11px] text-slate-400 font-medium mb-1">
                        {act.time}
                      </span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${getStatusBadgeStyle(act.status)}`}>
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
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-xs">
            <h2 className="font-syne font-bold text-lg text-slate-900 mb-3">
              Quick Actions
            </h2>
            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/student/community?compose=1&type=notice')}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 flex items-center justify-between text-sm font-semibold text-slate-900 hover:text-blue-700 transition-all group"
              >
                <span className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  Post a Notice
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/student/buy-sell?compose=1')}
                className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 flex items-center justify-between text-sm font-semibold text-slate-900 hover:text-blue-700 transition-all group"
              >
                <span className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                    <Store className="w-4 h-4" />
                  </div>
                  Sell an Item
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Your Invites Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
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
                    className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm tracking-wider text-slate-900">
                        {item.code}
                      </span>
                      <button
                        onClick={() => handleCopyInvite(item.code)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-900 transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === item.code ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                      <span className="text-[11px] font-medium text-slate-500">
                        Ready to use
                      </span>
                      <button
                        onClick={() => handleShareInvite(item.code)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center space-y-3">
                <p className="text-xs text-slate-600 font-medium">
                  You have helped {usedCodesCount} friends join Campus Blink!
                </p>
                {cooldownRemaining > 0 ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      New invites available in
                    </p>
                    <p className="font-mono font-bold text-sm text-slate-900 mt-1">
                      {cooldownHours}:{cooldownMinutes}:{cooldownSeconds}
                    </p>
                  </div>
                ) : canRefreshNow ? (
                  <button
                    onClick={handleRefreshInvites}
                    disabled={isRefreshingInvites}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
                  >
                    {isRefreshingInvites ? 'Generating...' : 'Generate New Invites'}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Reputation Progress Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-syne font-bold text-lg text-slate-900">
                Reputation Points
              </h2>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
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
            <div className="h-2.5 w-full bg-slate-100 border border-slate-200/70 rounded-full overflow-hidden mt-3.5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(5, (repBalance / 100) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5">
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

