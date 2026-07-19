import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Calendar,
  Camera,
  GraduationCap,
  Link2,
  Lock,
  MapPin,
  Menu,
  MessageCircle,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { getDisplayHandle } from '../../lib/user';
import { SocialLinksStrip } from './ProfileSocialLinks';
import { ProfilePictureInteract } from '../../app/components/ProfilePictureInteract';

const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';
const BANNER_WIDTH = 1500;
const BANNER_HEIGHT = 500;

export interface ProfileHeaderProps {
  profile: any;
  postsStat: number;
  activeTab: string;
  followersCount: number;
  followingCount: number;
  displayAvatar: string;
  coverPreview: string | null;
  removeCover: boolean;
  visibleSocialLinks: Array<{ platform: string; url: string }>;
  onBack: () => void;
  onOpenEditModal: () => void;
  onOpenFollowersModal: () => void;
  onOpenFollowingModal: () => void;
  onBannerChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (kind: 'avatar' | 'cover') => void;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  postsStat,
  activeTab,
  followersCount,
  followingCount,
  displayAvatar,
  coverPreview,
  removeCover,
  visibleSocialLinks,
  onBack,
  onOpenEditModal,
  onOpenFollowersModal,
  onOpenFollowingModal,
  onBannerChange,
  onAvatarChange,
  onRemoveMedia,
  avatarInputRef,
  coverInputRef,
}) => {
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const displayWebsite = profile.website?.replace(/^https?:\/\//, '');
  const joinedOn = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border-subtle px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-border-subtle bg-surface text-text-primary shadow-2xs hover:bg-surface-elevated transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <div>
            <h1 className="font-syne font-bold text-base text-text-primary leading-tight">
              {profile.name}
            </h1>
            <p className="text-xs text-text-secondary">
              Diaries
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-surface text-text-primary shadow-2xs hover:bg-surface-elevated transition-all"
            aria-label="Open profile menu"
          >
            <Menu className="h-4 w-4" strokeWidth={1.8} />
          </button>
          {profileMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setProfileMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/student/bookmarks');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-elevated border-b border-border-subtle/50"
                >
                  <Bookmark className="h-4 w-4 text-text-secondary/70" /> Bookmarks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/student/settings');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-elevated"
                >
                  <Settings className="h-4 w-4 text-text-secondary/70" /> Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/student/settings/notifications');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-elevated"
                >
                  <Bell className="h-4 w-4 text-text-secondary/70" /> Notifications
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/student/settings/password');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-elevated"
                >
                  <Lock className="h-4 w-4 text-text-secondary/70" /> Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/student/settings/feedback');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-elevated"
                >
                  <MessageCircle className="h-4 w-4 text-text-secondary/70" /> Feedback
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="w-full bg-surface">
        {/* Banner Container */}
        <div
          className="group relative w-full overflow-hidden bg-surface-elevated"
          style={{
            aspectRatio: `${BANNER_WIDTH} / ${BANNER_HEIGHT}`,
            minHeight: '180px',
            maxHeight: '250px',
          }}
        >
          {profile.cover_url && !removeCover ? (
            <img
              loading="lazy"
              src={coverPreview || profile.cover_url}
              alt="Profile banner"
              className="h-full w-full object-cover object-center transition-opacity duration-300"
            />
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
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60" />
          <div className="absolute right-3.5 bottom-3.5 z-20 flex items-center gap-2">
            {profile.cover_url && (
              <button
                onClick={() => onRemoveMedia('cover')}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/25 px-3.5 py-2 text-xs font-bold text-rose-300 hover:text-rose-200 shadow-md transition-all min-h-[44px] min-w-[44px] cursor-pointer hover:bg-black/80"
                aria-label="Remove cover photo"
                title="Remove cover photo"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
              </button>
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black/60 backdrop-blur-md border border-white/25 px-4 py-2 text-xs font-bold text-white shadow-md transition-all min-h-[44px] min-w-[44px] cursor-pointer hover:bg-black/80"
              aria-label="Edit cover photo"
            >
              <Camera className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Edit Cover</span>
            </button>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={onBannerChange}
            className="hidden"
          />
        </div>

        {/* Avatar & Action Buttons Row */}
        <div
          className={`relative mx-auto -mt-14 flex items-end justify-between px-6 ${
            visibleSocialLinks.length ? 'pb-12' : ''
          }`}
        >
          <div className="relative shrink-0">
            <div className="group relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-md">
              <ProfilePictureInteract imageUrl={displayAvatar} alt={profile.name} className="h-full w-full">
                <img
                  loading="lazy"
                  src={displayAvatar}
                  alt={profile.name}
                  className="h-full w-full rounded-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
                />
              </ProfilePictureInteract>
            </div>
            {/* Anchored floating camera edit icon (bottom-right edge of avatar circle, 44x44pt) */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 sm:bg-black/75 backdrop-blur-md border-2 border-white text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer min-h-[44px] min-w-[44px]"
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              <Camera className="h-5 w-5" />
            </button>
            {profile.avatar_url && (
              <button
                onClick={() => onRemoveMedia('avatar')}
                className="absolute -top-1 -right-1 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 sm:bg-black/75 backdrop-blur-md border-2 border-white text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Remove profile picture"
                title="Remove profile picture"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className="relative flex flex-col items-end">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onOpenEditModal}
                  className="rounded-xl border border-border-subtle bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-2xs transition-all hover:bg-surface-elevated hover:border-slate-300"
                >
                  Edit Profile
                </button>
                <button
                  onClick={async () => {
                    try {
                      const base = typeof window !== 'undefined' ? window.location.origin : '';
                      await navigator.clipboard.writeText(`${base}/student/profile`);
                      toast.success('Profile link copied.');
                    } catch {
                      toast.error('Could not copy profile link.');
                    }
                  }}
                  className="rounded-xl border border-border-subtle bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-2xs transition-all hover:bg-surface-elevated hover:border-slate-300"
                >
                  Share Profile
                </button>
                <button
                  onClick={() => navigate('/student/bookmarks')}
                  className="rounded-xl border border-border-subtle bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-2xs transition-all hover:bg-surface-elevated hover:border-slate-300 flex items-center gap-1.5"
                >
                  <Bookmark className="h-3.5 w-3.5 text-text-secondary" />
                  Bookmarks
                </button>
              </div>
              {visibleSocialLinks.length ? (
                <SocialLinksStrip
                  links={visibleSocialLinks}
                  className="absolute right-0 top-full mt-3 w-max"
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* User Info & Bio Section */}
        <div className="mx-auto px-6 pt-4">
          <div className="animate-[fadeIn_0.3s_ease]">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
              <h1 className="font-syne font-bold text-2xl text-text-primary select-text leading-tight break-words truncate max-w-full">
                {profile.name}
              </h1>
              <span className="inline-flex items-center rounded-full bg-accent-blue-soft border border-accent-blue-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 shrink-0 max-w-full truncate">
                <GraduationCap className="mr-1 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">MAIT</span>
              </span>
            </div>

            <p className="mt-0.5 text-sm font-medium text-text-secondary truncate max-w-full">
              @{getDisplayHandle(profile.username, 'student')}
            </p>

            <p className="mt-3 max-w-[540px] whitespace-pre-wrap break-words text-sm font-normal leading-relaxed text-text-primary select-text">
              {profile.bio ||
                'Set up your profile with a short intro, your links, and what you are known for on campus.'}
            </p>

            {/* College Tags & Metadata Strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary min-w-0 max-w-full">
              {profile.location ? (
                <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                  <MapPin className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                  <span className="truncate break-words">{profile.location}</span>
                </div>
              ) : null}
              {profile.website ? (
                <a
                  href={`https://${displayWebsite}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 transition-colors text-accent-blue hover:underline min-w-0 max-w-full"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{displayWebsite}</span>
                </a>
              ) : null}
              {joinedOn ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                  <span>Joined {joinedOn}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                <GraduationCap className="h-3.5 w-3.5 text-text-secondary/70 shrink-0" />
                <span className="truncate break-words">{profile.college || ONLY_COLLEGE}</span>
              </div>
            </div>

            {/* Unified Floating Stats Card combining Diaries, Followers, Following & Reputation */}
            <div className="my-6 rounded-2xl border border-border-subtle bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)] transition-all duration-300">
              <div className="grid grid-cols-4 divide-x divide-border-subtle/80">
                <div className="flex flex-col items-center justify-center px-2 py-1">
                  <div className="flex items-center gap-1 font-syne font-extrabold text-xl sm:text-2xl text-text-primary">
                    {postsStat || 0}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-text-secondary mt-0.5">Diaries</div>
                </div>

                <button
                  onClick={onOpenFollowersModal}
                  className="flex flex-col items-center justify-center px-2 py-1 group active:scale-95 transition-transform"
                >
                  <div className="font-syne font-extrabold text-xl sm:text-2xl text-text-primary group-hover:text-blue-600 transition-colors">
                    {followersCount}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-text-secondary mt-0.5 group-hover:text-text-primary transition-colors">Followers</div>
                </button>

                <button
                  onClick={onOpenFollowingModal}
                  className="flex flex-col items-center justify-center px-2 py-1 group active:scale-95 transition-transform"
                >
                  <div className="font-syne font-extrabold text-xl sm:text-2xl text-text-primary group-hover:text-blue-600 transition-colors">
                    {followingCount}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-text-secondary mt-0.5 group-hover:text-text-primary transition-colors">Following</div>
                </button>

                <div className="flex flex-col items-center justify-center px-2 py-1">
                  <div className="flex items-center gap-1 font-syne font-extrabold text-xl sm:text-2xl text-accent-amber">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500 inline -mt-0.5" />
                    {profile.campus_credits || 0}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-text-secondary mt-0.5">Reputation</div>
                </div>
              </div>

              {/* Reputation Level Strip inside Floating Card */}
              <div className="mt-4 pt-3.5 border-t border-border-subtle/60 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Campus Standing: <span className="text-accent-amber uppercase tracking-wide">Active Contributor</span></span>
                </div>
                <button
                  onClick={() => toast.success('Earn credits by sharing campus diaries, helping students, and getting likes!')}
                  className="text-xs font-bold text-accent-amber hover:underline transition-all"
                >
                  How to earn →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
