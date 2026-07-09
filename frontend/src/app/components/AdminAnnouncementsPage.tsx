import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';

export const AdminAnnouncementsPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [formData, setFormData] = useState({ content: '', priority: 'Normal' });

  const loadAnnouncements = async () => {
    setIsLoading(true);
    const { data, error } = await getAnnouncements();
    if (error) toast.error(String(error));
    setAnnouncements(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!formData.content.trim()) {
      toast.error('Announcement content is required.');
      return;
    }

    const { error } = await createAnnouncement({
      message: formData.content,
      type: formData.priority === 'High' ? 'urgent' : 'info',
      target: 'all',
      is_active: true,
      created_by: profile?.id || null,
    });

    if (error) {
      toast.error(String(error));
      return;
    }

    toast.success('Announcement published.');
    setFormData({ content: '', priority: 'Normal' });
    setIsComposerOpen(false);
    loadAnnouncements();
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteAnnouncement(id);
    if (error) {
      toast.error(String(error));
      return;
    }
    toast.success('Announcement deleted.');
    loadAnnouncements();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-syne text-xl font-bold text-[var(--text-primary)]"><Megaphone className="h-5 w-5 text-[var(--yellow)]" /> Global Announcements</h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Live data from Supabase</p>
        </div>
        <button onClick={() => setIsComposerOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--yellow)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-yellow-400">
          <PlusCircle className="h-4 w-4" /> {isComposerOpen ? 'Close Composer' : 'Create Announcement'}
        </button>
      </div>

      {isComposerOpen && (
        <div className="space-y-4 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-5">
          <textarea value={formData.content} onChange={(event) => setFormData({ ...formData, content: event.target.value })} placeholder="Announcement content" rows={5} className="w-full rounded-lg border border-black/10 bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]" />
          <div className="flex items-center justify-between gap-3">
            <select value={formData.priority} onChange={(event) => setFormData({ ...formData, priority: event.target.value })} className="rounded-lg border border-black/10 bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]">
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
            <button onClick={handleCreate} className="rounded-lg bg-[var(--yellow)] px-5 py-3 text-sm font-bold text-[var(--text-primary)]">Publish</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-[var(--yellow)]" /></div>
      ) : announcements.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${announcement.type === 'urgent' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}>
                      {announcement.type || 'info'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{announcement.message || announcement.content}</p>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">{new Date(announcement.created_at || announcement.date).toLocaleString()}</p>
                </div>
                <button onClick={() => handleDelete(announcement.id)} className="rounded-lg bg-[#DC2626]/10 p-2 text-[#DC2626] transition-colors hover:bg-[#DC2626]/20"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-black/10 bg-[var(--bg)] p-10 text-center text-sm text-[var(--text-secondary)]">No announcements published yet.</div>
      )}
    </div>
  );
};
