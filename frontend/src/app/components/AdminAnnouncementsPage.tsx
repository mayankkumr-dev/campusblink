import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone, PlusCircle, Trash2, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';

const TYPE_STYLES: Record<string, string> = {
  urgent: 'border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  info: 'border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  update: 'border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export const AdminAnnouncementsPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ content: '', type: 'info' as 'info' | 'urgent' | 'update' });

  const loadAnnouncements = async () => {
    setIsLoading(true);
    const { data, error } = await getAnnouncements();
    if (error) toast.error(String(error));
    setAnnouncements(data || []);
    setIsLoading(false);
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const handleCreate = async () => {
    if (!formData.content.trim()) { toast.error('Please enter announcement content'); return; }
    setIsPublishing(true);
    const { error } = await createAnnouncement({
      message: formData.content,
      type: formData.type,
      target: 'all',
      is_active: true,
      created_by: profile?.id || null,
    });
    if (error) {
      toast.error(String(error));
    } else {
      toast.success('Announcement published successfully');
      setFormData({ content: '', type: 'info' });
      setIsComposerOpen(false);
      loadAnnouncements();
    }
    setIsPublishing(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await deleteAnnouncement(id);
    if (error) {
      toast.error(String(error));
    } else {
      toast.success('Announcement deleted');
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-admin-accent-soft-bg transition-colors">
            <Megaphone className="h-4.5 w-4.5 text-amber-600 dark:text-admin-accent transition-colors" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">Global Announcements</h2>
            <p className="text-xs text-slate-500 dark:text-admin-text-secondary transition-colors">Publish platform-wide notices to all users · {announcements.length} active</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsComposerOpen(v => !v)}
          className={`hidden md:inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${
            isComposerOpen
              ? 'border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface text-slate-600 dark:text-admin-text-secondary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover'
              : 'bg-amber-500 dark:bg-admin-accent text-white dark:text-admin-bg-surface-elevated shadow-amber-200 dark:shadow-none hover:bg-amber-600 dark:hover:bg-amber-400'
          }`}
        >
          {isComposerOpen ? <><X className="h-4 w-4" /> Close Composer</> : <><PlusCircle className="h-4 w-4" /> Create Announcement</>}
        </button>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => setIsComposerOpen(v => !v)}
          className={`md:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(245,158,11,0.35)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-transform active:scale-95 ${
            isComposerOpen ? 'bg-slate-800 dark:bg-admin-bg-surface-raised text-white dark:text-admin-text-primary' : 'bg-amber-500 dark:bg-admin-accent text-white dark:text-admin-bg-surface-elevated'
          }`}
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          {isComposerOpen ? <X className="h-6 w-6" /> : <PlusCircle className="h-6 w-6" />}
        </button>
      </div>

      {/* Composer */}
      {isComposerOpen && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 p-5 shadow-sm space-y-4 transition-colors">
          <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">New Announcement</h3>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary mb-1.5 transition-colors">Type</label>
            <div className="flex items-center gap-2">
              {(['info', 'update', 'urgent'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, type: t }))}
                  className={`rounded-xl border px-3.5 py-1.5 text-[12px] font-bold capitalize transition-all ${
                    formData.type === t
                      ? TYPE_STYLES[t] + ' ring-1 ring-current'
                      : 'border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface text-slate-500 dark:text-admin-text-secondary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary mb-1.5 transition-colors">Content</label>
            <textarea
              rows={5}
              value={formData.content}
              onChange={e => setFormData(f => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement here… (supports plain text, shown to all active users)"
              className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-4 py-3 text-sm text-slate-900 dark:text-admin-text-primary placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-4 py-2 text-sm font-semibold text-slate-600 dark:text-admin-text-secondary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPublishing || !formData.content.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 dark:bg-admin-accent px-5 py-2 text-sm font-bold text-white dark:text-admin-bg-surface-elevated shadow-sm shadow-amber-200 dark:shadow-none hover:bg-amber-600 dark:hover:bg-amber-400 disabled:opacity-60 transition-all"
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Publish
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface py-16 text-center transition-colors">
          <CheckCircle2 className="h-10 w-10 text-slate-200 dark:text-admin-text-tertiary mb-3 transition-colors" />
          <p className="font-semibold text-slate-500 dark:text-admin-text-secondary transition-colors">No announcements published yet.</p>
          <p className="text-sm text-slate-400 dark:text-admin-text-tertiary mt-1 transition-colors">Click "Create Announcement" to post a platform notice.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div
              key={a.id}
              className="relative rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] md:shadow-sm dark:shadow-none hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                <div className="flex-1 min-w-0 pr-8 md:pr-0">
                  <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 md:px-2.5 md:py-0.5 text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider transition-colors ${TYPE_STYLES[a.type] || TYPE_STYLES.info}`}>
                      {a.type || 'info'}
                    </span>
                    <span className="text-[10px] md:text-[11px] text-slate-400 dark:text-admin-text-tertiary font-bold uppercase tracking-wider transition-colors">
                      {new Date(a.created_at || a.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[13px] md:text-sm text-slate-700 dark:text-admin-text-primary leading-relaxed whitespace-pre-wrap transition-colors">
                    {a.message || a.content}
                  </p>
                </div>
                
                {/* Desktop Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="hidden md:block shrink-0 rounded-xl border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-60"
                  title="Delete announcement"
                >
                  {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>

                {/* Mobile Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="md:hidden absolute top-4 right-4 text-rose-300 dark:text-rose-500/50 hover:text-rose-500 dark:hover:text-rose-500 transition-colors disabled:opacity-50"
                  title="Delete announcement"
                >
                  {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
