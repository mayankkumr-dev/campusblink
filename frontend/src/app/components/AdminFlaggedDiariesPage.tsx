/**
 * AdminFlaggedDiariesPage.tsx
 *
 * Superadmin panel page for inspecting and managing AI-flagged Campus Diaries.
 * Enforces a clean, premium light/dark mode aesthetic with breathable layout.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, Trash2, CheckCircle, ShieldAlert, RefreshCw, BookOpen, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFlaggedDiaries, deleteAdminDiaryEntry, restoreFlaggedDiary } from '../../api/diary';
import { getAvatarDataUrl } from '../../lib/avatar';

export const AdminFlaggedDiariesPage: React.FC = () => {
  const [flaggedEntries, setFlaggedEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadFlagged = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await getFlaggedDiaries();
    if (error) {
      toast.error(error.message || 'Could not load flagged diaries.');
    } else {
      setFlaggedEntries(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFlagged();
  }, [loadFlagged]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this flagged diary and remove the photo from S3 storage?')) {
      return;
    }
    setProcessingId(id);
    const { error } = await deleteAdminDiaryEntry(id);
    setProcessingId(null);
    if (error) {
      toast.error(error.message || 'Failed to permanently delete diary.');
    } else {
      toast.success('Permanently deleted diary entry and photo.');
      setFlaggedEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleRestore = async (id: string) => {
    if (!window.confirm('Restore this diary back to the active public campus feed?')) {
      return;
    }
    setProcessingId(id);
    const { error } = await restoreFlaggedDiary(id);
    setProcessingId(null);
    if (error) {
      toast.error(error.message || 'Failed to restore diary.');
    } else {
      toast.success('Restored to active campus feed!');
      setFlaggedEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-background p-6 md:p-10 font-sans select-none transition-colors">
      {/* Page Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-border-subtle pb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm shrink-0">
            <Flag size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-text-primary tracking-tight flex items-center gap-2.5">
              <span>Flagged Campus Diaries</span>
              {flaggedEntries.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                  {flaggedEntries.length} Requires Review
                </span>
              )}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-text-secondary mt-1">
              Automated AI safety queue. Entries flagged by AWS Rekognition are automatically removed from the student feed and placed here.
            </p>
          </div>
        </div>

        <button
          onClick={loadFlagged}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-elevated hover:bg-slate-100 dark:hover:bg-surface border border-slate-200 dark:border-border-subtle text-slate-700 dark:text-text-primary font-bold text-xs transition-all shadow-sm self-start sm:self-center disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-surface rounded-3xl border border-slate-200 dark:border-border-subtle shadow-sm">
            <RefreshCw size={28} className="animate-spin text-amber-500 dark:text-amber-400 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-text-secondary">Checking AI safety review queue...</p>
          </div>
        ) : flaggedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-surface rounded-3xl border border-slate-200 dark:border-border-subtle shadow-sm text-center px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <CheckCircle size={32} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-text-primary">All Clean! No Flagged Diaries</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-text-secondary max-w-md mt-1">
              AWS Rekognition has not detected any safety violations in recent uploads. Any flagged photos will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {flaggedEntries.map((entry) => {
                const avatarUrl =
                  entry.author?.avatar_url ||
                  getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id || entry.id });

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-surface rounded-[28px] border border-slate-200 dark:border-border-subtle shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Flagged Alert Banner */}
                      <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/40 px-6 py-3 flex items-start gap-3 text-rose-900 dark:text-rose-200">
                        <ShieldAlert size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold leading-snug">
                            {entry.flagged_reason || 'AI Moderation Safety Violation'}
                          </p>
                          {entry.moderation_labels && Array.isArray(entry.moderation_labels) && entry.moderation_labels.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {entry.moderation_labels.map((lbl: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-rose-100/80 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[10px] font-extrabold"
                                >
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Author Header */}
                      <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-border-subtle">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatarUrl}
                            alt={entry.author?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-border-subtle border border-slate-200 dark:border-border-subtle"
                          />
                          <div>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-text-primary leading-snug">
                              {entry.author?.name || 'Campus Student'}
                            </p>
                            <p className="text-[11px] font-medium text-slate-400 dark:text-text-secondary">
                              {entry.author?.email || 'No email'} • {new Date(entry.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-surface-elevated text-slate-600 dark:text-text-secondary border border-slate-200 dark:border-border-subtle">
                          ID: {entry.id.slice(0, 8)}
                        </span>
                      </div>

                      {/* Uploaded Photo & Note Inspection */}
                      <div className="p-6">
                        {entry.image_url ? (
                          <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-border-subtle shadow-sm bg-slate-50 dark:bg-surface-elevated relative group">
                            <img
                              src={entry.image_url}
                              alt="Flagged upload"
                              className="w-full max-h-72 object-contain mx-auto"
                            />
                            <a
                              href={entry.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-xs font-bold flex items-center gap-1.5 shadow backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity"
                            >
                              <span>Open Original</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : (
                          <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-surface-elevated border border-slate-200 dark:border-border-subtle text-center text-xs font-semibold text-slate-400 dark:text-text-secondary">
                            No photo attached (Text check flagged)
                          </div>
                        )}

                        <div className="p-4 rounded-2xl bg-[#FFFDF2] dark:bg-surface-elevated border border-stone-200 dark:border-border-subtle shadow-inner">
                          <p className="text-xs font-bold text-stone-400 dark:text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
                            <BookOpen size={13} />
                            <span>Handwritten Note Details</span>
                          </p>
                          <p className="text-sm font-medium text-stone-800 dark:text-text-primary whitespace-pre-wrap leading-relaxed font-serif">
                            {entry.content}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions Bar */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-surface-elevated border-t border-slate-200 dark:border-border-subtle flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleRestore(entry.id)}
                        disabled={processingId === entry.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-border-subtle text-slate-700 dark:text-text-primary hover:text-emerald-700 dark:hover:text-emerald-400 font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Restore to Feed</span>
                      </button>

                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={processingId === entry.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        <span>Permanently Delete</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
