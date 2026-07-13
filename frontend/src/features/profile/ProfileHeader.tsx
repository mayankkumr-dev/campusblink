import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
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
              {postsStat} {activeTab}
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
            <img
              loading="lazy"
              src={DEFAULT_BANNER_IMAGE_URL}
              alt="Default profile banner"
              className="h-full w-full object-cover object-center"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60" />
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-text-primary shadow-sm opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-white"
          >
            <Camera className="h-3.5 w-3.5" />
            Edit Cover
          </button>
          {profile.cover_url ? (
            <button
              onClick={() => onRemoveMedia('cover')}
              className="absolute right-[134px] top-4 inline-flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-accent-red shadow-sm opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          ) : null}
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
          <div className="group relative h-28 w-28 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-md">
            <ProfilePictureInteract imageUrl={displayAvatar} alt={profile.name} className="h-full w-full">
              <img
                loading="lazy"
                src={displayAvatar}
                alt={profile.name}
                className="h-full w-full rounded-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
              />
            </ProfilePictureInteract>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            {profile.avatar_url ? (
              <button
                onClick={() => onRemoveMedia('avatar')}
                className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface text-accent-red shadow-sm"
                title="Remove photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
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
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-syne font-bold text-2xl text-text-primary select-text leading-tight">
                {profile.name}
              </h1>
              <span className="inline-flex items-center rounded-full bg-accent-blue-soft border border-accent-blue-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                <GraduationCap className="mr-1 h-3.5 w-3.5" />
                MAIT
              </span>
            </div>

            <p className="mt-0.5 text-sm font-medium text-text-secondary">
              @{getDisplayHandle(profile.username, 'student')}
            </p>

            <p className="mt-3 max-w-[540px] whitespace-pre-wrap text-sm font-normal leading-relaxed text-text-primary select-text">
              {profile.bio ||
                'Set up your profile with a short intro, your links, and what you are known for on campus.'}
            </p>

            {/* College Tags & Metadata Strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary">
              {profile.location ? (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-text-secondary/70" />
                  <span>{profile.location}</span>
                </div>
              ) : null}
              {profile.website ? (
                <a
                  href={`https://${displayWebsite}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 transition-colors text-accent-blue hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>{displayWebsite}</span>
                </a>
              ) : null}
              {joinedOn ? (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-text-secondary/70" />
                  <span>Joined {joinedOn}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-text-secondary/70" />
                <span>{profile.college || ONLY_COLLEGE}</span>
              </div>
            </div>

            {/* Stats Row: Posts, Followers, Following, Reputation */}
            <div className="grid grid-cols-4 gap-3 my-6">
              <div className="bg-surface rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-border-subtle text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="font-syne font-bold text-xl text-text-primary">{postsStat}</div>
                <div className="text-xs font-medium text-text-secondary mt-0.5">Posts</div>
              </div>

              <button
                onClick={onOpenFollowersModal}
                className="bg-surface rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-border-subtle text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
              >
                <div className="font-syne font-bold text-xl text-text-primary group-hover:text-blue-600 transition-colors">
                  {followersCount}
                </div>
                <div className="text-xs font-medium text-text-secondary mt-0.5">Followers</div>
              </button>

              <button
                onClick={onOpenFollowingModal}
                className="bg-surface rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-border-subtle text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
              >
                <div className="font-syne font-bold text-xl text-text-primary group-hover:text-blue-600 transition-colors">
                  {followingCount}
                </div>
                <div className="text-xs font-medium text-text-secondary mt-0.5">Following</div>
              </button>

              <div className="bg-surface rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-border-subtle text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="font-syne font-bold text-xl text-accent-amber">
                  {profile.campus_credits || 0}
                </div>
                <div className="text-xs font-medium text-text-secondary mt-0.5">Reputation</div>
              </div>
            </div>

            {/* Your Reputation Card with Soft Subtle Shadows */}
            <div className="rounded-2xl bg-gradient-to-br from-white via-amber-50/30 to-amber-50/60 p-5 shadow-[0_4px_20px_rgba(245,158,11,0.08)] border border-accent-amber-soft/20 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-amber">
                    <Star className="h-4 w-4 text-accent-amber fill-amber-500" />
                    Your Reputation Score
                  </div>
                  <div className="mt-1 font-syne text-2xl font-bold text-text-primary">
                    {profile.campus_credits || 0}{' '}
                    <span className="text-xs font-semibold text-text-secondary ml-1">
                      credits earned
                    </span>
                  </div>
                </div>
                <button className="text-xs font-semibold text-accent-amber bg-amber-100/70 hover:bg-amber-100 rounded-xl px-3.5 py-2 transition-colors shrink-0">
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
