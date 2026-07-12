import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  UtensilsCrossed, Printer, Clock, ChevronRight, 
  Users, FileText, MessageSquare, MapPin, CheckCircle2,
  LayoutDashboard, Bell, Calendar, Upload, X, Sparkles, BookOpen, WifiOff, CreditCard
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { getProfessorOrders, getTodayOrdersCount, getPendingPaymentsTotal, getProfessorSchedule } from '../../api/professor';
import { ListSkeleton } from './ui/Skeletons';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getCurrentDayCode() {
  const d = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const map: Record<number, string> = { 1: 'MON', 2: 'TUES', 3: 'WED', 4: 'THURS', 5: 'FRI' };
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

export const ProfessorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const firstName = getFirstName(profile?.name, 'Professor');

  const [orders, setOrders] = useState<any[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [schedule, setSchedule] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('prof_parsed_schedule');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [showTimetableModal, setShowTimetableModal] = useState(false);
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
  const [selectedDayTab, setSelectedDayTab] = useState<string>(getCurrentDayCode());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const [ordersRes, todayRes, pendingRes, scheduleRes] = await Promise.all([
        profile?.id ? getProfessorOrders(profile.id, 5) : Promise.resolve({ data: [] }),
        profile?.id ? getTodayOrdersCount(profile.id) : Promise.resolve({ data: 0 }),
        profile?.id ? getPendingPaymentsTotal(profile.id) : Promise.resolve({ data: 0 }),
        getProfessorSchedule(),
      ]);
      if (!mounted) return;
      setOrders(ordersRes.data || []);
      setTodayCount(todayRes.data || 0);
      setPendingTotal(pendingRes.data || 0);
      setSchedule(Array.isArray(scheduleRes?.data) ? scheduleRes.data : []);
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [profile?.id]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20 font-sans bg-[#FAFAFA] dark:bg-prof-bg-base min-h-screen transition-colors duration-200 text-gray-900 dark:text-prof-text-primary">
      <div className="hidden md:block">
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="mt-6 bg-amber-500/15 dark:bg-amber-950/50 border border-amber-400/50 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-200 font-syne">
                You are currently offline
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 font-medium">
                Campus Blink is running in offline mode. Cached timetable and profile details are available. Actions will sync automatically when reconnected.
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs self-start sm:self-auto shrink-0">
            Offline Mode
          </span>
        </div>
      )}

      {/* Professor Profile Summary Header */}
      <header className="pt-12 pb-14 border-b border-gray-200/60 dark:border-prof-border-subtle mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 dark:text-prof-text-tertiary uppercase mb-3">
              Faculty Dashboard
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-prof-text-primary tracking-tight font-syne leading-tight">
              {getGreeting()}, <br className="hidden sm:block" />Prof. {firstName}.
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-gray-600 dark:text-prof-text-secondary font-medium">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] dark:shadow-none"></span>
                Computer Science
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] dark:shadow-none"></span>
                Senior Professor
              </span>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-xs font-semibold tracking-widest text-gray-400 dark:text-prof-text-tertiary uppercase mb-1">Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-prof-text-primary font-syne">3 Classes</p>
             </div>
             <div className="w-px h-12 bg-gray-200 dark:bg-prof-border-subtle mx-2 self-end hidden sm:block"></div>
             <div className="text-right">
                <p className="text-xs font-semibold tracking-widest text-gray-400 dark:text-prof-text-tertiary uppercase mb-1">Pending Dues</p>
                <p className={`text-2xl font-bold font-syne ${pendingTotal > 0 ? 'text-red-500 dark:text-prof-accent-red' : 'text-gray-900 dark:text-prof-text-primary'}`}>
                   ₹{pendingTotal.toLocaleString()}
                </p>
             </div>
          </div>
        </div>
      </header>

      {/* Today's Schedule & Classes Section (Pure Premium Light-Mode Theme) */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-prof-text-primary font-syne flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400 dark:text-prof-text-tertiary" strokeWidth={2} /> Today's Schedule
            </h2>
            <p className="text-xs font-semibold text-gray-400 dark:text-prof-text-tertiary mt-0.5">
              {getCurrentDayCode()} • Automated Faculty Timetable
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/professor/settings?section=schedule')}
              className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1.5 bg-emerald-50/70 dark:bg-emerald-900/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 px-3.5 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40"
            >
              Edit Schedule
            </button>
            <button
              type="button"
              onClick={() => setShowTimetableModal(true)}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1 group bg-blue-50/70 dark:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-3.5 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800/40"
            >
              Full Timetable <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Dynamic Loading Skeleton, Empty State, or Populated Schedule Cards */}
        {loading && schedule.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle p-6 h-48">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-4" />
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <div className="bg-white dark:bg-prof-bg-surface rounded-[2rem] border border-gray-200/80 dark:border-prof-border-subtle p-8 sm:p-10 shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-none text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center mx-auto mb-5 shadow-sm dark:shadow-none">
              <Calendar className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-prof-text-primary font-syne mb-2">
              Upload your schedule to see today's classes
            </h3>
            <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium max-w-md mx-auto mb-6 leading-relaxed">
              Our automated parsing engine extracts your lectures, room numbers, and batches directly from your university timetable PDF or image.
            </p>
            <button
              type="button"
              onClick={() => navigate('/professor/settings?section=schedule')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-[0_6px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_8px_25px_rgba(37,99,235,0.35)] transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" /> Upload Schedule
            </button>
          </div>
        ) : (
          (() => {
            const todayClasses = schedule.filter((c: any) => c.day === getCurrentDayCode());
            if (todayClasses.length === 0) {
              return (
                <div className="bg-white dark:bg-prof-bg-surface rounded-[2rem] border border-gray-100 dark:border-prof-border-subtle p-8 text-center shadow-sm dark:shadow-none">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-prof-text-primary font-syne mb-1">No classes scheduled for today</h3>
                  <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium mb-4">You have a clear schedule on {getCurrentDayCode()}.</p>
                  <button
                    type="button"
                    onClick={() => setShowTimetableModal(true)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl"
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
                      className={`bg-white dark:bg-prof-bg-surface rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden group ${
                        isCompleted
                          ? 'border-gray-100/80 dark:border-prof-border-subtle shadow-sm opacity-80 hover:opacity-100'
                          : isInProgress
                          ? 'border-blue-200 dark:border-blue-500/40 shadow-[0_12px_35px_rgba(37,99,235,0.08)] ring-1 ring-blue-500/20'
                          : 'border-gray-100 dark:border-prof-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-none hover:shadow-[0_16px_40px_rgb(0,0,0,0.06)]'
                      }`}
                    >
                      {/* Left color bar */}
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full rounded-l-3xl ${
                          isCompleted
                            ? 'bg-gray-300 dark:bg-prof-border-strong'
                            : isInProgress
                            ? 'bg-blue-600'
                            : 'bg-amber-400 dark:bg-prof-accent-orange'
                        }`}
                      ></div>

                      {/* Header badge */}
                      <div className="flex justify-between items-start mb-5">
                        <span
                          className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-gray-100 dark:bg-prof-bg-surface-raised text-gray-600 dark:text-prof-text-secondary'
                              : isInProgress
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-amber-50 dark:bg-prof-accent-orange-soft-bg text-amber-700 dark:text-prof-accent-orange border border-amber-100 dark:border-transparent'
                          }`}
                        >
                          {isCompleted
                            ? 'Completed'
                            : isInProgress
                            ? 'In Progress'
                            : 'Later Today'}
                        </span>
                        {cls.batch && (
                          <span className="text-[11px] font-bold text-gray-500 dark:text-prof-text-secondary bg-gray-50 dark:bg-prof-bg-surface-raised border border-gray-100 dark:border-prof-border-subtle px-2.5 py-0.5 rounded-lg">
                            {cls.batch}
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <h3
                        className={`text-lg font-bold mb-2 font-syne ${
                          isCompleted ? 'text-gray-500 dark:text-prof-text-tertiary line-through' : 'text-gray-900 dark:text-prof-text-primary'
                        }`}
                      >
                        {cls.subject || cls.code || 'Lecture Class'}
                      </h3>

                      {/* Room */}
                      <p className="text-sm text-gray-500 dark:text-prof-text-secondary flex items-center gap-2 mb-6 font-medium">
                        <MapPin className="w-4 h-4 text-gray-400 dark:text-prof-text-tertiary" strokeWidth={2} />
                        Room {cls.room || 'TBA'}
                        {cls.statusLabel && ` • ${cls.statusLabel}`}
                      </p>

                      {/* Time */}
                      <div className="text-sm font-bold text-gray-900 dark:text-prof-text-primary flex items-center justify-between border-t border-gray-100 dark:border-prof-border-subtle pt-4">
                        <span>{cls.startTime} - {cls.endTime}</span>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 transition-colors" />
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

      {/* Full Timetable Weekly Grid Modal */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-prof-bg-surface rounded-[2rem] border border-gray-200 dark:border-prof-border-subtle shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-prof-border-subtle flex items-center justify-between bg-white dark:bg-prof-bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-prof-text-primary font-syne">Faculty Weekly Timetable</h3>
                  <p className="text-xs text-gray-500 dark:text-prof-text-secondary font-medium">Complete Parsed Schedule • Semester Jan 2026</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimetableModal(false)}
                className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-prof-bg-surface-raised hover:bg-gray-100 dark:hover:bg-prof-border-subtle text-gray-500 dark:text-prof-text-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day Tab Bar */}
            <div className="px-6 sm:px-8 pt-4 pb-2 bg-gray-50/60 dark:bg-prof-bg-surface-raised/50 border-b border-gray-100 dark:border-prof-border-subtle flex items-center gap-2 overflow-x-auto">
              {['MON', 'TUES', 'WED', 'THURS', 'FRI'].map((dayCode) => {
                const count = (schedule.length > 0 ? schedule : []).filter((c: any) => c.day === dayCode).length;
                const isActive = selectedDayTab === dayCode;
                return (
                  <button
                    key={dayCode}
                    type="button"
                    onClick={() => setSelectedDayTab(dayCode)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-prof-bg-surface text-gray-600 dark:text-prof-text-secondary border border-gray-200 dark:border-prof-border-subtle hover:bg-gray-50 dark:hover:bg-prof-bg-surface-hover'
                    }`}
                  >
                    {dayCode}
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                        isActive ? 'bg-blue-700 text-white' : 'bg-gray-100 dark:bg-prof-bg-surface-raised text-gray-600 dark:text-prof-text-secondary'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body: Timetable Grid */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-[#FAFAFA] dark:bg-prof-bg-surface-raised/30">
              {(() => {
                const dayClasses = (schedule.length > 0 ? schedule : []).filter((c: any) => c.day === selectedDayTab);
                if (dayClasses.length === 0) {
                  return (
                    <div className="py-16 text-center bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle max-w-xl mx-auto">
                      <p className="text-base font-bold text-gray-900 dark:text-prof-text-primary font-syne mb-1">No classes scheduled on {selectedDayTab}</p>
                      <p className="text-xs text-gray-500 dark:text-prof-text-secondary">Upload your complete schedule from Professor Settings.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayClasses.map((item: any, i: number) => (
                      <div
                        key={item.id || i}
                        className="bg-white dark:bg-prof-bg-surface rounded-2xl p-5 border border-gray-200/80 dark:border-prof-border-subtle shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                              {item.startTime} - {item.endTime}
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-prof-text-secondary bg-gray-50 dark:bg-prof-bg-surface-raised border border-gray-100 dark:border-prof-border-subtle px-2.5 py-1 rounded-lg">
                              Room {item.room}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-prof-text-primary font-syne mb-1">
                            {item.subject || item.code}
                          </h4>
                          {item.batch && (
                            <p className="text-xs text-gray-500 dark:text-prof-text-secondary font-medium">Batch / Section: {item.batch}</p>
                          )}
                        </div>
                        {item.statusLabel && (
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-prof-border-subtle flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-prof-text-tertiary">
                            <span>Type: {item.statusLabel}</span>
                            <span className="text-gray-500 dark:text-prof-text-secondary font-bold">{item.code || item.day}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 sm:px-8 py-4 bg-white dark:bg-prof-bg-surface border-t border-gray-100 dark:border-prof-border-subtle flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-prof-text-tertiary font-medium">
                Need to update your schedule? Go to Account Settings → Upload Schedule.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowTimetableModal(false);
                  navigate('/professor/settings?section=schedule');
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800/40"
              >
                Edit / Upload Timetable
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="hidden md:block">
      {/* Quick Actions & Controls Panel */}
      <section className="mb-14">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-prof-text-primary font-syne mb-6 flex items-center gap-2">
           <LayoutDashboard className="w-5 h-5 text-gray-400 dark:text-prof-text-tertiary" strokeWidth={2} /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <button className="flex flex-col items-center justify-center p-6 bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none hover:-translate-y-1 hover:border-blue-100 dark:hover:border-prof-accent-blue/30 transition-all duration-300 group gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-prof-accent-indigo-soft-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="w-6 h-6 text-indigo-600 dark:text-prof-accent-indigo" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-prof-text-primary">Mark Attendance</span>
          </button>
          
          <button className="flex flex-col items-center justify-center p-6 bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none hover:-translate-y-1 hover:border-amber-100 dark:hover:border-prof-accent-orange/30 transition-all duration-300 group gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-prof-accent-orange-soft-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-amber-600 dark:text-prof-accent-orange" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-prof-text-primary">Post Notice</span>
          </button>
          
          <button onClick={() => navigate('/professor/canteen')} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none hover:-translate-y-1 hover:border-emerald-100 dark:hover:border-prof-accent-green/30 transition-all duration-300 group gap-4 relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-prof-accent-green-soft-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <UtensilsCrossed className="w-6 h-6 text-emerald-600 dark:text-prof-accent-green" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-prof-text-primary">Canteen Order</span>
          </button>

          <button onClick={() => navigate('/professor/print')} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none hover:-translate-y-1 hover:border-sky-100 dark:hover:border-prof-accent-blue/30 transition-all duration-300 group gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-prof-accent-blue-soft-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Printer className="w-6 h-6 text-sky-600 dark:text-prof-accent-blue" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-prof-text-primary">Print Jobs</span>
          </button>
        </div>
      </section>

      {/* Recent Activity & Notifications Feed */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-prof-text-primary font-syne flex items-center gap-2">
             <Bell className="w-5 h-5 text-gray-400 dark:text-prof-text-tertiary" strokeWidth={2} /> Recent Activity
          </h2>
        </div>
        
        <div className="bg-white dark:bg-prof-bg-surface rounded-3xl p-3 sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-none border border-gray-100 dark:border-prof-border-subtle">
          {loading ? (
            <div className="p-4 space-y-4">
               <ListSkeleton rows={3} />
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-prof-border-subtle">
              {/* Combine real orders and dummy activities for a complete feed */}
              <div className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/80 dark:hover:bg-prof-bg-surface-hover transition-colors rounded-2xl group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-blue-50/50 dark:bg-prof-accent-blue-soft-bg flex items-center justify-center shrink-0 border border-blue-100 dark:border-prof-accent-blue/20 text-blue-500 dark:text-prof-accent-blue group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-gray-900 dark:text-prof-text-primary font-bold font-syne">Department Meeting Scheduled</p>
                  <p className="text-sm text-gray-500 dark:text-prof-text-secondary mt-1">HOD has scheduled a faculty meeting in Conference Room B.</p>
                </div>
                <span className="text-xs font-semibold text-gray-400 dark:text-prof-text-tertiary whitespace-nowrap pt-1">2h ago</span>
              </div>

              {orders.map(order => (
                 <div key={order.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/80 dark:hover:bg-prof-bg-surface-hover transition-colors rounded-2xl group cursor-pointer">
                    <div className="w-11 h-11 rounded-full bg-gray-50 dark:bg-prof-bg-surface-raised flex items-center justify-center shrink-0 border border-gray-100 dark:border-prof-border-subtle text-gray-500 dark:text-prof-text-secondary group-hover:scale-105 transition-transform">
                       {order._type === 'canteen' ? <UtensilsCrossed className="w-5 h-5" strokeWidth={1.5} /> : <Printer className="w-5 h-5" strokeWidth={1.5} />}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                       <p className="text-sm text-gray-900 dark:text-prof-text-primary font-bold font-syne">
                          {order._type === 'canteen' ? 'Canteen Order Status' : 'Print Job Update'}
                       </p>
                       <p className="text-sm text-gray-500 dark:text-prof-text-secondary mt-1 line-clamp-1">
                          {order.shop?.name || 'Campus Shop'} • ₹{order.total_amount || order.amount || 0} • 
                          <span className="capitalize ml-1 font-medium text-gray-700 dark:text-prof-text-primary">{order.status}</span>
                       </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-400 dark:text-prof-text-tertiary whitespace-nowrap pt-1">{formatDate(order.created_at)}</span>
                 </div>
              ))}
              
              <div className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/80 dark:hover:bg-prof-bg-surface-hover transition-colors rounded-2xl group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-rose-50/50 dark:bg-prof-accent-red/10 flex items-center justify-center shrink-0 border border-rose-100 dark:border-prof-accent-red/20 text-rose-500 dark:text-prof-accent-red group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-gray-900 dark:text-prof-text-primary font-bold font-syne">Student Leave Request</p>
                  <p className="text-sm text-gray-500 dark:text-prof-text-secondary mt-1">Rahul Sharma (CS201) requested leave for medical reasons.</p>
                </div>
                <span className="text-xs font-semibold text-gray-400 dark:text-prof-text-tertiary whitespace-nowrap pt-1">Yesterday</span>
              </div>
            </div>
          )}
        </div>
      </section>
      </div>

      {/* ========================================================
          MOBILE PWA EXCLUSIVE VIEW
          ======================================================== */}
      <div className="md:hidden pb-16 font-sans text-gray-900 dark:text-prof-text-primary bg-[#FAFAFA] dark:bg-prof-bg-base transition-colors duration-200">
        {/* Offline Status Banner for Mobile */}
        {isOffline && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/40 border border-transparent dark:border-amber-800/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200 font-syne">Offline Mode</p>
                <p className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">Cached timetable active</p>
              </div>
            </div>
          </div>
        )}

        {/* Header & Greeting Section */}
        <header className="pt-6 pb-6">
          <p className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-prof-text-tertiary uppercase mb-1">
            FACULTY DASHBOARD • {getCurrentDayCode()}
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-prof-text-primary tracking-tight font-syne leading-tight">
            {getGreeting()}, Prof. {firstName}
          </h1>
          <p className="text-xs font-medium text-gray-500 dark:text-prof-text-secondary mt-1">
            Computer Science • Senior Professor
          </p>

          {/* Sleek Side-by-Side Floating Pill Cards */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div
              onClick={() => setShowTimetableModal(true)}
              className="bg-white dark:bg-prof-bg-surface rounded-2xl p-3.5 border border-transparent dark:border-prof-border-subtle shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50/80 dark:bg-prof-accent-blue-soft-bg flex items-center justify-center text-blue-600 dark:text-prof-accent-blue shrink-0">
                <Clock className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-prof-text-tertiary uppercase">Today's Classes</p>
                <p className="text-base font-extrabold text-gray-900 dark:text-prof-text-primary font-syne truncate">
                  {schedule.filter((c: any) => c.day === getCurrentDayCode()).length} Classes
                </p>
              </div>
            </div>

            <div
              onClick={() => navigate('/professor/payments')}
              className="bg-white dark:bg-prof-bg-surface rounded-2xl p-3.5 border border-transparent dark:border-prof-border-subtle shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50/80 dark:bg-prof-accent-emerald/15 flex items-center justify-center text-emerald-600 dark:text-prof-accent-emerald shrink-0">
                <CreditCard className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-prof-text-tertiary uppercase">Pending Dues</p>
                <p className="text-base font-extrabold text-gray-900 dark:text-prof-text-primary font-syne truncate">
                  ₹{pendingTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Today's Schedule (Swipeable UI) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-prof-text-primary font-syne tracking-tight">Today's Schedule</h2>
              <p className="text-[11px] font-medium text-gray-400 dark:text-prof-text-tertiary">{getCurrentDayCode()} • Swipe to view</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/professor/settings?section=schedule')}
                className="text-xs font-semibold text-emerald-600 dark:text-prof-accent-emerald bg-emerald-50/80 dark:bg-prof-accent-emerald/15 hover:bg-emerald-100/70 px-3 py-1.5 rounded-xl transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowTimetableModal(true)}
                className="text-xs font-semibold text-blue-600 dark:text-prof-accent-blue bg-blue-50/80 dark:bg-prof-accent-blue-soft-bg hover:bg-blue-100/70 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
              >
                Week <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loading && schedule.length === 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
              {[1, 2].map((n) => (
                <div key={n} className="w-[260px] shrink-0 bg-white dark:bg-prof-bg-surface rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none animate-pulse h-40">
                  <div className="h-3.5 bg-gray-100 dark:bg-prof-bg-surface-raised rounded w-1/3 mb-3" />
                  <div className="h-5 bg-gray-100 dark:bg-prof-bg-surface-raised rounded w-3/4 mb-2" />
                  <div className="h-3.5 bg-gray-100 dark:bg-prof-bg-surface-raised rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : schedule.length === 0 ? (
            <div className="bg-white dark:bg-prof-bg-surface border border-transparent dark:border-prof-border-subtle rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none text-center my-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-prof-accent-blue-soft-bg text-blue-600 dark:text-prof-accent-blue flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-prof-text-primary font-syne mb-1">
                Upload your schedule
              </h3>
              <p className="text-xs text-gray-500 dark:text-prof-text-secondary font-medium leading-relaxed max-w-xs mx-auto mb-4">
                Extract your daily lectures, rooms, and batch numbers automatically from your timetable.
              </p>
              <button
                type="button"
                onClick={() => navigate('/professor/settings?section=schedule')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 dark:bg-prof-accent-blue-soft-bg hover:bg-blue-100/80 text-blue-600 dark:text-prof-accent-blue text-xs font-bold transition-all active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Schedule
              </button>
            </div>
          ) : (() => {
            const todayClasses = schedule.filter((c: any) => c.day === getCurrentDayCode());
            if (todayClasses.length === 0) {
              return (
                <div className="bg-white dark:bg-prof-bg-surface border border-transparent dark:border-prof-border-subtle rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none text-center my-1">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-prof-accent-emerald/15 text-emerald-600 dark:text-prof-accent-emerald flex items-center justify-center mx-auto mb-2.5">
                    <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-prof-text-primary font-syne mb-1">No classes today</h3>
                  <p className="text-xs text-gray-500 dark:text-prof-text-secondary font-medium mb-4">Your schedule is clear on {getCurrentDayCode()}.</p>
                  <button
                    type="button"
                    onClick={() => setShowTimetableModal(true)}
                    className="text-xs font-bold text-blue-600 dark:text-prof-accent-blue bg-blue-50/80 dark:bg-prof-accent-blue-soft-bg px-4 py-2 rounded-xl"
                  >
                    View Entire Week
                  </button>
                </div>
              );
            }

            return (
              <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 hide-scrollbar">
                {todayClasses.map((cls: any, idx: number) => {
                  const status = getClassTimeStatus(cls.startTime, cls.endTime);
                  const isCompleted = status === 'completed';
                  const isInProgress = status === 'in_progress';

                  return (
                    <div
                      key={cls.id || idx}
                      className="w-[260px] shrink-0 snap-start bg-white dark:bg-prof-bg-surface border border-transparent dark:border-prof-border-subtle rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col justify-between relative overflow-hidden"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-gray-100 dark:bg-prof-bg-surface-raised text-gray-500 dark:text-prof-text-tertiary'
                                : isInProgress
                                ? 'bg-blue-600 text-white'
                                : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Later Today'}
                          </span>
                          {cls.batch && (
                            <span className="text-[10px] font-bold text-gray-500 dark:text-prof-text-tertiary bg-gray-50 dark:bg-prof-bg-surface-raised px-2 py-0.5 rounded-md">
                              {cls.batch}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-base font-bold font-syne line-clamp-1 ${
                            isCompleted ? 'text-gray-400 dark:text-prof-text-tertiary line-through' : 'text-gray-900 dark:text-prof-text-primary'
                          }`}
                        >
                          {cls.subject || cls.code || 'Lecture Class'}
                        </h3>

                        <p className="text-xs text-gray-500 dark:text-prof-text-secondary flex items-center gap-1.5 mt-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-prof-text-tertiary" strokeWidth={1.75} />
                          Room {cls.room || 'TBA'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100/70 dark:border-prof-border-subtle flex items-center justify-between text-xs font-bold text-gray-800 dark:text-prof-text-primary">
                        <span>{cls.startTime} - {cls.endTime}</span>
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 transition-colors" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* Quick Actions Grid */}
        <section className="mb-8">
          <h2 className="text-base font-extrabold text-gray-900 dark:text-prof-text-primary font-syne tracking-tight mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => navigate('/professor/attendance')}
              className="group flex flex-col items-center justify-start p-2 rounded-2xl active:scale-95 transition-all focus:outline-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50/60 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 dark:text-prof-text-secondary text-center mt-2 leading-tight">Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/professor/notices')}
              className="group flex flex-col items-center justify-start p-2 rounded-2xl active:scale-95 transition-all focus:outline-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50/60 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 dark:text-prof-text-secondary text-center mt-2 leading-tight">Post Notice</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/professor/canteen')}
              className="group flex flex-col items-center justify-start p-2 rounded-2xl active:scale-95 transition-all focus:outline-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50/60 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 dark:text-prof-text-secondary text-center mt-2 leading-tight">Canteen</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/professor/print')}
              className="group flex flex-col items-center justify-start p-2 rounded-2xl active:scale-95 transition-all focus:outline-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-50/60 dark:bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                <Printer className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 dark:text-prof-text-secondary text-center mt-2 leading-tight">Print Jobs</span>
            </button>
          </div>
        </section>

        {/* Recent Activity Feed */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-prof-text-primary font-syne tracking-tight">Recent Activity</h2>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-prof-text-tertiary">Live feed</span>
          </div>

          <div className="bg-white dark:bg-prof-bg-surface border border-transparent dark:border-prof-border-subtle rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
            {loading ? (
              <div className="p-2 space-y-3">
                <ListSkeleton rows={3} />
              </div>
            ) : (
              <div className="divide-y divide-gray-100/70 dark:divide-prof-border-subtle">
                <div className="py-3 flex items-start gap-3.5 first:pt-1 last:pb-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-50/70 dark:bg-prof-accent-blue-soft-bg text-blue-600 dark:text-prof-accent-blue flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-prof-text-primary font-syne truncate">Department Meeting Scheduled</p>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-prof-text-tertiary shrink-0">2h ago</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-prof-text-secondary font-normal leading-normal mt-0.5 line-clamp-1">
                      HOD has scheduled a faculty meeting in Conference Room B.
                    </p>
                  </div>
                </div>

                {orders.map((order) => (
                  <div key={order.id} className="py-3 flex items-start gap-3.5 first:pt-1 last:pb-1">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-prof-bg-surface-raised text-gray-600 dark:text-prof-text-secondary flex items-center justify-center shrink-0">
                      {order._type === 'canteen' ? (
                        <UtensilsCrossed className="w-4 h-4" strokeWidth={1.5} />
                      ) : (
                        <Printer className="w-4 h-4" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-900 dark:text-prof-text-primary font-syne truncate">
                          {order._type === 'canteen' ? 'Canteen Order Status' : 'Print Job Update'}
                        </p>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-prof-text-tertiary shrink-0">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-prof-text-secondary font-normal leading-normal mt-0.5 line-clamp-1">
                        {order.shop?.name || 'Campus Shop'} • ₹{order.total_amount || order.amount || 0} •{' '}
                        <span className="capitalize font-medium text-gray-700 dark:text-prof-text-primary">{order.status}</span>
                      </p>
                    </div>
                  </div>
                ))}

                <div className="py-3 flex items-start gap-3.5 first:pt-1 last:pb-1">
                  <div className="w-9 h-9 rounded-xl bg-rose-50/70 dark:bg-prof-accent-red/15 text-rose-500 dark:text-prof-accent-red flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-prof-text-primary font-syne truncate">Student Leave Request</p>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-prof-text-tertiary shrink-0">Yesterday</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-prof-text-secondary font-normal leading-normal mt-0.5 line-clamp-1">
                      Rahul Sharma (CS201) requested leave for medical reasons.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
