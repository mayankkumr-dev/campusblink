import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { getAdminUserDetailData } from '../../api/admin';
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
      const [userDetailResult, featureAccessResult] = await Promise.all([
        getAdminUserDetailData(userId),
        getUserFeatureAccess(userId),
      ]);

      if (!mounted) return;

      setUser(userDetailResult.data?.profile || null);
      setPosts(userDetailResult.data?.posts || []);
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
        <Loader2 className="h-7 w-7 animate-spin text-[#FFD600]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 rounded-lg border border-black/[0.08] bg-white p-6">
        <p className="text-sm text-[#6B6B6B]">User not found.</p>
        <button onClick={() => navigate('/admin/users')} className="rounded-lg bg-[#F7F5F0] px-4 py-2 text-sm font-bold text-[#0D0D0D]">
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
        onClick={() => navigate('/admin/users')}
        className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-sm font-bold text-[#0D0D0D] hover:bg-[#F7F5F0]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </button>

      <div className="rounded-lg border border-black/[0.08] bg-white p-5">
        <h2 className="font-syne text-2xl font-bold text-[#0D0D0D]">{user.name || 'Unnamed user'}</h2>
        <div className="mt-2 grid gap-2 text-sm text-[#6B6B6B] md:grid-cols-2">
          <p><span className="font-bold text-[#0D0D0D]">Email:</span> {user.email || 'N/A'}</p>
          <p><span className="font-bold text-[#0D0D0D]">Username:</span> @{user.username || 'unknown'}</p>
          <p><span className="font-bold text-[#0D0D0D]">Role:</span> {user.role || 'student'}</p>
          <p><span className="font-bold text-[#0D0D0D]">Status:</span> {user.status || 'active'}</p>
          <p><span className="font-bold text-[#0D0D0D]">Reputation:</span> ⭐ {user.campus_credits || 0} Reputation</p>
          <p><span className="font-bold text-[#0D0D0D]">Joined:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-black/[0.08] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-syne text-xl font-bold text-[#0D0D0D]">Feature Access</h3>
            <p className="mt-1 text-sm text-[#6B6B6B]">Restrict modules and actions for {user.email || user.name || 'this user'}.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRestrictedFeatures([])} className="rounded-lg border border-black/[0.08] bg-[#FAFAF8] px-4 py-2 text-sm font-bold text-[#0D0D0D]">Clear all</button>
            <button onClick={() => setRestrictedFeatures(FEATURE_ACCESS_ITEMS.map((item) => item.key))} className="rounded-lg border border-[#F1CACA] bg-[#FFF5F5] px-4 py-2 text-sm font-bold text-[#DC2626]">Restrict all</button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-bold text-[#0D0D0D]">Restriction reason</span>
          <textarea value={restrictionReason} onChange={(event) => setRestrictionReason(event.target.value)} rows={3} className="w-full rounded-lg border border-black/10 bg-[#FAFAF8] px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#FFD600]/50" placeholder="Shown internally for admin context." />
        </label>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FEATURE_ACCESS_ITEMS.map((item) => {
            const checked = !restrictedFeatures.includes(item.key);
            return (
              <label key={item.key} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-bold transition-colors ${checked ? 'border-[#E8E8E8] bg-[#FAFAF8] text-[#0D0D0D]' : 'border-[#FFD600]/35 bg-[#FFF8D4] text-[#7C5C00]'}`}>
                <span>{item.label}</span>
                <input type="checkbox" checked={checked} disabled={featureActionLoading === item.key} onChange={() => handleToggleFeature(item.key)} className="h-4 w-4 rounded border-black/10 text-[#FFD600] focus:ring-[#FFD600]/50 disabled:opacity-60" />
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={handleSaveFeatureAccess} disabled={isSavingFeatures} className="rounded-lg bg-[#0D0D0D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D] disabled:opacity-60">
            {isSavingFeatures ? 'Saving...' : 'Save feature access'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-black/[0.08] bg-white p-5">
        <h3 className="mb-4 font-syne text-lg font-bold text-[#0D0D0D]">All user posts (including anonymous)</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-[#6B6B6B]">No posts found for this user.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg border border-black/[0.08] bg-[#FAFAF8] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#6B6B6B]">{new Date(post.created_at).toLocaleString()}</span>
                  {post.type && <span className="rounded bg-[#F7F5F0] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0D0D0D]">{post.type}</span>}
                  {post.is_anonymous && <span className="rounded bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#DC2626]">Anonymous Post</span>}
                </div>
                {post.title && <h4 className="font-bold text-[#0D0D0D]">{post.title}</h4>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#0D0D0D]">{post.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
