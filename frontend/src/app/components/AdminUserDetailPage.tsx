import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { FEATURE_ACCESS_ITEMS, getUserFeatureAccess, toggleUserFeatureAccess, updateUserFeatureAccess } from '../../api/featureAccess';

export const AdminUserDetailPage: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const adminProfile = useAuthStore((state) => state.profile);

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [restrictedFeatures, setRestrictedFeatures] = useState<string[]>([]);
  const [restrictionReason, setRestrictionReason] = useState('');
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [featureActionLoading, setFeatureActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      const [{ data: profile }, { data: userPosts }, featureAccessResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('posts').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
        getUserFeatureAccess(userId),
      ]);

      if (!mounted) return;

      setUser(profile || null);
      setPosts(userPosts || []);
      setRestrictedFeatures(featureAccessResult.data?.restrictedFeatures || []);
      setRestrictionReason(featureAccessResult.data?.reason || '');
      setIsLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--yellow)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6">
        <p className="text-sm text-[var(--text-secondary)]">User not found.</p>
        <button onClick={() => navigate('/admin/accounts?tab=users')} className="rounded-lg bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">
          Back to users
        </button>
      </div>
    );
  }

  const refreshRestrictions = async () => {
    if (!user?.id) return;
    const result = await getUserFeatureAccess(user.id);
    if (!result.error) {
      setRestrictedFeatures(result.data?.restrictedFeatures || []);
      setRestrictionReason(result.data?.reason || '');
    }
  };

  const handleToggleFeature = async (featureKey: string) => {
    if (!adminProfile?.id || !user?.id) return;
    const currentlyEnabled = !restrictedFeatures.includes(featureKey);

    setFeatureActionLoading(featureKey);
    const { error } = await toggleUserFeatureAccess(adminProfile.id, user.id, featureKey, currentlyEnabled, restrictionReason || null);
    setFeatureActionLoading(null);

    if (error) {
      toast.error(error.message || 'Error updating access');
      return;
    }

    toast.success(`Feature ${currentlyEnabled ? 'disabled' : 'enabled'} successfully`);
    await refreshRestrictions();
  };

  const handleSaveFeatureAccess = async () => {
    if (!adminProfile?.id || !user) return;
    setIsSavingFeatures(true);
    const loadingToast = toast.loading(`Saving feature access for ${user.name || user.email || 'user'}...`);
    const { error } = await updateUserFeatureAccess(adminProfile.id, {
      userId: user.id,
      email: user.email,
      userName: user.name || user.email,
      restrictedFeatures,
      reason: restrictionReason,
    });

    if (error) {
      toast.error(error.message || 'Could not save feature access. Run the SQL setup if this is a new feature.', { id: loadingToast });
    } else {
      toast.success('Feature access updated.', { id: loadingToast });
    }
    setIsSavingFeatures(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button
        onClick={() => navigate('/admin/accounts?tab=users')}
        className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[var(--bg)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </button>

      <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-5">
        <h2 className="font-syne text-2xl font-bold text-[var(--text-primary)]">{user.name || 'Unnamed user'}</h2>
        <div className="mt-2 grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-2">
          <p><span className="font-bold text-[var(--text-primary)]">Email:</span> {user.email || 'N/A'}</p>
          <p><span className="font-bold text-[var(--text-primary)]">Username:</span> @{user.username || 'unknown'}</p>
          <p><span className="font-bold text-[var(--text-primary)]">Role:</span> {user.role || 'student'}</p>
          <p><span className="font-bold text-[var(--text-primary)]">Status:</span> {user.status || 'active'}</p>
          <p><span className="font-bold text-[var(--text-primary)]">College:</span> {user.college || 'N/A'}</p>

          {user.role === 'student' && (
            <>
              <p><span className="font-bold text-[var(--text-primary)]">Year of Study:</span> {user.study_year || 'N/A'}</p>
              <p><span className="font-bold text-[var(--text-primary)]">Branch:</span> {user.branch || 'N/A'} {user.hide_branch ? '(Hidden on profile)' : ''}</p>
            </>
          )}

          {(user.role === 'professor' || user.requested_role === 'teacher') && (
            <p><span className="font-bold text-[var(--text-primary)]">Staff Room Number:</span> {user.staff_room_number || 'N/A'}</p>
          )}

          <p><span className="font-bold text-[var(--text-primary)]">Reputation:</span> ⭐ {user.campus_credits || 0} Reputation</p>
          <p><span className="font-bold text-[var(--text-primary)]">Joined:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-syne text-xl font-bold text-[var(--text-primary)]">Feature Access</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Restrict modules and actions for {user.email || user.name || 'this user'}.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRestrictedFeatures([])} className="rounded-lg border border-black/[0.08] bg-[var(--bg-primary)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">Clear all</button>
            <button onClick={() => setRestrictedFeatures(FEATURE_ACCESS_ITEMS.map((item) => item.key))} className="rounded-lg border border-[#F1CACA] bg-[#FFF5F5] px-4 py-2 text-sm font-bold text-[#DC2626]">Restrict all</button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Restriction reason</span>
          <textarea value={restrictionReason} onChange={(event) => setRestrictionReason(event.target.value)} rows={3} className="w-full rounded-lg border border-black/10 bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50" placeholder="Shown internally for admin context." />
        </label>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FEATURE_ACCESS_ITEMS.map((item) => {
            const checked = !restrictedFeatures.includes(item.key);
            return (
              <label key={item.key} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-bold transition-colors ${checked ? 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'border-[var(--yellow)]/35 bg-[var(--yellow-light)] text-[#7C5C00]'}`}>
                <span>{item.label}</span>
                <input type="checkbox" checked={checked} disabled={featureActionLoading === item.key} onChange={() => handleToggleFeature(item.key)} className="h-4 w-4 rounded border-black/10 text-[var(--yellow)] focus:ring-[var(--yellow)]/50 disabled:opacity-60" />
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={handleSaveFeatureAccess} disabled={isSavingFeatures} className="rounded-lg bg-[var(--text-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] disabled:opacity-60">
            {isSavingFeatures ? 'Saving...' : 'Save feature access'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-5">
        <h3 className="mb-4 font-syne text-lg font-bold text-[var(--text-primary)]">All user posts (including anonymous)</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No posts found for this user.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg border border-black/[0.08] bg-[var(--bg-primary)] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">{new Date(post.created_at).toLocaleString()}</span>
                  {post.type && <span className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-primary)]">{post.type}</span>}
                  {post.is_anonymous && <span className="rounded bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#DC2626]">Anonymous Post</span>}
                </div>
                {post.title && <h4 className="font-bold text-[var(--text-primary)]">{post.title}</h4>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{post.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
