import React, { useEffect, useState } from 'react';
import { Loader2, Check, X, Shield, GraduationCap, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import {
  getAllProfessors,
  getProfessorFeatures,
  toggleProfessorFeature,
  revokeProfessor,
  reapproveProfessor,
} from '../../api/professor';
import { getAvatarDataUrl } from '../../lib/avatar';

const FEATURES = [
  { key: 'campus_exchange', label: 'Campus Exchange', desc: 'Buy & sell items' },
  { key: 'community', label: 'Community', desc: 'Access community posts' },
  { key: 'reputation', label: 'Reputation', desc: 'Reputation score system', locked: true },
];

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-accent-green/15 text-accent-green',
  pending: 'bg-[#FEF9C3] text-[#92400E]',
  rejected: 'bg-[#FEE2E2] text-accent-red',
};

export const AdminProfessorsPage: React.FC = () => {
  const adminProfile = useAuthStore((state) => state.profile);
  const [professors, setProfessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, any[]>>({});
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await getAllProfessors();
    setProfessors(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = professors.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.staff_room_number || '').toLowerCase().includes(q) ||
      (p.college || '').toLowerCase().includes(q)
    );
  });

  const toggleExpand = async (profId: string) => {
    if (expandedId === profId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(profId);
    if (!features[profId]) {
      const { data } = await getProfessorFeatures(profId);
      setFeatures(prev => ({ ...prev, [profId]: data || [] }));
    }
  };

  const handleToggleFeature = async (profId: string, feature: string, currentEnabled: boolean) => {
    if (!adminProfile?.id) return;
    setTogglingFeature(`${profId}-${feature}`);
    const { error } = await toggleProfessorFeature(adminProfile.id, profId, feature, !currentEnabled);
    if (error) {
      toast.error('Failed to update feature access.');
    } else {
      toast.success(`Feature ${!currentEnabled ? 'enabled' : 'disabled'}.`);
      const { data } = await getProfessorFeatures(profId);
      setFeatures(prev => ({ ...prev, [profId]: data || [] }));
    }
    setTogglingFeature(null);
  };

  const handleRevoke = async (profId: string) => {
    if (!adminProfile?.id) return;
    setActingOn(profId);
    const { error } = await revokeProfessor(adminProfile.id, profId);
    if (error) {
      toast.error('Failed to revoke professor access.');
    } else {
      toast.success('Professor access revoked.');
      await load();
    }
    setActingOn(null);
  };

  const handleReapprove = async (profId: string) => {
    if (!adminProfile?.id) return;
    setActingOn(profId);
    const { error } = await reapproveProfessor(adminProfile.id, profId);
    if (error) {
      toast.error('Failed to reapprove professor.');
    } else {
      toast.success('Professor reapproved! ✅');
      await load();
    }
    setActingOn(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 transition-colors">
        <div>
          <h1 className="font-syne font-extrabold text-2xl text-text-primary transition-colors">All Professors</h1>
          <p className="text-sm text-text-secondary mt-1 transition-colors">Manage professor accounts and feature access</p>
        </div>
        <span className="px-3 py-1 rounded-md bg-surface-elevated text-text-secondary text-sm font-bold transition-colors">
          {professors.length} total
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary transition-colors" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, room, college..."
          className="w-full h-10 pl-10 pr-4 rounded-md border border-border-subtle bg-surface text-sm text-text-primary focus:outline-none focus:border-[#92400E] transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#92400E] dark:text-amber-500 transition-colors" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border-subtle rounded-lg p-8 text-center transition-colors">
          <GraduationCap className="w-10 h-10 text-border-subtle mx-auto mb-3 transition-colors dark:text-slate-600" />
          <p className="text-sm text-text-secondary transition-colors">No professors found.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border-subtle rounded-lg overflow-hidden transition-colors">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-3 border-b border-border-subtle bg-surface-elevated text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">
            <span>Name</span>
            <span>Email</span>
            <span>Room</span>
            <span>College</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.map(prof => {
            const avatar = prof.avatar_url || getAvatarDataUrl({ name: prof.name, seed: prof.id });
            const profFeatures = features[prof.id] || [];
            const isExpanded = expandedId === prof.id;
            const status = String(prof.professor_status || 'pending').toLowerCase();

            return (
              <div key={prof.id} className="border-b border-border-subtle last:border-b-0 transition-colors">
                <div
                  onClick={() => toggleExpand(prof.id)}
                  className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-2 px-5 py-3 cursor-pointer hover:bg-surface-elevated transition-colors items-center"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    <img loading="lazy" src={avatar} alt={prof.name} className="h-8 w-8 rounded-full object-cover border border-border-subtle transition-colors" />
                    <span className="font-bold text-sm text-text-primary transition-colors">{prof.name}</span>
                  </div>
                  <span className="text-sm text-text-secondary truncate transition-colors">{prof.email}</span>
                  <span className="text-sm text-text-secondary transition-colors">{prof.staff_room_number || '—'}</span>
                  <span className="text-sm text-text-secondary truncate transition-colors">{prof.college || '—'}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase w-fit ${STATUS_BADGE[status] || STATUS_BADGE.pending}`}>
                    {status}
                  </span>
                  <div className="flex gap-1">
                    {status === 'approved' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleRevoke(prof.id); }}
                        disabled={actingOn === prof.id}
                        className="h-7 px-3 rounded-md border border-[#DC2626] text-[#DC2626] text-xs font-bold hover:bg-[#DC2626] hover:text-white transition-colors disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                    {status === 'rejected' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleReapprove(prof.id); }}
                        disabled={actingOn === prof.id}
                        className="h-7 px-3 rounded-md bg-[#22C55E] text-white text-xs font-bold hover:bg-[#16A34A] transition-colors disabled:opacity-50"
                      >
                        Reapprove
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 bg-surface-elevated border-t border-border-subtle transition-colors">
                    <h4 className="font-bold text-sm text-text-primary mb-3 transition-colors">Feature Access</h4>
                    <div className="space-y-2">
                      {FEATURES.map(f => {
                        const featureRow = profFeatures.find(pf => pf.feature === f.key);
                        const isEnabled = featureRow?.is_enabled || false;
                        const isLocked = f.locked;
                        const isToggling = togglingFeature === `${prof.id}-${f.key}`;

                        return (
                          <div key={f.key} className={`flex items-center justify-between p-3 rounded-md border transition-colors ${isLocked ? 'bg-surface-elevated border-border-subtle opacity-60' : 'bg-surface border-border-subtle'}`}>
                            <div>
                              <span className="text-sm font-bold text-text-primary transition-colors">{f.label}</span>
                              <p className="text-xs text-text-secondary transition-colors">{f.desc}</p>
                              {isLocked && <p className="text-xs text-[#DC2626] font-medium mt-0.5">Permanently disabled for professors</p>}
                            </div>
                            <button
                              onClick={() => !isLocked && handleToggleFeature(prof.id, f.key, isEnabled)}
                              disabled={isLocked || isToggling}
                              className={`relative w-12 h-6 rounded-md transition-colors ${
                                isLocked ? 'bg-border-subtle cursor-not-allowed' :
                                isEnabled ? 'bg-[#22C55E]' : 'bg-border-strong'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-sm shadow transition-transform ${
                                isEnabled && !isLocked ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {prof.professor_rejection_reason && status === 'rejected' && (
                      <div className="mt-3 p-3 rounded-md bg-[#FEE2E2] border border-[#EF4444]/20">
                        <p className="text-xs font-bold text-accent-red">Rejection Reason</p>
                        <p className="text-sm text-accent-red mt-0.5">{prof.professor_rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
