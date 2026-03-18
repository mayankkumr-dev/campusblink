import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getWaitlist, sendInviteToWaitlist } from '../../api/invites';

export const AdminInviteWaitlistPage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadRows = async () => {
    if (!profile) return;
    setIsLoading(true);
    const { data, error } = await getWaitlist(profile);
    if (error) toast.error(String(error));
    setRows(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [profile?.id]);

  const handleSendInvite = async (waitlistId: string) => {
    if (!profile) return;
    setSendingId(waitlistId);

    const { data, error } = await sendInviteToWaitlist(profile, waitlistId, { expiry: '7d' });
    if (error) {
      toast.error(String(error));
      setSendingId(null);
      return;
    }

    const code = data?.code;
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        toast.success(`Invite generated and copied: ${code}`);
      } catch {
        toast.success(`Invite generated: ${code}`);
      }
    } else {
      toast.success('Invite generated for waitlist entry.');
    }

    await loadRows();
    setSendingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-syne text-3xl font-extrabold text-[#0D0D0D]">Waitlist</h1>
          <p className="font-sans text-sm text-[#6B6B6B]">Review waitlist entries and issue invite codes.</p>
        </div>
        <button
          onClick={() => navigate('/admin/invites')}
          className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#0D0D0D] hover:bg-[#F2F0EB] inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-black/10 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">
            <tr>
              <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Name</th>
              <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Email</th>
              <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">College</th>
              <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Joined waitlist</th>
              <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Status</th>
              <th className="px-3 py-2 text-right px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-black/10">
                <td className="px-3 py-2 font-bold text-[#0D0D0D]">{row.name}</td>
                <td className="px-3 py-2 text-[#0D0D0D]">{row.email}</td>
                <td className="px-3 py-2 text-[#6B6B6B]">{row.college || '-'}</td>
                <td className="px-3 py-2 text-[#6B6B6B]">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${row.is_invited ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#A16207]'}`}>
                    {row.is_invited ? 'Invited' : 'Waiting'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleSendInvite(row.id)}
                    disabled={sendingId === row.id}
                    className="rounded-md bg-[#0D0D0D] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D] disabled:opacity-60"
                  >
                    {sendingId === row.id ? 'Sending...' : 'Send Invite Code'}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-[#6B6B6B]" colSpan={6}>No waitlist entries yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
