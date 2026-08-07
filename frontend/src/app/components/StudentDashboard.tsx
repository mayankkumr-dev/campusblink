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
import { MapPin, X, Calendar, Upload, CheckCircle2 } from 'lucide-react';
import { getStudentSchedule } from '../../api/student';
import { getMyInviteOverview, requestInviteRefresh } from '../../api/invites';
import toast from 'react-hot-toast';
import { ListSkeleton, PostSkeleton } from './ui/Skeletons';

function getCurrentDayCode() {
  const d = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const map: Record<number, string> = { 0: 'SUN', 1: 'MON', 2: 'TUES', 3: 'WED', 4: 'THURS', 5: 'FRI', 6: 'SAT' };
  return map[d] || 'MON';
}

function getClassTimeStatus(startTime: string = '', endTime: string = '') {
  try {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    // Parse end time (e.g., '09:50' or '09:50 AM')
    const parseMins = (tStr: string) => {
      const clean = tStr.trim();
      const parts = clean.split(':');
      if (parts.length < 2) return 0;
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1].replace(/[^0-9]/g, ''), 10);
      if (clean.toLowerCase().includes('pm') && h < 12) h += 12;
      return h * 60 + m;
    };

    const startMins = parseMins(startTime);
    const endMins = parseMins(endTime);

    if (currentMins > endMins && endMins > 0) {
      return 'completed';
    } else if (currentMins >= startMins && currentMins <= endMins) {
      return 'in_progress';
    } else {
      return 'upcoming';
    }
  } catch (_) {
    return 'upcoming';
  }
}

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

  const [schedule, setSchedule] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('student_parsed_schedule');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [selectedDayTab, setSelectedDayTab] = useState<string>(getCurrentDayCode());


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

  const activeListingsCount = useMemo(() => recentActivity.filter((i) => i.type === 'Buy/Sell' && i.status !== 'sold').length, [recentActivity]);
  const canteenOrdersCount = useMemo(() => recentActivity.filter((i) => i.type === 'Canteen' && i.status !== 'delivered' && i.status !== 'completed').length, [recentActivity]);
  const printOrdersCount = useMemo(() => recentActivity.filter((i) => i.type === 'Print' && i.status !== 'completed' && i.status !== 'ready').length, [recentActivity]);

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
    getStudentSchedule().then(res => { if (res.data) setSchedule(res.data) });
  }, [profile?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRefreshAll = async () => {
    if (isRefreshingAll) return;
    setIsRefreshingAll(true);
    await Promise.all([
      loadRecentActivity(), 
      loadInvites(), 
      getStudentSchedule().then(res => { if (res.data) setSchedule(res.data) })
    ]);
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
      case 'Community': return <BookOpen className="w-4 h-4 text-purple-600" />;
      case 'Print': return <Printer className="w-4 h-4 text-cyan-600" />;
      case 'Canteen': return <Coffee className="w-4 h-4 text-amber-600" />;
      default: return <Store className="w-4 h-4 text-[#0066cc]" />;
    }
  };

  const getActivityIconBg = (type: string) => {
    switch (type) {
      case 'Community': return 'bg-purple-50 border border-purple-100';
      case 'Print': return 'bg-cyan-50 border border-cyan-100';
      case 'Canteen': return 'bg-amber-50 border border-amber-100';
      default: return 'bg-blue-50 border border-blue-100';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'ready' || s === 'completed' || s === 'delivered' || s === 'sold') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    }
    if (s === 'preparing' || s === 'pending' || s === 'placed') {
      return 'bg-amber-50 text-amber-700 border border-amber-100';
    }
    if (s === 'posted' || s === 'active') {
      return 'bg-blue-50 text-[#0066cc] border border-blue-100';
    }
    return 'bg-gray-100 text-gray-600 border border-gray-200';
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
      className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 bg-gray-50 min-h-full font-sans pb-24 md:pb-12 text-gray-900"
    >
      {/* Pull-to-refresh Indicator */}
      {pullDistance > 0 && (
        <div
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
          className="flex items-center justify-center text-slate-400 transition-all duration-150 overflow-hidden"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <RefreshCw className={`w-4 h-4 ${pullDistance > 50 ? 'animate-spin text-gray-800' : ''}`} />
            <span>{pullDistance > 50 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      {/* Offline Status Banner */}
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}>
                You are currently offline
              </p>
              <p className="text-xs text-amber-700 font-medium">
                Cached features available. New actions will sync when connection restores.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white self-start sm:self-auto shrink-0">
            Offline Mode
          </span>
        </motion.div>
      )}

      {/* 1. Identity & Greeting Hero Card (Linear/Arc Consumer App Style) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="relative z-10 space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-gray-900 tracking-tight leading-tight truncate" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
              Hello, {firstName}.
            </h1>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              title="Refresh dashboard"
              className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-400 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-sm md:text-base text-gray-400 font-medium max-w-lg leading-relaxed" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}>
            Your campus command center. Scan services, track live requests, and access daily essentials.
          </p>
        </div>

        {/* Reputation Stat */}
        <div className="relative z-10 flex items-center justify-between sm:justify-start gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-3.5 sm:px-5 sm:py-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Reputation Tier
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {repBalance >= 300 ? 'Trusted' : 'Member'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-extrabold text-xl sm:text-2xl text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>
                  {repBalance}
                </span>
                <span className="text-xs font-semibold text-gray-400">pts</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
            title="Refresh dashboard"
            className="hidden md:flex p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 active:scale-95 transition-all ml-2 min-h-[44px] min-w-[44px] items-center justify-center shadow-sm"
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
          className="flex-1 min-h-[46px] px-4 py-3 rounded-2xl bg-gray-900 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95 transition-all group select-none"
        >
          <PlusCircle className="w-4 h-4 text-gray-400 group-hover:scale-110 transition-transform" />
          <span>Sell an Item</span>
          <ChevronRight className="w-4 h-4 opacity-60 ml-auto sm:ml-1" />
        </button>

        <button
          onClick={() => navigate('/student/community?compose=1&type=notice')}
          className="flex-1 min-h-[46px] px-4 py-3 rounded-2xl bg-white border border-gray-100 text-gray-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all group select-none"
        >
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span>Post a Notice</span>
          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto sm:ml-1" />
        </button>
      </motion.div>

      
      <div className="hidden md:block w-full">
        {/* Today's Schedule & Classes Section (Pure Premium Light-Mode Theme) */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
              <Clock className="w-5 h-5 text-gray-400" strokeWidth={2} /> Today's Schedule
            </h2>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">
              {getCurrentDayCode()} • Automated Student Timetable
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/student/settings?section=schedule')}
              className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-100 active:scale-95 transition-all"
            >
              Edit Schedule
            </button>
            <button
              type="button"
              onClick={() => setShowTimetableModal(true)}
              className="text-sm font-semibold text-[#0066cc] flex items-center gap-1 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-100 active:scale-95 transition-all group"
            >
              Full Timetable <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Dynamic Loading Skeleton, Empty State, or Populated Schedule Cards */}
        {isRefreshingAll && schedule.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-gray-100 p-6 h-48 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
                <div className="h-6 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0066cc] border border-blue-100 flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
              Upload your schedule to see today's classes
            </h3>
            <p className="text-sm text-gray-400 font-medium max-w-md mx-auto mb-6 leading-relaxed">
              Our automated parsing engine extracts your lectures, room numbers, and batches directly from your university timetable PDF or image.
            </p>
            <button
              type="button"
              onClick={() => navigate('/student/settings?section=schedule')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#0066cc] text-white text-sm font-semibold active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" /> Upload Schedule
            </button>
          </div>
        ) : (
          (() => {
            const todayClasses = schedule.filter((c: any) => c.day === getCurrentDayCode()).sort((a: any, b: any) => {
              const parseTime = (timeString: string) => {
                if (!timeString) return 0;
                let [hourString, minuteString] = timeString.trim().split(':');
                if (!hourString || !minuteString) return 0;
                let parsedHour = parseInt(hourString, 10);
                if (timeString.toLowerCase().includes('pm') && parsedHour < 12) parsedHour += 12;
                if (timeString.toLowerCase().includes('am') && parsedHour === 12) parsedHour = 0;
                return parsedHour * 60 + parseInt(minuteString, 10);
              };
              return parseTime(a.startTime) - parseTime(b.startTime);
            });
            if (todayClasses.length === 0) {
              return (
                <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>No classes scheduled for today</h3>
                  <p className="text-sm text-gray-400 font-medium mb-4">You have a clear schedule on {getCurrentDayCode()}.</p>
                  <button
                    type="button"
                    onClick={() => setShowTimetableModal(true)}
                    className="text-xs font-bold text-[#0066cc] bg-blue-50 px-4 py-2 rounded-xl active:scale-95 transition-all"
                  >
                    View Entire Week
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {todayClasses.map((cls: any, idx: number) => {
                  const status = getClassTimeStatus(cls.startTime, cls.endTime);
                  const isCompleted = status === 'completed';
                  const isInProgress = status === 'in_progress';

                  return (
                    <div
                      key={cls.id || idx}
                      className={`bg-white rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden group shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                        isCompleted
                          ? 'border-gray-100 opacity-80 hover:opacity-100'
                          : isInProgress
                          ? 'border-blue-100 ring-1 ring-blue-200'
                          : 'border-gray-100'
                      }`}
                    >
                      {/* Left color bar */}
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full rounded-l-3xl ${
                          isCompleted ? 'bg-gray-200' : isInProgress ? 'bg-[#0066cc]' : 'bg-amber-400'
                        }`}
                      ></div>

                      {/* Header badge */}
                      <div className="flex justify-between items-start mb-5">
                        <span
                          className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-gray-100 text-gray-500'
                              : isInProgress
                              ? 'bg-[#0066cc] text-white'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Later Today'}
                        </span>
                        {cls.batch && (
                          <span className="text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-lg">
                            {cls.batch}
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <h3
                        className={`text-lg font-bold mb-2 ${
                          isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                        style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}
                      >
                        {cls.subject || cls.code || 'Lecture Class'}
                      </h3>

                      {/* Room */}
                      <p className="text-sm text-gray-400 flex items-center gap-2 mb-6 font-medium">
                        <MapPin className="w-4 h-4 text-gray-300" strokeWidth={2} />
                        Room {cls.room || 'TBA'}
                        {cls.statusLabel && ` • ${cls.statusLabel}`}
                      </p>

                      {/* Time */}
                      <div className="text-sm font-bold text-gray-900 flex items-center justify-between border-t border-gray-100 pt-4">
                        <span>{cls.startTime} - {cls.endTime}</span>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </section>
      </div>
      <div className="md:hidden w-full">
        {/* Today's Schedule (Swipeable UI) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>Today's Schedule</h2>
              <p className="text-[11px] font-medium text-gray-400">{getCurrentDayCode()} • Swipe to view</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/student/settings?section=schedule')}
                className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowTimetableModal(true)}
                className="text-xs font-semibold text-[#0066cc] bg-blue-50 px-3 py-1.5 rounded-xl active:scale-95 transition-all flex items-center gap-1"
              >
                Week <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isRefreshingAll && schedule.length === 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scroll-px-4 hide-scrollbar">
              {[1, 2].map((n) => (
                <div key={n} className="w-[260px] shrink-0 snap-start bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 animate-pulse h-40">
                  <div className="h-3.5 bg-gray-100 rounded w-1/3 mb-3" />
                  <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : schedule.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center my-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066cc] flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                Upload your schedule
              </h3>
              <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xs mx-auto mb-4">
                Extract your daily lectures, rooms, and batch numbers automatically from your timetable.
              </p>
              <button
                type="button"
                onClick={() => navigate('/student/settings?section=schedule')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0066cc] text-white text-xs font-semibold active:scale-95 transition-all"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Schedule
              </button>
            </div>
          ) : (() => {
            const todayClasses = schedule.filter((c: any) => c.day === getCurrentDayCode()).sort((a: any, b: any) => {
              const parseTime = (timeString: string) => {
                if (!timeString) return 0;
                let [hourString, minuteString] = timeString.trim().split(':');
                if (!hourString || !minuteString) return 0;
                let parsedHour = parseInt(hourString, 10);
                if (timeString.toLowerCase().includes('pm') && parsedHour < 12) parsedHour += 12;
                if (timeString.toLowerCase().includes('am') && parsedHour === 12) parsedHour = 0;
                return parsedHour * 60 + parseInt(minuteString, 10);
              };
              return parseTime(a.startTime) - parseTime(b.startTime);
            });
            if (todayClasses.length === 0) {
              return (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center my-1">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                    <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>No classes today</h3>
                  <p className="text-xs text-gray-400 font-medium mb-4">Your schedule is clear on {getCurrentDayCode()}.</p>
                  <button
                    type="button"
                    onClick={() => setShowTimetableModal(true)}
                    className="text-xs font-bold text-[#0066cc] bg-blue-50 px-4 py-2 rounded-xl active:scale-95 transition-all"
                  >
                    View Entire Week
                  </button>
                </div>
              );
            }

            return (
              <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scroll-px-4 hide-scrollbar">
                {todayClasses.map((cls: any, idx: number) => {
                  const status = getClassTimeStatus(cls.startTime, cls.endTime);
                  const isCompleted = status === 'completed';
                  const isInProgress = status === 'in_progress';

                  return (
                    <div
                      key={cls.id || idx}
                      className="w-[260px] shrink-0 snap-start bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between relative overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-gray-100 text-gray-400'
                                : isInProgress
                                ? 'bg-[#0066cc] text-white'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Later Today'}
                          </span>
                          {cls.batch && (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                              {cls.batch}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-base font-bold ${
                            isCompleted ? 'text-gray-300 line-through' : 'text-gray-900'
                          }`}
                          style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}
                        >
                          {cls.subject || cls.code || 'Lecture Class'}
                        </h3>

                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-gray-300" strokeWidth={1.75} />
                          Room {cls.room || 'TBA'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-900">
                        <span>{cls.startTime} - {cls.endTime}</span>
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      </div>

      {/* 3. Compact Grid of Services (2×2 Icon Grid / Apple Wallet Shortcuts) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-bold text-sm sm:text-base text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', letterSpacing: '-0.224px' }}>
            Campus Services
          </h2>
          <span className="text-xs text-gray-400 font-medium">
            Tap to open
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {/* Tile 1: Marketplace */}
          <button
            onClick={() => navigate('/student/buy-sell')}
            className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#0066cc] group-hover:scale-105 transition-transform shrink-0">
                <ShoppingBag className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              {isActivityLoading || isRefreshingAll ? (
                <div className="w-24 h-4 bg-gray-100 animate-pulse rounded" />
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {activeListingsCount > 0 ? `${activeListingsCount} Active Listing${activeListingsCount > 1 ? 's' : ''}` : 'Live Campus Market'}
                </span>
              )}
              <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                Marketplace
              </h3>
              <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">
                Buy, sell & trade items
              </p>
            </div>
          </button>

          {/* Tile 2: Canteen */}
          <button
            onClick={() => navigate('/student/canteen')}
            className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform shrink-0">
                <Utensils className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              {isActivityLoading || isRefreshingAll ? (
                <div className="w-24 h-4 bg-gray-100 animate-pulse rounded" />
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {canteenOrdersCount > 0 ? `${canteenOrdersCount} Order${canteenOrdersCount > 1 ? 's' : ''} in Progress` : 'Instant Pickup Ready'}
                </span>
              )}
              <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                Canteen
              </h3>
              <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">
                Pre-order meals & skip queues
              </p>
            </div>
          </button>

          {/* Tile 3: Print Shop */}
          <button
            onClick={() => navigate('/student/print')}
            className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-cyan-600 group-hover:scale-105 transition-transform shrink-0">
                <Printer className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              {isActivityLoading || isRefreshingAll ? (
                <div className="w-24 h-4 bg-gray-100 animate-pulse rounded" />
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  {printOrdersCount > 0 ? `${printOrdersCount} Job${printOrdersCount > 1 ? 's' : ''} Processing` : 'Document Services Ready'}
                </span>
              )}
              <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                Print Shop
              </h3>
              <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">
                Upload PDFs & pickup bound prints
              </p>
            </div>
          </button>

          {/* Tile 4: Diaries & Community */}
          <button
            onClick={() => navigate('/student/community')}
            className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 flex flex-col justify-between min-h-[148px] sm:min-h-[160px] text-left group select-none"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-1">
              {isActivityLoading || isRefreshingAll ? (
                <div className="w-24 h-4 bg-gray-100 animate-pulse rounded" />
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  Stories & Campus Secrets
                </span>
              )}
              <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                Diaries
              </h3>
              <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">
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
        className="bg-white border border-gray-100 rounded-3xl p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
              Recent Activity
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Today & this week across your campus interactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-[11px] font-semibold text-gray-500 border border-gray-100">
              <Activity className="w-3 h-3 text-gray-400" /> Live
            </span>
            <Link
              to="/student/notifications"
              className="text-xs font-semibold text-[#0066cc] min-h-[44px] flex items-center"
            >
              View all
            </Link>
          </div>
        </div>

        {/* List Content */}
        <div>
          {isActivityLoading || isRefreshingAll ? (
            <div className="py-2 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="w-36 h-4 bg-gray-100 rounded animate-pulse" />
                      <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-16 h-6 bg-gray-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-10 text-center space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <Activity className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>No recent activity yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Your campus activity including community posts, orders, and print requests will appear right here as a clean scannable list.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActivity.map((act, index) => (
                <div
                  key={index}
                  className="py-3.5 px-2 first:pt-1 last:pb-1 flex items-center justify-between gap-4 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${getActivityIconBg(act.type)}`}>
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 truncate" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', letterSpacing: '-0.224px' }}>
                        {act.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 truncate mt-0.5">
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
        className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all"
      >
        {/* Header Toggle Row */}
        <div
          onClick={() => setIsRewardsExpanded(!isRewardsExpanded)}
          className="p-5 md:p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors select-none min-h-[56px]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                  Rewards & Invites
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-100">
                  {availableCodes.length} Invites • {repBalance} pts
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage your campus reputation score and invite peers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 hidden sm:inline">
              {isRewardsExpanded ? 'Collapse' : 'See details'}
            </span>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
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
              className="border-t border-gray-100 overflow-hidden"
            >
              <div className="p-5 md:p-6 space-y-6 bg-gray-50">
                {/* Secondary Section Switcher Tabs */}
                <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                  <button
                    onClick={() => setSecondaryTab('rewards')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] active:scale-95 ${
                      secondaryTab === 'rewards'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-500 border border-gray-100'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Reputation Points</span>
                  </button>
                  <button
                    onClick={() => setSecondaryTab('invites')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] active:scale-95 ${
                      secondaryTab === 'invites'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-500 border border-gray-100'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Invite Friends ({availableCodes.length})</span>
                  </button>
                </div>

                {/* Tab 1: Reputation Points Breakdown */}
                {secondaryTab === 'rewards' && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Current Balance
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-extrabold text-3xl text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                            {repBalance}
                          </span>
                          <span className="text-sm text-gray-400 font-medium">
                            Campus Credits
                          </span>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          {repToTrusted > 0 ? `${repToTrusted} pts to Trusted Member` : '✓ Trusted Campus Member'}
                        </span>
                      </div>
                    </div>

                    {/* Tier Progress Bar */}
                    <div className="space-y-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span>Tier Progress</span>
                        <span>{repProgressPct}% to next milestone</span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full transition-all duration-700"
                          style={{ width: `${repProgressPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 pt-1 leading-relaxed">
                        Earn reputation points by posting helpful marketplace items, contributing to community diaries, and inviting verified campus friends.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 2: Your Invites */}
                {secondaryTab === 'invites' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 font-medium">
                        You have helped <strong className="text-gray-900">{usedCodesCount} friends</strong> join Campus Blink.
                      </p>
                      {canRefreshNow && (
                        <button
                          onClick={handleRefreshInvites}
                          disabled={isRefreshingInvites}
                          className="px-3 py-1.5 rounded-xl bg-gray-900 text-white font-semibold text-xs active:scale-95 transition-all shrink-0 min-h-[44px]"
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
                            className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm tracking-wider text-gray-900">
                                {item.code}
                              </span>
                              <button
                                onClick={() => handleCopyInvite(item.code)}
                                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Copy code"
                              >
                                {copiedCode === item.code ? (
                                  <Check className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-[11px] font-medium text-gray-400">
                                Ready to use
                              </span>
                              <button
                                onClick={() => handleShareInvite(item.code)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs active:scale-95 transition-all min-h-[44px]"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                Share
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <p className="text-xs text-gray-400 font-medium">
                          No unused invite codes right now.
                        </p>
                        {cooldownRemaining > 0 ? (
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                              New invites available in
                            </p>
                            <p className="font-mono font-bold text-sm text-gray-900">
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
{/* Full Timetable Weekly Grid Modal */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0066cc] border border-blue-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>Faculty Weekly Timetable</h3>
                  <p className="text-xs text-gray-400 font-medium">Complete Parsed Schedule • Semester Jan 2026</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimetableModal(false)}
                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day Tab Bar */}
            <div className="px-6 sm:px-8 pt-4 pb-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
              {['MON', 'TUES', 'WED', 'THURS', 'FRI', 'SAT'].map((dayCode) => {
                const count = (schedule.length > 0 ? schedule : []).filter((c: any) => c.day === dayCode).length;
                const isActive = selectedDayTab === dayCode;
                return (
                  <button
                    key={dayCode}
                    type="button"
                    onClick={() => setSelectedDayTab(dayCode)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center gap-2 active:scale-95 ${
                      isActive
                        ? 'bg-[#0066cc] text-white'
                        : 'bg-white text-gray-600 border border-gray-100'
                    }`}
                  >
                    {dayCode}
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                        isActive ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body: Timetable Grid */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gray-50">
              {(() => {
                const dayClasses = (schedule.length > 0 ? schedule : []).filter((c: any) => c.day === selectedDayTab).sort((a: any, b: any) => {
                  const parseTime = (timeString: string) => {
                    if (!timeString) return 0;
                    let [hourString, minuteString] = timeString.trim().split(':');
                    if (!hourString || !minuteString) return 0;
                    let parsedHour = parseInt(hourString, 10);
                    if (timeString.toLowerCase().includes('pm') && parsedHour < 12) parsedHour += 12;
                    if (timeString.toLowerCase().includes('am') && parsedHour === 12) parsedHour = 0;
                    return parsedHour * 60 + parseInt(minuteString, 10);
                  };
                  return parseTime(a.startTime) - parseTime(b.startTime);
                });
                if (dayClasses.length === 0) {
                  return (
                    <div className="py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-xl mx-auto">
                      <p className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>No classes scheduled on {selectedDayTab}</p>
                      <p className="text-xs text-gray-400">Upload your complete schedule from Account Settings.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayClasses.map((item: any, i: number) => (
                      <div
                        key={item.id || i}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-extrabold text-[#0066cc] bg-blue-50 px-3 py-1 rounded-lg">
                              {item.startTime} - {item.endTime}
                            </span>
                            <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                              Room {item.room}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                            {item.subject || item.code}
                          </h4>
                          {item.batch && (
                            <p className="text-xs text-gray-400 font-medium">Batch / Section: {item.batch}</p>
                          )}
                        </div>
                        {item.statusLabel && (
                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-400">
                            <span>Type: {item.statusLabel}</span>
                            <span className="text-gray-500 font-bold">{item.code || item.day}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 sm:px-8 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                Need to update your schedule? Go to Account Settings → Upload Schedule.
              </span>
              <button
                type="button"
                onClick={() => { setShowTimetableModal(false); navigate('/student/settings?section=schedule'); }}
                className="text-xs font-bold text-[#0066cc] bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 active:scale-95 transition-all"
              >
                Edit / Upload Timetable
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

