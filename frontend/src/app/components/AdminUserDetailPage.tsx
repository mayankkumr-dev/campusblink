import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { FEATURE_ACCESS_ITEMS, getUserFeatureAccess, toggleUserFeatureAccess, updateUserFeatureAccess } from '../../api/featureAccess';
import { setNoticeAdminPermission } from '../../api/notices';

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
  const [isTogglingNoticeAdmin, setIsTogglingNoticeAdmin] = useState(false);

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
        <Loader2 className="h-7 w-7 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 rounded-lg border border-black/[0.08] bg-white p-6">
        <p className="text-sm text-slate-500">User not found.</p>
        <button onClick={() => navigate('/admin/accounts?tab=users')} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900">
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

  const handleToggleNoticeAdmin = async () => {
    if (!user?.id) return;
    const next = !user.is_notice_admin;
    setIsTogglingNoticeAdmin(true);
    const { error } = await setNoticeAdminPermission(user.id, next);
    setIsTogglingNoticeAdmin(false);
    if (error) {
      toast.error((error as any).message || 'Failed to update notice admin permission.');
      return;
    }
    setUser((prev: any) => ({ ...prev, is_notice_admin: next }));
    toast.success(next ? 'Notice Admin permission granted.' : 'Notice Admin permission revoked.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button
        onClick={() => navigate('/admin/accounts?tab=users')}
        className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </button>

      <div className="rounded-lg border border-black/[0.08] bg-white p-5">
        <h2 className="font-syne text-2xl font-bold text-slate-900">{user.name || 'Unnamed user'}</h2>
        <div className="mt-2 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
          <p><span className="font-bold text-slate-900">Email:</span> {user.email || 'N/A'}</p>
          <p><span className="font-bold text-slate-900">Username:</span> @{user.username || 'unknown'}</p>
          <p><span className="font-bold text-slate-900">Role:</span> {user.role || 'student'}</p>
          <p><span className="font-bold text-slate-900">Status:</span> {user.status || 'active'}</p>
          <p><span className="font-bold text-slate-900">College:</span> {user.college || 'N/A'}</p>

          {user.role === 'student' && (
            <>
              <p><span className="font-bold text-slate-900">Year of Study:</span> {user.study_year || 'N/A'}</p>
              <p><span className="font-bold text-slate-900">Branch:</span> {user.branch || 'N/A'} {user.hide_branch ? '(Hidden on profile)' : ''}</p>
            </>
          )}

          {(user.role === 'professor' || user.requested_role === 'teacher') && (
            <p><span className="font-bold text-slate-900">Staff Room Number:</span> {user.staff_room_number || 'N/A'}</p>
          )}

          <p><span className="font-bold text-slate-900">Reputation:</span> ⭐ {user.campus_credits || 0} Reputation</p>
          <p><span className="font-bold text-slate-900">Joined:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-black/[0.08] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-syne text-xl font-bold text-slate-900">Feature Access</h3>
            <p className="mt-1 text-sm text-slate-500">Restrict modules and actions for {user.email || user.name || 'this user'}.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRestrictedFeatures([])} className="rounded-lg border border-black/[0.08] bg-slate-50 px-4 py-2 text-sm font-bold text-slate-900">Clear all</button>
            <button onClick={() => setRestrictedFeatures(FEATURE_ACCESS_ITEMS.map((item) => item.key))} className="rounded-lg border border-[#F1CACA] bg-[#FFF5F5] px-4 py-2 text-sm font-bold text-[#DC2626]">Restrict all</button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-bold text-slate-900">Restriction reason</span>
          <textarea value={restrictionReason} onChange={(event) => setRestrictionReason(event.target.value)} rows={3} className="w-full rounded-lg border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400/50" placeholder="Shown internally for admin context." />
        </label>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FEATURE_ACCESS_ITEMS.map((item) => {
            const checked = !restrictedFeatures.includes(item.key);
            return (
              <label key={item.key} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-bold transition-colors ${checked ? 'border-[rgba(15,23,42,0.08)] bg-slate-50 text-slate-900' : 'border-amber-400/35 bg-[#FEF3C7] text-[#7C5C00]'}`}>
                <span>{item.label}</span>
                <input type="checkbox" checked={checked} disabled={featureActionLoading === item.key} onChange={() => handleToggleFeature(item.key)} className="h-4 w-4 rounded border-black/10 text-amber-500 focus:ring-amber-400/50 disabled:opacity-60" />
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={handleSaveFeatureAccess} disabled={isSavingFeatures} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500 hover:text-slate-900 disabled:opacity-60">
            {isSavingFeatures ? 'Saving...' : 'Save feature access'}
          </button>
        </div>
      </div>

      {/* Notice Admin Permission Card */}
      <div className="rounded-lg border border-black/[0.08] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Megaphone className="h-5 w-5 text-accent-amber mt-0.5 shrink-0" />
            <div>
              <h3 className="font-syne text-lg font-bold text-slate-900">Notice Admin</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Allows this user to compose and publish official notices visible to students at <strong>{user.college || 'their college'}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleNoticeAdmin}
            disabled={isTogglingNoticeAdmin}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
              user.is_notice_admin ? 'bg-amber-500' : 'bg-slate-200'
            }`}
          >
            {isTogglingNoticeAdmin ? (
              <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />
            ) : (
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-surface rounded-full shadow transition-transform ${
                  user.is_notice_admin ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            )}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500 font-medium">
          Current status:{' '}
          <span className={`font-bold ${user.is_notice_admin ? 'text-accent-amber' : 'text-text-secondary'}`}>
            {user.is_notice_admin ? '✓ Notice Admin' : 'Standard user'}
          </span>
        </p>
      </div>

      <div className="rounded-lg border border-black/[0.08] bg-white p-5">
        <h3 className="mb-4 font-syne text-lg font-bold text-slate-900">All user posts (including anonymous)</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">No posts found for this user.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg border border-black/[0.08] bg-slate-50 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</span>
                  {post.type && <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">{post.type}</span>}
                  {post.is_anonymous && <span className="rounded bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#DC2626]">Anonymous Post</span>}
                </div>
                {post.title && <h4 className="font-bold text-slate-900">{post.title}</h4>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{post.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
