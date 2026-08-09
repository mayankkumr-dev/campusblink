import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, ExternalLink, Loader2, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { reportContent } from '../../api/community';
import { getProfileSocialLinks } from '../../api/profileSocialLinks';
import { checkIsFollowing, getFollowStats } from '../../api/follow';
import { supabase } from '../../lib/supabase';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';

import { SocialLinksStrip, mergeSocialLinks } from '../../features/profile/ProfileSocialLinks';
import { FollowButton } from '../../shared/components/FollowButton';
import { FollowListModal } from '../../shared/components/FollowListModal';
import { ProfessorBadge } from '../../shared/components/ProfessorBadge';
import { ProfilePictureInteract } from './ProfilePictureInteract';
import { DiaryProfileGrid } from '../../features/community/DiaryProfileGrid';

const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';


export const UserProfilePage: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentProfile = useAuthStore((state) => state.profile);

  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [imageModal, setImageModal] = useState<{ src: string; title: string } | null>(null);
  const [peopleModal, setPeopleModal] = useState<'followers' | 'following' | null>(null);

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (userId && currentProfile?.id) {
      const isSelfId = userId.toLowerCase() === currentProfile.id.toLowerCase();
      const isSelfUsername = currentProfile.username && userId.toLowerCase() === currentProfile.username.toLowerCase();
      if (isSelfId || isSelfUsername) {
        navigate('/student/profile', { replace: true });
      }
    }
  }, [userId, currentProfile?.id, currentProfile?.username, navigate]);

  // Redirect to own profile if loaded target profile is the logged-in user
  useEffect(() => {
    if (targetProfile?.id && currentProfile?.id && targetProfile.id.toLowerCase() === currentProfile.id.toLowerCase()) {
      navigate('/student/profile', { replace: true });
    }
  }, [targetProfile?.id, currentProfile?.id, navigate]);

  useEffect(() => {
    if (!userId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      setIsLoading(true);

      const safeUserId = String(userId).trim();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, cover_url, bio, college, username, location, website, created_at, campus_credits, followers_count, following_count, role, theme_color')
        .or(`id.eq.${safeUserId},username.eq.${safeUserId}`)
        .maybeSingle();

      if (!mounted) return;

        if (!profileData) {
        setNotFound(true);
      } else {
        if (currentProfile?.id && profileData.id === currentProfile.id) {
          navigate('/student/profile', { replace: true });
          return;
        }
        setTargetProfile(profileData);
        setFollowerCount(profileData.followers_count || 0);
        setFollowingCount(profileData.following_count || 0);
      }

      if (profileData) {
        const { data: socialLinkData } = await getProfileSocialLinks(profileData.id);
        if (mounted) {
          setSocialLinks((socialLinkData || []).map((item: any) => ({ platform: item.platform || 'website', url: item.url || '' })));
        }
      }

      if (mounted) setIsLoading(false);
    };

    load();

    return () => { mounted = false; };
  }, [userId, currentProfile?.id]);

  // Check follow status
  useEffect(() => {
    if (!currentProfile?.id || !targetProfile?.id || currentProfile.id === targetProfile.id) return;
    let mounted = true;
    checkIsFollowing(currentProfile.id, targetProfile.id).then(({ isFollowing: f }) => {
      if (mounted) setIsFollowing(f);
    });
    return () => { mounted = false; };
  }, [currentProfile?.id, targetProfile?.id]);

  // Fetch follow counts once on mount (not on every isFollowing change,
  // because the FollowButton onChange already applies the RPC-returned counts).
  useEffect(() => {
    if (!targetProfile?.id) return;

    let mounted = true;
    getFollowStats(targetProfile.id).then(({ data }) => {
      if (!mounted || !data) return;
      setFollowerCount(data.followers_count || 0);
      setFollowingCount(data.following_count || 0);
    });

    return () => {
      mounted = false;
    };
  }, [targetProfile?.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-primary)]" />
      </div>
    );
  }

  if (notFound || !targetProfile) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-md bg-[var(--yellow)]/20 text-4xl">(=^.^=)</div>
        <h2 className=" text-2xl font-extrabold text-[var(--text-primary)]">User not found</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">This profile doesn't exist or was removed.</p>
        <button onClick={() => navigate(-1)} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--text-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  const avatar = targetProfile.avatar_url || getAvatarDataUrl({ name: targetProfile.name, seed: targetProfile.id });
  const visibleSocialLinks = mergeSocialLinks(targetProfile.website, socialLinks);

  const handleReportAccount = () => {
    if (!currentProfile?.id || !targetProfile?.id) {
      toast.error('Please log in to report this account.');
      return;
    }
    if (currentProfile.id === targetProfile.id) {
      toast.error('You cannot report your own account.');
      return;
    }

    setReportReason('');
    setReportDetails('');
    setIsReportModalOpen(true);
  };

  const submitAccountReport = async () => {
    if (!currentProfile?.id || !targetProfile?.id) return;

    const reason = reportReason.trim();
    if (!reason) {
      toast.error('Reason is required.');
      return;
    }

    setIsSubmittingReport(true);
    const loadingToast = toast.loading('Submitting report...');
    const { error } = await reportContent('profile', targetProfile.id, currentProfile.id, reason, reportDetails.trim() || null);

    if (error) {
      toast.error((error as any)?.message || 'Could not submit report.', { id: loadingToast });
      setIsSubmittingReport(false);
      return;
    }

    toast.success('Account reported. Admin will review it.', { id: loadingToast });
    setIsSubmittingReport(false);
    setIsReportModalOpen(false);
  };

  // Convert hex to transparent rgba format safely
  const getThemeRgba = (hex: string | undefined | null, alpha: number) => {
    if (!hex) return '';
    try {
      const cleanHex = hex.replace('#', '');
      if (cleanHex.length === 6) {
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    } catch (e) {
      return '';
    }
    return '';
  };

  return (
    <>
    
      <div className="min-h-screen bg-gray-50 pb-24 text-gray-900 font-sans">
        <div className="w-full flex justify-center min-h-screen pb-28">
          {/* Main Feed Column */}
          <div className="w-full max-w-[680px] bg-white border-x border-gray-100 flex flex-col min-h-screen pb-10">
            {/* Sticky Top Header Bar */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-100 bg-white text-gray-900 active:scale-95 transition-all"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <div>
                  <h1 className="font-bold text-base text-gray-900 leading-tight flex items-center gap-1.5" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                    {targetProfile.name}
                    {targetProfile.role === 'professor' && <ProfessorBadge />}
                  </h1>
                  <p className="text-xs text-gray-400">Diaries</p>
                </div>
              </div>
            </div>

            <section className="w-full bg-surface">
              {/* Banner Container */}
              <div className="relative aspect-[16/6] min-h-[180px] w-full overflow-hidden bg-surface-elevated md:min-h-[220px]">
                {targetProfile.cover_url ? (
                  <img loading="lazy" src={targetProfile.cover_url} alt="Profile banner" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute -left-10 -top-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
                      <span className="font-syne font-extrabold text-xl sm:text-2xl tracking-widest uppercase text-white/20 select-none">
                        Campus Blink Journal
                      </span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setImageModal({ src: targetProfile.cover_url || DEFAULT_BANNER_IMAGE_URL, title: 'Cover photo' })}
                  className="absolute inset-0 h-full w-full"
                  aria-label="Open cover photo"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Avatar & Action Strip */}
              <div className="relative mx-auto -mt-14 flex items-end justify-between px-6 pb-2">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                  <ProfilePictureInteract imageUrl={avatar} alt={targetProfile.name} className="h-full w-full">
                    <img loading="lazy" src={avatar} alt={targetProfile.name} className="h-full w-full rounded-full object-cover" />
                  </ProfilePictureInteract>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPeopleModal('following')}
                    className="rounded-xl border border-gray-100 bg-white px-3.5 py-2 text-xs font-semibold text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all"
                  >
                    {followingCount} Following
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeopleModal('followers')}
                    className="rounded-xl border border-gray-100 bg-white px-3.5 py-2 text-xs font-semibold text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all"
                  >
                    {followerCount} Followers
                  </button>
                  {currentProfile?.id && currentProfile.id !== targetProfile.id && (
                    targetProfile.role === 'professor' && currentProfile.role !== 'admin' ? (
                      <span className="rounded-xl bg-accent-amber-soft px-3.5 py-2 text-xs font-bold text-accent-amber border border-accent-amber-soft/20">
                        Faculty Member
                      </span>
                    ) : (
                      <>
                        <FollowButton
                          targetUserId={targetProfile.id}
                          initialFollowing={isFollowing}
                          onChange={(nextFollowing, counts) => {
                            setIsFollowing(nextFollowing);
                            if (typeof counts?.followers_count === 'number') {
                              setFollowerCount(counts.followers_count);
                            }
                            if (typeof counts?.following_count === 'number') {
                              setFollowingCount(counts.following_count);
                            }
                          }}
                        />

                        <button
                          onClick={handleReportAccount}
                          className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-rose-600 active:scale-95 transition-colors"
                        >
                          Report Account
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>

              {/* User Info & Bio Section */}
              <div className="mx-auto px-6 pt-3 min-w-0 max-w-full">
                <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
                  <h1 className="font-bold text-2xl text-gray-900 leading-tight flex items-center gap-1.5 break-words truncate max-w-full" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                    {targetProfile.name}
                    {targetProfile.role === 'professor' && <ProfessorBadge />}
                  </h1>
                </div>

                <p className="mt-0.5 text-sm font-medium text-gray-400 truncate max-w-full">@{getDisplayHandle(targetProfile.username, 'student')}</p>

                <p className="mt-3 max-w-[540px] whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                  {targetProfile.bio || "This user hasn't added a bio yet."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary min-w-0 max-w-full">
                  {targetProfile.location && (
                    <div className="flex items-center gap-1.5 min-w-0 max-w-full"><MapPin className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" /><span className="truncate break-words">{targetProfile.location}</span></div>
                  )}
                  {targetProfile.website && (
                    <a href={`https://${targetProfile.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors text-accent-blue hover:underline min-w-0 max-w-full">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{targetProfile.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {targetProfile.created_at && (
                    <div className="flex items-center gap-1.5 shrink-0"><Calendar className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" /><span>Joined {new Date(targetProfile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span></div>
                  )}
                  {targetProfile.college && (
                    <div className="flex items-center gap-1.5 min-w-0 max-w-full"><span className="text-text-secondary/70 shrink-0">🎓</span><span className="truncate break-words">{targetProfile.college}</span></div>
                  )}
                </div>

                {visibleSocialLinks.length ? (
                  <div className="mt-4">
                    <SocialLinksStrip links={visibleSocialLinks} />
                  </div>
                ) : null}

                {/* Stats Row with Soft Shadows */}
                <div className="grid grid-cols-3 gap-3 my-6">
                  <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 text-center">
                    <div className="font-bold text-xl text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>📖</div>
                    <div className="text-xs font-medium text-gray-400 mt-0.5">Diaries</div>
                  </div>
                  <button
                    onClick={() => setPeopleModal('followers')}
                    className="bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 text-center active:scale-95 transition-all group"
                  >
                    <div className="font-bold text-xl text-gray-900 group-hover:text-[#0066cc] transition-colors" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>{followerCount}</div>
                    <div className="text-xs font-medium text-gray-400 mt-0.5">Followers</div>
                  </button>
                  <button
                    onClick={() => setPeopleModal('following')}
                    className="bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 text-center active:scale-95 transition-all group"
                  >
                    <div className="font-bold text-xl text-gray-900 group-hover:text-[#0066cc] transition-colors" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif' }}>{followingCount}</div>
                    <div className="text-xs font-medium text-gray-400 mt-0.5">Following</div>
                  </button>
                </div>
              </div>

              {/* Diary Grid — Always shown */}
              <DiaryProfileGrid userId={targetProfile.id} />
            </section>
          </div>
        </div>
      </div>

      {isReportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>Report account</h3>
              <button onClick={() => !isSubmittingReport && setIsReportModalOpen(false)} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 active:scale-95 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm font-semibold text-[var(--text-primary)]">
              Reason
              <input
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="spam, abuse, harassment..."
              className="mt-1 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 transition-all"
              />
            </label>

            <label className="mt-3 block text-sm font-semibold text-[var(--text-primary)]">
              Details (optional)
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder="Tell admin what happened"
                className="mt-1 w-full resize-none rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 transition-all"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setIsReportModalOpen(false)} className="rounded-xl border border-gray-100 px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 active:scale-95 transition-all">Cancel</button>
              <button
                onClick={submitAccountReport}
                disabled={isSubmittingReport}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60 active:scale-95 transition-all"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FollowListModal
        userId={targetProfile?.id}
        openList={peopleModal}
        onClose={() => setPeopleModal(null)}
        currentUserId={currentProfile?.id}
        totalFollowers={followerCount}
        totalFollowing={followingCount}
      />

      {imageModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={() => setImageModal(null)}>
          <button onClick={() => setImageModal(null)} className="absolute right-4 top-4 z-10 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"><X className="h-6 w-6" /></button>
          <img
            onClick={(event) => event.stopPropagation()}
            src={imageModal.src}
            alt={imageModal.title}
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
          />
        </div>
      ) : null}
    </>
  );
};
