import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile, uploadAvatar, uploadCover } from '../../api/auth';
import { getFollowStats } from '../../api/follow';
import { getProfileSocialLinks, replaceProfileSocialLinks } from '../../api/profileSocialLinks';
import { getAvatarDataUrl } from '../../lib/avatar';
import { FollowListModal } from '../../shared/components/FollowListModal';
import { mergeSocialLinks, normalizeSocialUrl, sanitizeEditableSocialLinks } from './ProfileSocialLinks';
import { ProfileHeader } from './ProfileHeader';
import {
  ProfileEditModal,
  MediaEditorModal,
  createAdjustedImageFile,
  MediaEditorKind,
  MediaEditorState,
} from './ProfileEditModal';
import { ProfilePostsTab } from './ProfilePostsTab';


const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';
const BANNER_ACCEPTED_TYPES = ['image/jpeg', 'image/png'];
const BANNER_MAX_BYTES = 8 * 1024 * 1024;
const BANNER_WIDTH = 1500;
const BANNER_HEIGHT = 500;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const ProfilePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, setAuth, updateProfile: updateProfileStore } = useAuthStore();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [peopleModal, setPeopleModal] = useState<'followers' | 'following' | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [coverZoom, setCoverZoom] = useState(1);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);
  const [mediaEditor, setMediaEditor] = useState<MediaEditorState | null>(null);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    college: ONLY_COLLEGE,
    bio: '',
    location: '',
    website: '',
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;

    setFormData({
      name: profile.name || '',
      username: profile.username || '',
      college: profile.college || ONLY_COLLEGE,
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
    });
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;

    const params = new URLSearchParams(location.search);
    if (params.get('edit') === '1') setIsEditModalOpen(true);
  }, [location.search, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    let isMounted = true;

    const loadSocialLinks = async () => {
      const { data } = await getProfileSocialLinks(profile.id);
      if (isMounted) {
        setSocialLinks(
          (data || []).map((item: any) => ({
            platform: item.platform || 'website',
            url: item.url || '',
          }))
        );
      }
    };

    loadSocialLinks();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    let mounted = true;
    getFollowStats(profile.id).then(({ data }) => {
      if (!mounted || !data) return;
      setFollowersCount(data.followers_count || 0);
      setFollowingCount(data.following_count || 0);
    });

    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const fallbackAvatar = getAvatarDataUrl({
    name: profile?.name,
    email: profile?.email,
    seed: profile?.id || profile?.email,
  });
  const displayAvatar = removeAvatar
    ? fallbackAvatar
    : avatarPreview || profile?.avatar_url || fallbackAvatar;
  const visibleSocialLinks = useMemo(
    () => mergeSocialLinks(profile?.website, socialLinks),
    [profile?.website, socialLinks]
  );

  const closeMediaEditor = () => {
    setMediaEditor((current) => {
      if (current?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  };

  const resetMediaState = () => {
    setAvatarPreview(null);
    setCoverPreview(null);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarZoom(1);
    setCoverZoom(1);
    setRemoveAvatar(false);
    setRemoveCover(false);
  };

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!BANNER_ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Banner must be a JPG or PNG image.');
      event.target.value = '';
      return;
    }

    if (file.size > BANNER_MAX_BYTES) {
      toast.error('Banner image must be 8 MB or smaller.');
      event.target.value = '';
      return;
    }

    setRemoveCover(false);
    setMediaEditor({
      kind: 'cover',
      file,
      previewUrl: URL.createObjectURL(file),
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
    event.target.value = '';
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('Profile image must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    setRemoveAvatar(false);
    setMediaEditor({
      kind: 'avatar',
      file,
      previewUrl: URL.createObjectURL(file),
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
    event.target.value = '';
  };

  const handleSaveMedia = async () => {
    if (!user || !profile || !mediaEditor) return;

    setIsSavingMedia(true);
    const toastId = toast.loading(`Saving ${mediaEditor.kind}...`);

    try {
      if (mediaEditor.kind === 'avatar') {
        const avatarToUpload = await createAdjustedImageFile(
          mediaEditor.file,
          mediaEditor.zoom,
          mediaEditor.offsetX,
          mediaEditor.offsetY,
          400,
          400,
          `avatar-${user.id}.jpg`
        );
        const { data, error } = await uploadAvatar(user.id, avatarToUpload);
        if (error) throw error;
        updateProfileStore({ avatar_url: data });
        setAuth(user, { ...profile, avatar_url: data });
      } else {
        const coverToUpload = await createAdjustedImageFile(
          mediaEditor.file,
          mediaEditor.zoom,
          mediaEditor.offsetX,
          mediaEditor.offsetY,
          BANNER_WIDTH,
          BANNER_HEIGHT,
          `cover-${user.id}.jpg`
        );
        const { data, error } = await uploadCover(user.id, coverToUpload);
        if (error) throw error;
        updateProfileStore({ cover_url: data });
        setAuth(user, { ...profile, cover_url: data });
      }

      toast.success(`${mediaEditor.kind === 'avatar' ? 'Profile photo' : 'Cover photo'} updated.`, {
        id: toastId,
      });
      closeMediaEditor();
    } catch (error: any) {
      toast.error(error?.message || 'Could not save image.', { id: toastId });
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleRemoveMedia = async (kind: MediaEditorKind) => {
    if (!user || !profile) return;

    const toastId = toast.loading(`Removing ${kind}...`);
    const updates = kind === 'avatar' ? { avatar_url: null } : { cover_url: DEFAULT_BANNER_IMAGE_URL };

    try {
      const { data, error } = await updateProfile(user.id, updates);
      if (error) throw error;
      updateProfileStore(updates);
      setAuth(user, data || { ...profile, ...updates });
      toast.success(`${kind === 'avatar' ? 'Profile photo' : 'Cover photo'} removed.`, { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove image.', { id: toastId });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!formData.name.trim() || !formData.username.replace('@', '').trim()) {
      toast.error('Full Name and Username cannot be empty.');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Saving profile...');
    const previousProfile = profile ? { ...profile } : null;

    try {
      let currentAvatarUrl = removeAvatar ? null : profile?.avatar_url;
      let currentCoverUrl = removeCover ? DEFAULT_BANNER_IMAGE_URL : profile?.cover_url;

      if (avatarFile) {
        const avatarToUpload = await createAdjustedImageFile(
          avatarFile,
          avatarZoom,
          0,
          0,
          400,
          400,
          `avatar-${user.id}.jpg`
        );
        const { data, error } = await uploadAvatar(user.id, avatarToUpload);
        if (error) throw error;
        currentAvatarUrl = data;
      }

      if (coverFile) {
        const coverToUpload = await createAdjustedImageFile(
          coverFile,
          coverZoom,
          0,
          0,
          BANNER_WIDTH,
          BANNER_HEIGHT,
          `cover-${user.id}.jpg`
        );
        const { data, error } = await uploadCover(user.id, coverToUpload);
        if (error) throw error;
        currentCoverUrl = data;
      }

      const updates = {
        name: formData.name,
        username: formData.username.replace('@', '').trim() || null,
        college: formData.college || ONLY_COLLEGE,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        avatar_url: currentAvatarUrl,
        cover_url: currentCoverUrl,
      };

      const normalizedSocialLinks = sanitizeEditableSocialLinks(socialLinks)
        .map((item) => ({
          platform: item.platform,
          url: normalizeSocialUrl(item.platform, item.url),
        }))
        .filter((item) => item.url);

      updateProfileStore(updates);
      const { data: updatedProfile, error } = await updateProfile(user.id, updates);
      if (error) throw error;

      const socialResult = await replaceProfileSocialLinks(user.id, normalizedSocialLinks);

      const { data: freshProfile } = await getProfile(user.id);
      setAuth(user, freshProfile || updatedProfile || { ...previousProfile, ...updates });
      toast.success(
        socialResult.error
          ? 'Profile updated. Social links need database setup before they can be saved.'
          : 'Profile updated.',
        { id: toastId }
      );
      setIsEditModalOpen(false);
      resetMediaState();
    } catch (error: any) {
      if (previousProfile) setAuth(user, previousProfile);
      toast.error(error?.message || 'Failed to update profile.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        Please log in to view your profile.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 text-text-primary font-sans">
      <div className="w-full flex justify-center min-h-screen pb-28">
        <div className="w-full max-w-[680px] bg-surface border-x border-border-subtle shadow-xs flex flex-col min-h-screen pb-10">
          <ProfileHeader
            profile={profile}
            postsStat={0}
            activeTab="diaries"
            followersCount={followersCount}
            followingCount={followingCount}
            displayAvatar={displayAvatar}
            coverPreview={coverPreview}
            removeCover={removeCover}
            visibleSocialLinks={visibleSocialLinks}
            onBack={() => navigate(-1)}
            onOpenEditModal={() => setIsEditModalOpen(true)}
            onOpenFollowersModal={() => setPeopleModal('followers')}
            onOpenFollowingModal={() => setPeopleModal('following')}
            onBannerChange={handleBannerChange}
            onAvatarChange={handleAvatarChange}
            onRemoveMedia={handleRemoveMedia}
            avatarInputRef={avatarInputRef}
            coverInputRef={coverInputRef}
          />

          <ProfilePostsTab
            viewerProfile={profile}
            profileUserId={profile.id}
          />
        </div>
      </div>

      <FollowListModal
        userId={profile?.id}
        openList={peopleModal}
        onClose={() => setPeopleModal(null)}
        currentUserId={profile?.id}
        totalFollowers={followersCount}
        totalFollowing={followingCount}
      />

      <ProfileEditModal
        isOpen={isEditModalOpen}
        isSaving={isSaving}
        formData={formData}
        onFormDataChange={setFormData}
        socialLinks={socialLinks}
        onSocialLinksChange={setSocialLinks}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
      />

      {mediaEditor ? (
        <MediaEditorModal
          state={mediaEditor}
          isSaving={isSavingMedia}
          onClose={closeMediaEditor}
          onChange={(updates) =>
            setMediaEditor((current) => (current ? { ...current, ...updates } : current))
          }
          onSubmit={handleSaveMedia}
        />
      ) : null}
    </div>
  );
};
