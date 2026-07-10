import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone, PlusCircle, Trash2, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';

const TYPE_STYLES: Record<string, string> = {
  urgent: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  update: 'border-amber-200 bg-amber-50 text-amber-700',
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
            <Megaphone className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">Global Announcements</h2>
            <p className="text-xs text-slate-500">Publish platform-wide notices to all users · {announcements.length} active</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsComposerOpen(v => !v)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${
            isComposerOpen
              ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600'
          }`}
        >
          {isComposerOpen ? <><X className="h-4 w-4" /> Close Composer</> : <><PlusCircle className="h-4 w-4" /> Create Announcement</>}
        </button>
      </div>

      {/* Composer */}
      {isComposerOpen && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-900">New Announcement</h3>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Type</label>
            <div className="flex items-center gap-2">
              {(['info', 'update', 'urgent'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, type: t }))}
                  className={`rounded-xl border px-3.5 py-1.5 text-[12px] font-bold capitalize transition-all ${
                    formData.type === t
                      ? TYPE_STYLES[t] + ' ring-1 ring-current'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Content</label>
            <textarea
              rows={5}
              value={formData.content}
              onChange={e => setFormData(f => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement here… (supports plain text, shown to all active users)"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPublishing || !formData.content.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-amber-200 hover:bg-amber-600 disabled:opacity-60 transition-all"
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
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-slate-200 mb-3" />
          <p className="font-semibold text-slate-500">No announcements published yet.</p>
          <p className="text-sm text-slate-400 mt-1">Click "Create Announcement" to post a platform notice.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_STYLES[a.type] || TYPE_STYLES.info}`}>
                      {a.type || 'info'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(a.created_at || a.date).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {a.message || a.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="shrink-0 rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition-colors disabled:opacity-60"
                  title="Delete announcement"
                >
                  {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
