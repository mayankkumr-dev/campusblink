import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy,
  ChevronRight,
  ChevronDown,
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
  WifiOff,
  Sparkles,
  ShoppingBag,
  Utensils,
  Flame,
  BookOpen,
  RefreshCw,
  Gift,
  PlusCircle,
  TrendingUp,
  ChevronUp,
  SlidersHorizontal
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
  
  // Data state
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isInviteLoading, setIsInviteLoading] = useState(true);
  const [isRefreshingInvites, setIsRefreshingInvites] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // UI state for tucked secondary section
  const [secondaryTab, setSecondaryTab] = useState<'rewards' | 'invites'>('rewards');
  const [isRewardsExpanded, setIsRewardsExpanded] = useState(false);

  // Pull to refresh touch tracking
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState<number>(0);

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
  const repProgressPct = useMemo(() => Math.min(100, Math.max(8, Math.round((repBalance / 300) * 100))), [repBalance]);

  const loadRecentActivity = async () => {
    if (!profile?.id) return;
    setIsActivityLoading(true);
    try {
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

      setRecentActivity(combined);
    } catch (e) {
      console.error('Error loading recent activity:', e);
    } finally {
      setIsActivityLoading(false);
    }
  };

  const loadInvites = async () => {
    if (!profile?.id) return;
    setIsInviteLoading(true);
    try {
      const { data } = await getMyInviteOverview(profile.id);
      if (data) {
        setInviteData(data);
      }
    } catch (e) {
      console.error('Error loading invites:', e);
    } finally {
      setIsInviteLoading(false);
    }
  };

  useEffect(() => {
    loadRecentActivity();
    loadInvites();
  }, [profile?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRefreshAll = async () => {
    if (isRefreshingAll) return;
    setIsRefreshingAll(true);
    await Promise.all([loadRecentActivity(), loadInvites()]);
    setIsRefreshingAll(false);
    toast.success('Dashboard refreshed');
  };

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
        return <BookOpen className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />;
      case 'Print':
        return <Printer className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />;
      case 'Canteen':
        return <Coffee className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Store className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getActivityIconBg = (type: string) => {
    switch (type) {
      case 'Community':
        return 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/50';
      case 'Print':
        return 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/50 dark:border-cyan-800/50';
      case 'Canteen':
        return 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/50';
      default:
        return 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/50';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    // Semantic Status: Green = Done/Ready/Delivered/Sold
    if (s === 'ready' || s === 'completed' || s === 'delivered' || s === 'sold') {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
    }
    // Semantic Status: Amber = Pending/Preparing/Placed
    if (s === 'preparing' || s === 'pending' || s === 'placed') {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
    }
    // Semantic Status: Blue = Info/Posted/Active
    if (s === 'posted' || s === 'active') {
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20';
    }
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY !== null && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const diff = Math.max(0, currentY - touchStartY);
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.4, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50 && !isRefreshingAll) {
      handleRefreshAll();
    }
    setTouchStartY(null);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 bg-background min-h-full font-sans pb-24 md:pb-12 text-slate-900 dark:text-slate-100 transition-colors"
    >
      {/* Pull-to-refresh Indicator */}
      {pullDistance > 0 && (
        <div
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
          className="flex items-center justify-center text-slate-400 transition-all duration-150 overflow-hidden"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <RefreshCw className={`w-4 h-4 ${pullDistance > 50 ? 'animate-spin text-slate-800 dark:text-white' : ''}`} />
            <span>{pullDistance > 50 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      {/* Offline Status Banner */}
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 dark:border-amber-700/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-200 font-syne">
                You are currently offline
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/70 font-medium">
                Cached features available. New actions will sync when connection restores.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-2xs self-start sm:self-auto shrink-0">
            Offline Mode
          </span>
        </motion.div>
      )}

      {/* 1. Identity & Greeting Hero Card (Linear/Arc Consumer App Style) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        {/* Subtle Calm Gradient Glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-slate-100/60 dark:bg-slate-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-syne font-extrabold text-2xl sm:text-3xl md:text-4xl text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              Hello, {firstName}.
            </h1>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              title="Refresh dashboard"
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-[0.97] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
            Your campus command center. Scan services, track live requests, and access daily essentials.
          </p>
        </div>

        {/* Motivating Inline Reputation Stat */}
        <div className="relative z-10 flex items-center justify-between sm:justify-start gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-3.5 sm:px-5 sm:py-4 shrink-0 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  Reputation Tier
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {repBalance >= 300 ? 'Trusted' : 'Member'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-syne font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white">
                  {repBalance}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">pts</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
            title="Refresh dashboard"
            className="hidden md:flex p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-[0.97] transition-all ml-2 min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* 2. The One or Two Things Needing Action Today (Quick Actions Layer) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 sm:flex sm:items-center gap-3"
      >
        <button
          onClick={() => navigate('/student/buy-sell?compose=1')}
          className="flex-1 min-h-[46px] px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.97] transition-all group select-none"
        >
          <PlusCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform" />
          <span>Sell an Item</span>
          <ChevronRight className="w-4 h-4 opacity-60 ml-auto sm:ml-1 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => navigate('/student/community?compose=1&type=notice')}
          className="flex-1 min-h-[46px] px-4 py-3 rounded-2xl bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.97] transition-all group select-none"
        >
          <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
          <span>Post a Notice</span>
          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto sm:ml-1 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </motion.div>

      {/* 3. Compact Grid of Services (2×2 Icon Grid / Apple Wallet Shortcuts) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-syne font-bold text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-wider">
            Campus Services
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tap to open
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {/* Tile 1: Marketplace */}
          <button
            onClick={() => navigate('/student/buy-sell')}
            className="bg-white dark:bg-[#161922] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.97] transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none relative overflow-hidden"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                <ShoppingBag className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                <Flame className="w-3 h-3 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" /> High Activity
              </span>
              <h3 className="font-syne font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Marketplace
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                Buy, sell & trade items
              </p>
            </div>
          </button>

          {/* Tile 2: Canteen */}
          <button
            onClick={() => navigate('/student/canteen')}
            className="bg-white dark:bg-[#161922] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.97] transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none relative overflow-hidden"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform shrink-0">
                <Utensils className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                <Clock className="w-3 h-3 text-amber-500" /> Instant Pickup
              </span>
              <h3 className="font-syne font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Canteen
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                Pre-order meals & skip queues
              </p>
            </div>
          </button>

          {/* Tile 3: Print Shop */}
          <button
            onClick={() => navigate('/student/print')}
            className="bg-white dark:bg-[#161922] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.97] transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none relative overflow-hidden"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                <Printer className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                Document Services
              </span>
              <h3 className="font-syne font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Print Shop
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                Upload PDFs & pickup bound prints
              </p>
            </div>
          </button>

          {/* Tile 4: Diaries & Community */}
          <button
            onClick={() => navigate('/student/community')}
            className="bg-white dark:bg-[#161922] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.97] transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none relative overflow-hidden"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                Stories & Secrets
              </span>
              <h3 className="font-syne font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Diaries
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                Browse memories & peer posts
              </p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* 4. Recent Activity Feed (Clean List with Dividers) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-syne font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Recent Activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Today & this week across your campus interactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              <Activity className="w-3 h-3 text-slate-500" /> Live
            </span>
            <Link
              to="/student/notifications"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[44px] flex items-center"
            >
              View all
            </Link>
          </div>
        </div>

        {/* List Content */}
        <div>
          {isActivityLoading ? (
            <div className="py-2 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="w-36 h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-10 text-center space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Activity className="w-5 h-5" />
              </div>
              <p className="font-syne font-bold text-sm text-slate-900 dark:text-white">No recent activity yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your campus activity including community posts, orders, and print requests will appear right here as a clean scannable list.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentActivity.map((act, index) => (
                <div
                  key={index}
                  className="py-3.5 px-2 first:pt-1 last:pb-1 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${getActivityIconBg(act.type)}`}>
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-syne font-bold text-sm text-slate-900 dark:text-white truncate">
                        {act.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span className="truncate">{act.subtitle}</span>
                        <span>•</span>
                        <span className="shrink-0">{act.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusBadgeStyle(act.status)}`}>
                      {act.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 5. Tucked Utility Section: Rewards & Invites (Accordion/Tab Widget) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs transition-all"
      >
        {/* Header Toggle Row */}
        <div
          onClick={() => setIsRewardsExpanded(!isRewardsExpanded)}
          className="p-5 md:p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors select-none min-h-[56px]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-syne font-bold text-base text-slate-900 dark:text-white">
                  Rewards & Invites
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                  {availableCodes.length} Invites • {repBalance} pts
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your campus reputation score and invite peers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              {isRewardsExpanded ? 'Collapse' : 'See details'}
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              {isRewardsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Expandable Tabs Content */}
        <AnimatePresence>
          {isRewardsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-t border-slate-200/80 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 md:p-6 space-y-6 bg-slate-50/40 dark:bg-slate-900/40">
                {/* Secondary Section Switcher Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-4">
                  <button
                    onClick={() => setSecondaryTab('rewards')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] active:scale-[0.97] ${
                      secondaryTab === 'rewards'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                        : 'bg-white dark:bg-[#161922] text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Reputation Points</span>
                  </button>
                  <button
                    onClick={() => setSecondaryTab('invites')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] active:scale-[0.97] ${
                      secondaryTab === 'invites'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                        : 'bg-white dark:bg-[#161922] text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Invite Friends ({availableCodes.length})</span>
                  </button>
                </div>

                {/* Tab 1: Reputation Points Breakdown */}
                {secondaryTab === 'rewards' && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Current Balance
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-syne font-extrabold text-3xl text-slate-900 dark:text-white">
                            {repBalance}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Campus Credits
                          </span>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          {repToTrusted > 0 ? `${repToTrusted} pts to Trusted Member` : '✓ Trusted Campus Member'}
                        </span>
                      </div>
                    </div>

                    {/* Tier Progress Bar */}
                    <div className="space-y-2 bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Tier Progress</span>
                        <span>{repProgressPct}% to next milestone</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-700"
                          style={{ width: `${repProgressPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
                        Earn reputation points by posting helpful marketplace items, contributing to community diaries, and inviting verified campus friends.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 2: Your Invites */}
                {secondaryTab === 'invites' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        You have helped <strong className="text-slate-900 dark:text-white">{usedCodesCount} friends</strong> join Campus Blink.
                      </p>
                      {canRefreshNow && (
                        <button
                          onClick={handleRefreshInvites}
                          disabled={isRefreshingInvites}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.97] transition-all shadow-2xs shrink-0 min-h-[44px]"
                        >
                          {isRefreshingInvites ? 'Generating...' : 'Generate New Codes'}
                        </button>
                      )}
                    </div>

                    {isInviteLoading ? (
                      <ListSkeleton rows={2} />
                    ) : availableCodes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableCodes.map((item: any) => (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm tracking-wider text-slate-900 dark:text-white">
                                {item.code}
                              </span>
                              <button
                                onClick={() => handleCopyInvite(item.code)}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-[0.97] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Copy code"
                              >
                                {copiedCode === item.code ? (
                                  <Check className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Ready to use
                              </span>
                              <button
                                onClick={() => handleShareInvite(item.code)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] transition-all min-h-[44px]"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                Share
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-[#161922] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 text-center space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          No unused invite codes right now.
                        </p>
                        {cooldownRemaining > 0 ? (
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                              New invites available in
                            </p>
                            <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                              {cooldownHours}:{cooldownMinutes}:{cooldownSeconds}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
