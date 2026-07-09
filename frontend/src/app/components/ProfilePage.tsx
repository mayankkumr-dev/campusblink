import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Calendar, Camera, ChevronLeft, ChevronRight, ExternalLink, GraduationCap, Heart, Link2, Lock, MapPin, MessageCircle, MoreHorizontal, Plus, Settings, Star, Trash2, X, Menu, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { ProfileSkeleton } from './ui/Skeletons';
import { getProfile, updateProfile, uploadAvatar, uploadCover } from '../../api/auth';
import { getLikedPosts, togglePostLike } from '../../api/community';
import { getFollowStats } from '../../api/follow';
import { getProfileSocialLinks, replaceProfileSocialLinks } from '../../api/profileSocialLinks';
import { supabase } from '../../lib/supabase';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle, getFirstName } from '../../lib/user';
import { AdaptivePostImage } from './AdaptivePostImage';
import { MAX_PROFILE_SOCIAL_LINKS, SOCIAL_PLATFORM_OPTIONS, SocialLinksStrip, mergeSocialLinks, normalizeSocialUrl, sanitizeEditableSocialLinks } from './ProfileSocialLinks';
import { FollowListModal } from './FollowListModal';
import { ProfilePictureInteract } from './ProfilePictureInteract';

const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';
const DEFAULT_BANNER_STYLE = {
  backgroundImage:
    'linear-gradient(135deg, var(--text-primary) 0%, #2A2A2A 50%, #1A1A1A 100%)',
};
const BANNER_ACCEPTED_TYPES = ['image/jpeg', 'image/png'];
const BANNER_MAX_BYTES = 8 * 1024 * 1024;
const BANNER_WIDTH = 1500;
const BANNER_HEIGHT = 500;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const POST_IMAGE_DELIMITER = '|||';

type MediaEditorKind = 'avatar' | 'cover';

