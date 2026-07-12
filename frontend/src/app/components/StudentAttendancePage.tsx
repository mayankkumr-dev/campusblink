import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Calendar as CalendarIcon,
  TrendingUp,
  ChevronRight,
  Flag,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getStudentAttendanceSummary,
  getStudentSubjectHistory,
  raiseAttendanceDispute
} from '../../api/attendance';
import { io as socketIOClient } from 'socket.io-client';

interface SubjectSummary {
  subjectId: string;
  classesHeld: number;
  classesAttended: number;
  percentage: number;
  safeToMiss: {
    status: 'safe' | 'recovery';
    classesSafeToMiss: number;
    classesNeededToRecover: number;
    message: string;
    currentPercentage: number;
    thresholdPercent: number;
  };
}

interface StudentSummaryResponse {
  studentId: string;
  overallPercentage: number;
  totalClassesHeld: number;
  totalClassesAttended: number;
  thresholdPercent: number;
  status: string;
  subjects: SubjectSummary[];
}

interface HistoryItem {
  sessionId: string;
  date: string;
  timeSlot: string;
  status: 'present' | 'absent' | 'voided';
  sessionStatus: string;
  recordId?: string | null;
}

export const StudentAttendancePage: React.FC = () => {
  const [summary, setSummary] = useState<StudentSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<number>(75);

  // Subject detail / History modal
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjectHistory, setSubjectHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Dispute modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState<boolean>(false);
  const [disputeTargetRecordId, setDisputeTargetRecordId] = useState<string>('');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [submittingDispute, setSubmittingDispute] = useState<boolean>(false);

  const loadSummary = async (thresh = threshold) => {
    try {
      setLoading(true);
      const data = await getStudentAttendanceSummary('me', thresh);
      setSummary(data);

      // Check low attendance notification push
      if (data.overallPercentage < thresh && data.totalClassesHeld > 0) {
        toast((t) => (
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="text-xs font-semibold text-slate-800 dark:text-white">
              <p className="font-bold">Attendance Standing Notice ({data.overallPercentage}%)</p>
              <p className="text-slate-600 dark:text-slate-300 font-normal">Your overall attendance is currently below your {thresh}% academic threshold.</p>
            </div>
          </div>
        ), { duration: 5000 });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load attendance analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary(threshold);
  }, [threshold]);

  // Socket.io real-time connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const socket = socketIOClient(socketUrl, {
      withCredentials: true,
    });

    socket.on('connect', () => {
      socket.emit('joinRoom', 'attendance_admin');
    });

    socket.on('attendance:updated', () => {
      toast.success('Live Classroom Update: Attendance records have been submitted!');
      loadSummary(threshold);
    });

    return () => {
      socket.disconnect();
    };
  }, [threshold]);

  // Load subject history when a card is clicked
  const handleOpenSubjectDetail = async (subjectId: string) => {
    setSelectedSubject(subjectId);
    setHistoryLoading(true);
    try {
      const res = await getStudentSubjectHistory('me', subjectId);
      setSubjectHistory(res.history || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load class history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeTargetRecordId || !disputeReason.trim()) {
      toast.error('Please provide a reason for this attendance review request');
      return;
    }

    setSubmittingDispute(true);
    try {
      await raiseAttendanceDispute(disputeTargetRecordId, disputeReason);
      toast.success('Attendance review request submitted successfully!');
      setDisputeModalOpen(false);
      setDisputeReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Helper colors for hero stat
  const getPercentageColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700/60';
    if (pct >= 65) return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700/60';
    return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700/60';
  };

  const getPercentageBarColor = (pct: number) => {
    if (pct >= 75) return 'bg-emerald-500';
    if (pct >= 65) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // Format professional guidance messages without informal slang
  const formatAcademicMarginMessage = (safeInfo: SubjectSummary['safeToMiss']) => {
    if (safeInfo.status === 'safe') {
      if (safeInfo.classesSafeToMiss === 0) {
        return `You are currently at the required threshold (${safeInfo.thresholdPercent}%). Attending all upcoming lectures is recommended.`;
      }
      return `Leave Margin: You may take approved leave for up to ${safeInfo.classesSafeToMiss} upcoming lecture${safeInfo.classesSafeToMiss === 1 ? '' : 's'} while staying above ${safeInfo.thresholdPercent}%.`;
    } else {
      return `Recovery Plan: You must attend the next ${safeInfo.classesNeededToRecover} consecutive lecture${safeInfo.classesNeededToRecover === 1 ? '' : 's'} to restore standing above ${safeInfo.thresholdPercent}%.`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--bg-primary)] p-4 md:p-6 transition-colors pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Configurable Academic Threshold Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Academic Attendance Portal
            </h1>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
              Live subject-wise standing, leave margin analysis, and classroom record verification
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Minimum Requirement:
            </span>
            <select
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="bg-transparent text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value={75}>75% (Standard)</option>
              <option value={80}>80% (Strict)</option>
              <option value={65}>65% (Minimum)</option>
            </select>
          </div>
        </div>

        {/* HERO STAT CARD */}
        {summary && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cumulative Attendance Summary
              </span>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl md:text-5xl font-black px-4 py-2 rounded-2xl border ${getPercentageColor(summary.overallPercentage)}`}>
                  {summary.overallPercentage}%
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  ({summary.totalClassesAttended} lectures attended out of {summary.totalClassesHeld} conducted)
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-xl">
                {summary.overallPercentage >= threshold
                  ? 'Your overall attendance standing fulfills institute requirements. Continue regular lecture attendance to maintain your standing.'
                  : 'Your attendance is currently below the academic threshold. Please review the recovery requirements for individual subjects below.'}
              </p>
            </div>

            {/* Attendance Margin overview box */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 max-w-sm w-full space-y-2">
              <div className="flex items-center gap-2.5">
                {summary.overallPercentage >= threshold ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                )}
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Leave Allowance & Recovery
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Subject cards below calculate how many upcoming classes you may take leave from or must attend to preserve a minimum {threshold}% record.
              </p>
            </div>
          </div>
        )}

        {/* PER-SUBJECT CARDS */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Subject-Wise Performance & Leave Margin Analysis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary?.subjects.map(subj => {
              const safeInfo = subj.safeToMiss;
              const isSafe = safeInfo.status === 'safe';

              return (
                <div
                  key={subj.subjectId}
                  onClick={() => handleOpenSubjectDetail(subj.subjectId)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-500/80 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {subj.subjectId}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {subj.classesAttended} Attended • {subj.classesHeld} Conducted
                      </p>
                    </div>

                    <span className={`text-xl font-black px-3.5 py-1 rounded-xl border ${getPercentageColor(subj.percentage)}`}>
                      {subj.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getPercentageBarColor(subj.percentage)}`}
                      style={{ width: `${Math.min(100, subj.percentage)}%` }}
                    />
                  </div>

                  {/* Academic margin & allowance banner */}
                  <div className={`rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2.5 ${
                    isSafe
                      ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-900 dark:text-rose-300 border border-rose-500/30'
                  }`}>
                    {isSafe ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span className="flex-1 leading-normal">{formatAcademicMarginMessage(safeInfo)}</span>
                    <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
                  </div>
                </div>
              );
            })}

            {summary?.subjects.length === 0 && (
              <div className="col-span-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No attendance records available yet
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  As faculty members record lecture attendance, your subject-wise standing and leave allowance will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SUBJECT DETAIL MODAL (CLASS-BY-CLASS HISTORY) */}
        {selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedSubject} — Lecture Attendance Register
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Tap any session record to request correction if marked in error
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubject(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {historyLoading ? (
                  <div className="py-8 text-center text-sm font-semibold text-slate-500">Loading lecture history...</div>
                ) : subjectHistory.length === 0 ? (
                  <div className="py-8 text-center text-sm font-semibold text-slate-500">No lecture sessions recorded for this subject.</div>
                ) : (
                  subjectHistory.map((item, idx) => {
                    const isPresent = item.status === 'present';
                    const isVoided = item.status === 'voided';

                    return (
                      <div
                        key={item.sessionId || idx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs ${
                            isVoided
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : isPresent
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {isVoided ? 'VOID' : isPresent ? 'P' : 'A'}
                          </div>

                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {item.timeSlot} • Status: <span className="font-bold uppercase">{item.status}</span>
                            </p>
                          </div>
                        </div>

                        {!isVoided && item.recordId && (
                          <button
                            type="button"
                            onClick={() => {
                              setDisputeTargetRecordId(String(item.recordId));
                              setDisputeModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Flag className="w-3.5 h-3.5 text-amber-500" />
                            <span>Request Correction</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* REQUEST CORRECTION MODAL */}
        {disputeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <form onSubmit={handleRaiseDispute} className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Flag className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Request Attendance Correction
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Please provide specific details explaining why this attendance entry should be reviewed (e.g. "Present in lecture hall row 3 during physical roll call").
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Explanation & Verification Note
                </label>
                <textarea
                  rows={3}
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Enter verifiable details for faculty review..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  {submittingDispute ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
