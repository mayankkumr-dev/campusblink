import React, { useEffect, useState } from 'react';
import { Loader2, Check, X, Clock, User, Mail, MapPin, Building, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getPendingProfessors, approveProfessor, rejectProfessor } from '../../api/professor';
import { getAvatarDataUrl } from '../../lib/avatar';

export const AdminProfessorsPendingPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [professors, setProfessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await getPendingProfessors();
    setProfessors(data || []);
    setLoading(false);
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' mins ago';
    return Math.floor(seconds) + ' secs ago';
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (profId: string) => {
    if (!profile?.id) return;
    setActingOn(profId);
    const { error } = await approveProfessor(profile.id, profId);
    if (error) {
      toast.error('Failed to approve professor.');
    } else {
      toast.success('Professor approved! ✅');
      setProfessors(prev => prev.filter(p => p.id !== profId));
    }
    setActingOn(null);
  };

  const handleReject = async () => {
    if (!profile?.id || !rejectModal) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    setActingOn(rejectModal.id);
    const { error } = await rejectProfessor(profile.id, rejectModal.id, rejectReason.trim());
    if (error) {
      toast.error('Failed to reject professor.');
    } else {
      toast.success('Professor application rejected.');
      setProfessors(prev => prev.filter(p => p.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    }
    setActingOn(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne font-extrabold text-2xl text-[var(--text-primary)]">Pending Professor Requests</h1>
        </div>
        <span className="px-3 py-1 rounded-md bg-[#FEF9C3] text-[var(--yellow-dark)] text-sm font-bold border border-[#F59E0B]/30">
          {professors.length} pending
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--yellow-dark)]" />
        </div>
      ) : professors.length === 0 ? (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-12 text-center flex flex-col items-center">
          <User className="w-10 h-10 text-[var(--border)] mb-4" />
          <p className="font-syne font-semibold text-lg text-[var(--text-primary)] mb-1">No pending professor requests</p>
          <p className="font-sans text-sm text-[var(--text-secondary)]">New requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {professors.map(prof => {
            const avatar = prof.avatar_url || getAvatarDataUrl({ name: prof.name, seed: prof.id });
            return (
              <div key={prof.id} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <img loading="lazy" src={avatar} alt={prof.name} className="h-12 w-12 rounded-full object-cover border border-[var(--border)]" />
                  <div className="flex-1">
                    <h3 className="font-syne font-semibold text-base text-[var(--text-primary)]">{prof.name} <span className="font-sans text-sm text-[var(--text-secondary)] font-medium ml-2">@{prof.username}</span></h3>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="font-sans text-sm text-[var(--text-secondary)]">{prof.email}</span>
                      <span className="font-sans text-sm text-[var(--text-primary)]">Staff Room: {prof.staff_room_number || 'N/A'}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 roundedbg-[#FEF9C3] bg-[#FEF9C3] text-[var(--yellow-dark)] text-xs font-bold border border-[#F59E0B]/30 rounded-md">
                          {prof.colleges?.name || prof.college || 'N/A'}
                        </span>
                        <span className="font-sans text-xs text-[var(--text-secondary)]">Applied {formatTimeAgo(prof.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(prof.id)}
                      disabled={actingOn === prof.id}
                      className="h-9 px-4 rounded-md bg-[#22C55E] text-white text-sm font-bold hover:bg-[#16A34A] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => setRejectModal({ id: prof.id, name: prof.name })}
                      disabled={actingOn === prof.id}
                      className="h-9 px-4 rounded-md border border-[#DC2626] text-[#DC2626] text-sm font-bold hover:bg-[#DC2626] hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5 shadow-lg">
            <h3 className="font-syne font-bold text-lg text-[var(--text-primary)] mb-1">Reject Professor Application</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Rejecting <strong>{rejectModal.name}</strong>'s application</p>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Reason for rejection (required)
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Provide a reason..."
                className="w-full mt-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#DC2626]"
              />
            </label>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="h-9 px-4 rounded-md border border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actingOn === rejectModal.id}
                className="h-9 px-4 rounded-md bg-[#DC2626] text-white text-sm font-bold hover:bg-[var(--error-dark)] transition-colors disabled:opacity-50"
              >
                {actingOn === rejectModal.id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