type MediaEditorState = {
  kind: MediaEditorKind;
  file: File;
  previewUrl: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

async function createAdjustedImageFile(file: File, zoom: number, offsetX: number, offsetY: number, outputWidth: number, outputHeight: number, outputName: string) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const scale = Math.max(outputWidth / image.width, outputHeight / image.height) * zoom;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const maxOffsetX = Math.max(0, (drawWidth - outputWidth) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - outputHeight) / 2);
    const dx = (outputWidth - drawWidth) / 2 + (offsetX / 100) * maxOffsetX;
    const dy = (outputHeight - drawHeight) / 2 + (offsetY / 100) * maxOffsetY;

    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type || 'image/jpeg', 0.92));
    if (!blob) return file;
    return new File([blob], outputName, { type: blob.type || file.type || 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function MediaEditorModal({
  state,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  state: MediaEditorState;
  isSaving: boolean;
  onChange: (updates: Partial<MediaEditorState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isAvatar = state.kind === 'avatar';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-[24px] bg-[var(--bg)] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-white px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--yellow-dark)]">Adjust {state.kind}</p>
            <h3 className="mt-1  text-2xl font-extrabold text-[var(--text-primary)]">Preview before saving</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className={`overflow-hidden border border-black/10 bg-[var(--bg-secondary)] ${isAvatar ? 'mx-auto h-[280px] w-[280px] rounded-full' : 'aspect-[3/1] w-full rounded-[18px]'}`}>
            <img
              src={state.previewUrl}
              alt="Media preview"
              className="h-full w-full object-cover"
              style={{ transform: `translate(${state.offsetX * 0.35}%, ${state.offsetY * 0.35}%) scale(${state.zoom})`, transformOrigin: 'center center' }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Zoom</span>
              <input type="range" min="1" max="2.8" step="0.05" value={state.zoom} onChange={(event) => onChange({ zoom: Number(event.target.value) })} className="w-full" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Move Left / Right</span>
              <input type="range" min="-100" max="100" step="1" value={state.offsetX} onChange={(event) => onChange({ offsetX: Number(event.target.value) })} className="w-full" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Move Up / Down</span>
              <input type="range" min="-100" max="100" step="1" value={state.offsetY} onChange={(event) => onChange({ offsetY: Number(event.target.value) })} className="w-full" />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-black/10 bg-[var(--bg)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">Cancel</button>
          <button type="button" onClick={onSubmit} disabled={isSaving} className="rounded-md bg-[var(--text-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Use this image'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))}d`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parsePostImageUrls(post: any): string[] {
  if (Array.isArray(post?.image_urls) && post.image_urls.length > 0) {
    return post.image_urls.filter(Boolean);
  }

  const value = post?.image_url;
  if (!value || typeof value !== 'string') return [];

  if (value.includes(POST_IMAGE_DELIMITER)) {
    return value
      .split(POST_IMAGE_DELIMITER)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [value];
}

function PostCard({ post, viewerProfile, onLike, onOpenImage }: { post: any; viewerProfile: any; onLike: (postId: string, likedByMe: boolean) => void; onOpenImage: (images: string[], index: number) => void }) {
  const likedByMe = Boolean(viewerProfile?.id && post.liked_by?.includes(viewerProfile.id));
  const displayName = post.is_anonymous ? 'Anonymous Student' : post.author?.name || viewerProfile?.name || 'Campus Student';
  const handle = post.is_anonymous ? 'anonymous' : getDisplayHandle(post.author?.username || viewerProfile?.username, 'student');
  const avatar = post.is_anonymous
    ? null
    : post.author?.avatar_url || viewerProfile?.avatar_url || getAvatarDataUrl({
        name: post.author?.name || viewerProfile?.name,
        seed: post.author?.id || post.author_id || post.id,
      });
  const images = parsePostImageUrls(post);

  const handleCopyPostLink = async () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${base}/community/${post.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Post link copied.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  return (
    <article className="border-b border-slate-100 px-6 py-5 bg-white transition-colors hover:bg-slate-50/60">
      <div className="flex gap-4">
        <div className="mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200/80 bg-slate-50 shadow-2xs">
          {avatar ? (
            <img loading="lazy" src={avatar} alt={displayName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-700 bg-slate-100">?</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="truncate font-syne font-bold text-slate-900">{displayName}</span>
                <span className="text-slate-500 font-medium">@{handle}</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{formatRelativeTime(post.created_at)}</span>
                {post.is_anonymous && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Anonymous 🔒
                  </span>
                )}
                {post.author?.college && !post.is_anonymous && (
                  <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    {post.author.college.includes('(MAIT)') ? 'MAIT' : post.author.college}
                  </span>
                )}
              </div>
              {post.title && <h3 className="mt-1.5 text-base font-bold text-slate-900">{post.title}</h3>}
            </div>

            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800 font-normal">{post.content}</p>

          {images.length > 0 && (
            images.length === 1 ? (
              <div className="mt-3.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50">
                <AdaptivePostImage
                  src={images[0]}
                  alt="Post attachment"
                  onClick={() => onOpenImage(images, 0)}
                  className="w-full max-h-[500px] bg-slate-50"
                  imgClassName="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="mt-3.5 grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50">
                {images.slice(0, 4).map((image, index) => (
                  <AdaptivePostImage
                    key={`${image}-${index}`}
                    src={image}
                    alt={`Post attachment ${index + 1}`}
                    onClick={() => onOpenImage(images, index)}
                    className="bg-slate-100"
                    imgClassName="h-full w-full object-contain"
                  >
                    {images.length > 4 && index === 3 ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-bold text-white">
                        +{images.length - 4}
                      </div>
                    ) : null}
                  </AdaptivePostImage>
                ))}
              </div>
            )
          )}

          <div className="mt-4 flex max-w-md items-center justify-between text-slate-500 pt-1">
            <button
              onClick={() => onLike(post.id, likedByMe)}
              className={`group flex items-center gap-1.5 text-xs font-medium transition-colors ${
                likedByMe ? 'text-rose-600' : 'hover:text-rose-600'
              }`}
            >
              <span className={`flex h-8 px-2.5 items-center justify-center rounded-xl transition-all ${
                likedByMe ? 'bg-rose-50 text-rose-600' : 'group-hover:bg-rose-50'
              }`}>
                <Heart className={`h-4 w-4 mr-1.5 ${likedByMe ? 'fill-current' : ''}`} strokeWidth={1.5} />
                {post.likes_count || 0}
              </span>
            </button>

            <button className="group flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-blue-600">
              <span className="flex h-8 px-2.5 items-center justify-center rounded-xl transition-all group-hover:bg-blue-50">
                <MessageCircle className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                {post.comments_count || 0}
              </span>
            </button>

            <button onClick={handleCopyPostLink} className="group flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-slate-800">
              <span className="flex h-8 px-2.5 items-center justify-center rounded-xl transition-all group-hover:bg-slate-100">
                <Link2 className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                Share
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export const ProfilePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, setAuth, updateProfile: updateProfileStore } = useAuthStore();

  const [activeTab, setActiveTab] = useState('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [content, setContent] = useState<any[]>([]);
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
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
    let isMounted = true;

    const loadContent = async () => {
      if (!profile?.id) return;
      setIsLoadingContent(true);

      try {
        if (activeTab === 'likes') {
          const { data } = await getLikedPosts(profile.id);
          if (isMounted) setContent(data || []);
          return;
        }
        if (activeTab === 'replies') {
          const { data } = await supabase
            .from('comments')
            .select('content, created_at, post:posts!post_id(*, author:profiles!author_id(id, name, avatar_url, username, college), post_likes!left(user_id))')
            .eq('author_id', profile.id)
            .order('created_at', { ascending: false });

          const normalizedReplies = (data || [])
            .map((entry: any) => {
              if (!entry.post) return null;

              return {
                ...entry.post,
                reply_content: entry.content,
                liked_by: Array.isArray(entry.post?.post_likes) ? entry.post.post_likes.map((like: any) => like.user_id) : [],
              };
            })
            .filter(Boolean);

          if (isMounted) setContent(normalizedReplies);
          return;
        }

        const { data } = await supabase
          .from('posts')
          .select('*, author:profiles!author_id(id, name, avatar_url, username, college), post_likes!left(user_id)')
          .eq('author_id', profile.id)
          .order('created_at', { ascending: false });

        const normalizedPosts = (data || []).map((post: any) => ({
          ...post,
          likes_count: post.likes_count ?? post.upvotes ?? 0,
          liked_by: Array.isArray(post.post_likes) ? post.post_likes.map((like: any) => like.user_id) : [],
        }));

        if (isMounted) setContent(normalizedPosts);
      } finally {
        if (isMounted) setIsLoadingContent(false);
      }
    };

    loadContent();
    return () => {
      isMounted = false;
    };
  }, [activeTab, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    let isMounted = true;

    const loadSocialLinks = async () => {
      const { data } = await getProfileSocialLinks(profile.id);
      if (isMounted) {
        setSocialLinks((data || []).map((item: any) => ({ platform: item.platform || 'website', url: item.url || '' })));
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

  const fallbackAvatar = getAvatarDataUrl({ name: profile?.name, email: profile?.email, seed: profile?.id || profile?.email });
  const displayAvatar = removeAvatar ? fallbackAvatar : avatarPreview || profile?.avatar_url || fallbackAvatar;
  const firstName = useMemo(() => getFirstName(profile?.name, 'Student'), [profile?.name]);
  const visibleSocialLinks = useMemo(() => mergeSocialLinks(profile?.website, socialLinks), [profile?.website, socialLinks]);

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
    setMediaEditor({ kind: 'cover', file, previewUrl: URL.createObjectURL(file), zoom: 1, offsetX: 0, offsetY: 0 });
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
    setMediaEditor({ kind: 'avatar', file, previewUrl: URL.createObjectURL(file), zoom: 1, offsetX: 0, offsetY: 0 });
    event.target.value = '';
  };

  const handleSaveMedia = async () => {
    if (!user || !profile || !mediaEditor) return;

    setIsSavingMedia(true);
    const toastId = toast.loading(`Saving ${mediaEditor.kind}...`);

    try {
      if (mediaEditor.kind === 'avatar') {
        const avatarToUpload = await createAdjustedImageFile(mediaEditor.file, mediaEditor.zoom, mediaEditor.offsetX, mediaEditor.offsetY, 400, 400, `avatar-${user.id}.jpg`);
        const { data, error } = await uploadAvatar(user.id, avatarToUpload);
        if (error) throw error;
        updateProfileStore({ avatar_url: data });
        setAuth(user, { ...profile, avatar_url: data });
      } else {
        const coverToUpload = await createAdjustedImageFile(mediaEditor.file, mediaEditor.zoom, mediaEditor.offsetX, mediaEditor.offsetY, BANNER_WIDTH, BANNER_HEIGHT, `cover-${user.id}.jpg`);
        const { data, error } = await uploadCover(user.id, coverToUpload);
        if (error) throw error;
        updateProfileStore({ cover_url: data });
        setAuth(user, { ...profile, cover_url: data });
      }

      toast.success(`${mediaEditor.kind === 'avatar' ? 'Profile photo' : 'Cover photo'} updated.`, { id: toastId });
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

  const handleLike = async (postId: string, likedByMe: boolean) => {
    if (!profile?.id) return;

    setContent((prev) =>
      prev.map((item) => {
        if (item.id !== postId) return item;

        const likedBy = new Set(item.liked_by || []);
        if (likedByMe) likedBy.delete(profile.id);
        else likedBy.add(profile.id);

        return {
          ...item,
          liked_by: Array.from(likedBy),
          likes_count: Math.max(0, (item.likes_count || 0) + (likedByMe ? -1 : 1)),
        };
      })
    );

    const { error } = await togglePostLike(postId, profile.id);
    if (error) {
      toast.error(error.message || 'Could not update like');
      setContent((prev) =>
        prev.map((item) => {
          if (item.id !== postId) return item;

          const likedBy = new Set(item.liked_by || []);
          if (likedByMe) likedBy.add(profile.id);
          else likedBy.delete(profile.id);

          return {
            ...item,
            liked_by: Array.from(likedBy),
            likes_count: Math.max(0, (item.likes_count || 0) + (likedByMe ? 1 : -1)),
          };
        })
      );
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
        const avatarToUpload = await createAdjustedImageFile(avatarFile, avatarZoom, 0, 0, 400, 400, `avatar-${user.id}.jpg`);
        const { data, error } = await uploadAvatar(user.id, avatarToUpload);
        if (error) throw error;
        currentAvatarUrl = data;
      }

      if (coverFile) {
        const coverToUpload = await createAdjustedImageFile(coverFile, coverZoom, 0, 0, BANNER_WIDTH, BANNER_HEIGHT, `cover-${user.id}.jpg`);
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
        .map((item) => ({ platform: item.platform, url: normalizeSocialUrl(item.platform, item.url) }))
        .filter((item) => item.url);

      updateProfileStore(updates);
      const { data: updatedProfile, error } = await updateProfile(user.id, updates);
      if (error) throw error;

      const socialResult = await replaceProfileSocialLinks(user.id, normalizedSocialLinks);

      const { data: freshProfile } = await getProfile(user.id);
      setAuth(user, freshProfile || updatedProfile || { ...previousProfile, ...updates });
      toast.success(socialResult.error ? 'Profile updated. Social links need database setup before they can be saved.' : 'Profile updated.', { id: toastId });
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
    return <div className="p-8 text-center text-[var(--text-secondary)]">Please log in to view your profile.</div>;
  }

  const postsStat = activeTab === 'posts' ? content.length : 0;
  const displayWebsite = profile.website?.replace(/^https?:\/\//, '');
  const joinedOn = profile.created_at ? new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 font-sans">
      <div className="w-full flex justify-center min-h-screen pb-28">
        {/* Main Feed Column */}
        <div className="w-full max-w-[680px] bg-white border-x border-slate-200/80 shadow-xs flex flex-col min-h-screen pb-10">
          {/* Sticky Top Header Bar */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <div>
              <h1 className="font-syne font-bold text-base text-slate-900 leading-tight">{profile.name}</h1>
              <p className="text-xs text-slate-500">{postsStat} {activeTab}</p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
              aria-label="Open profile menu"
            >
              <Menu className="h-4 w-4" strokeWidth={1.8} />
            </button>
            {profileMenuOpen && (
              <>
                <button type="button" aria-label="Close profile menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                  <button type="button" onClick={() => { setProfileMenuOpen(false); navigate('/student/settings'); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Settings className="h-4 w-4 text-slate-400" /> Settings
                  </button>
                  <button type="button" onClick={() => { setProfileMenuOpen(false); navigate('/student/settings/notifications'); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Bell className="h-4 w-4 text-slate-400" /> Notifications
                  </button>
                  <button type="button" onClick={() => { setProfileMenuOpen(false); navigate('/student/settings/password'); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Lock className="h-4 w-4 text-slate-400" /> Password
                  </button>
                  <button type="button" onClick={() => { setProfileMenuOpen(false); navigate('/student/settings/feedback'); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <MessageCircle className="h-4 w-4 text-slate-400" /> Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <section className="w-full bg-white">
          {/* Banner Container */}
          <div className="group relative w-full overflow-hidden bg-slate-100" style={{ aspectRatio: `${BANNER_WIDTH} / ${BANNER_HEIGHT}`, minHeight: '180px', maxHeight: '250px' }}>
            {profile.cover_url && !removeCover ? (
              <img loading="lazy" src={coverPreview || profile.cover_url} alt="Profile banner" className="h-full w-full object-cover object-center transition-opacity duration-300" />
            ) : (
              <img loading="lazy" src={DEFAULT_BANNER_IMAGE_URL} alt="Default profile banner" className="h-full w-full object-cover object-center" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60" />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-white"
            >
              <Camera className="h-3.5 w-3.5" />
              Edit Cover
            </button>
            {profile.cover_url ? (
              <button
                onClick={() => handleRemoveMedia('cover')}
                className="absolute right-[134px] top-4 inline-flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            ) : null}
            <input ref={coverInputRef} type="file" accept="image/png,image/jpeg" onChange={handleBannerChange} className="hidden" />
          </div>

          {/* Avatar & Action Buttons Row */}
          <div className={`relative mx-auto -mt-14 flex items-end justify-between px-6 ${visibleSocialLinks.length ? 'pb-12' : ''}`}>
            <div className="group relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
              <ProfilePictureInteract imageUrl={displayAvatar} alt={profile.name} className="h-full w-full">
                <img loading="lazy" src={displayAvatar} alt={profile.name} className="h-full w-full rounded-full object-cover transition-transform duration-150 group-hover:scale-[1.03]" />
              </ProfilePictureInteract>
              <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </button>
              {profile.avatar_url ? (
                <button onClick={() => handleRemoveMedia('avatar')} className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm" title="Remove photo">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <div className="relative flex flex-col items-end">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300"
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
                    className="rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300"
                  >
                    Share Profile
                  </button>
                </div>
                {visibleSocialLinks.length ? <SocialLinksStrip links={visibleSocialLinks} className="absolute right-0 top-full mt-3 w-max" /> : null}
              </div>
            </div>
          </div>

          {/* User Info & Bio Section */}
          <div className="mx-auto px-6 pt-4">
            <div className="animate-[fadeIn_0.3s_ease]">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-syne font-bold text-2xl text-slate-900 select-text leading-tight">{profile.name}</h1>
                <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  <GraduationCap className="mr-1 h-3.5 w-3.5" />
                  MAIT
                </span>
              </div>

              <p className="mt-0.5 text-sm font-medium text-slate-500">@{getDisplayHandle(profile.username, 'student')}</p>

              <p className="mt-3 max-w-[540px] whitespace-pre-wrap text-sm font-normal leading-relaxed text-slate-700 select-text">
                {profile.bio || 'Set up your profile with a short intro, your links, and what you are known for on campus.'}
              </p>

              {/* College Tags & Metadata Strip */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                {profile.location ? (
                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /><span>{profile.location}</span></div>
                ) : null}
                {profile.website ? (
                  <a href={`https://${displayWebsite}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors text-blue-600 hover:underline"><Link2 className="h-3.5 w-3.5" /><span>{displayWebsite}</span></a>
                ) : null}
                {joinedOn ? <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /><span>Joined {joinedOn}</span></div> : null}
                <div className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-slate-400" /><span>{profile.college || ONLY_COLLEGE}</span></div>
              </div>

              {/* Stats Row: Posts, Followers, Following, Reputation */}
              <div className="grid grid-cols-4 gap-3 my-6">
                <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow">
                  <div className="font-syne font-bold text-xl text-slate-900">{postsStat}</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Posts</div>
                </div>

                <button
                  onClick={() => setPeopleModal('followers')}
                  className="bg-white rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
                >
                  <div className="font-syne font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">{followersCount}</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Followers</div>
                </button>

                <button
                  onClick={() => setPeopleModal('following')}
                  className="bg-white rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group"
                >
                  <div className="font-syne font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">{followingCount}</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Following</div>
                </button>

                <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 text-center hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow">
                  <div className="font-syne font-bold text-xl text-amber-500">{profile.campus_credits || 0}</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">Reputation</div>
                </div>
              </div>

              {/* Your Reputation Card with Soft Subtle Shadows */}
              <div className="rounded-2xl bg-gradient-to-br from-white via-amber-50/30 to-amber-50/60 p-5 shadow-[0_4px_20px_rgba(245,158,11,0.08)] border border-amber-200/60 mb-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      Your Reputation Score
                    </div>
                    <div className="mt-1 font-syne text-2xl font-bold text-slate-900">
                      {profile.campus_credits || 0} <span className="text-xs font-semibold text-slate-500 ml-1">credits earned</span>
                    </div>
                  </div>
                  <button className="text-xs font-semibold text-amber-700 bg-amber-100/70 hover:bg-amber-100 rounded-xl px-3.5 py-2 transition-colors shrink-0">
                    How to earn →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs: Posts, Replies, Likes */}
          <div className="border-b border-slate-100 px-6 bg-white sticky top-14 z-20">
            <div className="flex gap-6">
              {['posts', 'replies', 'likes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative py-3.5 text-sm font-semibold capitalize transition-all duration-150 ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content Feed Section */}
          <div className="bg-white">
            <div className="min-h-[260px] transition-opacity duration-200">
              {isLoadingContent ? (
                <div className="py-6 px-6">
                  <ProfileSkeleton />
                </div>
              ) : content.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {content.map((item) => (
                    <div key={`${activeTab}-${item.id}`}>
                      {activeTab === 'replies' && item.reply_content ? (
                        <div className="px-6 pt-4 text-xs font-medium text-slate-500 bg-slate-50/50">
                          Replied: <span className="text-slate-700 italic">"{item.reply_content}"</span>
                        </div>
                      ) : null}
                      <PostCard post={item} viewerProfile={profile} onLike={handleLike} onOpenImage={(images, index) => setLightbox({ images, index })} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center px-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-400 shadow-2xs">
                    {activeTab === 'posts' ? <Star className="h-5 w-5" /> : activeTab === 'replies' ? <MessageCircle className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">No {activeTab} yet</h3>
                  <p className="mt-1 text-sm text-slate-500">Your {activeTab} activity will appear here.</p>
                  {activeTab === 'posts' ? (
                    <button
                      className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50"
                      onClick={() => navigate('/student/community')}
                    >
                      Create a Post
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {lightbox ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 z-10 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"><X className="h-6 w-6" /></button>
          {lightbox.images.length > 1 ? (
            <>
              <button onClick={(event) => { event.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length } : current); }} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"><ChevronLeft className="h-6 w-6" /></button>
              <button onClick={(event) => { event.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.images.length } : current); }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"><ChevronRight className="h-6 w-6" /></button>
            </>
          ) : null}
          <img loading="lazy" onClick={(event) => event.stopPropagation()} src={lightbox.images[Math.max(0, Math.min(lightbox.index, lightbox.images.length - 1))]} alt="Expanded attachment" className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain" />
        </div>
      ) : null}

      <FollowListModal
        userId={profile?.id}
        openList={peopleModal}
        onClose={() => setPeopleModal(null)}
        currentUserId={profile?.id}
        totalFollowers={followersCount}
        totalFollowing={followingCount}
      />

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 font-sans">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4.5 backdrop-blur-md">
              <h2 className="font-syne text-xl font-extrabold text-slate-900">Edit Profile</h2>
              <button
                onClick={() => !isSaving && setIsEditModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Sections with Breathable Padding */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Basic Info Section */}
              <section className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-syne text-sm font-bold text-slate-900">Basic Info</h3>
                  <p className="text-xs text-slate-500">Update your primary identity displayed across Campus Blink.</p>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Full Name
                  </span>
                  <input
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 shadow-2xs"
                    placeholder="Your Full Name"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Username
                  </span>
                  <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                    <span className="mr-1.5 font-semibold text-slate-400 text-sm">@</span>
                    <input
                      value={formData.username}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          username: event.target.value.replace(/^@+/, '').replace(/\s+/g, ''),
                        })
                      }
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
                      placeholder="username"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Bio
                  </span>
                  <textarea
                    value={formData.bio}
                    onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                    rows={3}
                    maxLength={160}
                    className="w-full resize-none rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 shadow-2xs"
                    placeholder="Tell campus about yourself..."
                  />
                  <span className="mt-1.5 block text-right text-xs font-medium text-slate-400">
                    {formData.bio.length} / 160
                  </span>
                </label>
              </section>

              {/* Personal Section */}
              <section className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-syne text-sm font-bold text-slate-900">Personal & College</h3>
                  <p className="text-xs text-slate-500">Your campus affiliation and location details.</p>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Location
                  </span>
                  <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                    <MapPin className="mr-2.5 h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      value={formData.location}
                      onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
                      placeholder="e.g. Rohini, Delhi"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Website
                  </span>
                  <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                    <Link2 className="mr-2.5 h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      value={formData.website}
                      onChange={(event) => setFormData({ ...formData, website: event.target.value })}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    College
                  </span>
                  <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs">
                    <GraduationCap className="mr-2.5 h-4 w-4 text-slate-400 shrink-0" />
                    <select
                      value={formData.college}
                      onChange={(event) => setFormData({ ...formData, college: event.target.value })}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                    >
                      <option value={ONLY_COLLEGE}>{ONLY_COLLEGE}</option>
                    </select>
                  </div>
                </label>
              </section>

              {/* Dynamic Social Links Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-syne text-sm font-bold text-slate-900">Social Links</h3>
                    <p className="text-xs text-slate-500">
                      Add up to {MAX_PROFILE_SOCIAL_LINKS} external profiles.
                    </p>
                  </div>
                  {socialLinks.length < MAX_PROFILE_SOCIAL_LINKS ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSocialLinks((current) => [...current, { platform: 'instagram', url: '' }])
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.2} /> Add link
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {socialLinks.length ? (
                    socialLinks.map((item, index) => (
                      <div
                        key={`${item.platform}-${index}`}
                        className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto] items-center"
                      >
                        <select
                          value={item.platform}
                          onChange={(event) =>
                            setSocialLinks((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, platform: event.target.value } : entry,
                              ),
                            )
                          }
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-3 text-xs font-semibold text-slate-800 outline-none transition-colors focus:border-blue-600 focus:bg-white"
                        >
                          {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={item.url}
                          onChange={(event) =>
                            setSocialLinks((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, url: event.target.value } : entry,
                              ),
                            )
                          }
                          placeholder="Paste URL or handle..."
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSocialLinks((current) =>
                              current.filter((_, entryIndex) => entryIndex !== index),
                            )
                          }
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                      <p className="text-xs text-slate-500">No extra social links added yet.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-md">
              <button
                type="button"
                onClick={() => !isSaving && setIsEditModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mediaEditor ? (
        <MediaEditorModal
          state={mediaEditor}
          isSaving={isSavingMedia}
          onClose={closeMediaEditor}
          onChange={(updates) => setMediaEditor((current) => current ? { ...current, ...updates } : current)}
          onSubmit={handleSaveMedia}
        />
      ) : null}
    </div>
    </div>
  );
};
