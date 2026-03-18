import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Camera, ChevronLeft, ChevronRight, ExternalLink, GraduationCap, Heart, Link2, Loader2, MapPin, MessageCircle, MoreHorizontal, Plus, Star, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
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

const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';
const DEFAULT_BANNER_STYLE = {
  backgroundImage:
    'linear-gradient(135deg, #0D0D0D 0%, #2A2A2A 50%, #1A1A1A 100%)',
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
      <div className="w-full max-w-2xl rounded-[24px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-[#E8E8E8] px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#CA8A04]">Adjust {state.kind}</p>
            <h3 className="mt-1 font-syne text-2xl font-extrabold text-[#0D0D0D]">Preview before saving</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className={`overflow-hidden border border-black/10 bg-[#F2F0EB] ${isAvatar ? 'mx-auto h-[280px] w-[280px] rounded-full' : 'aspect-[3/1] w-full rounded-[18px]'}`}>
            <img
              src={state.previewUrl}
              alt="Media preview"
              className="h-full w-full object-cover"
              style={{ transform: `translate(${state.offsetX * 0.35}%, ${state.offsetY * 0.35}%) scale(${state.zoom})`, transformOrigin: 'center center' }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">Zoom</span>
              <input type="range" min="1" max="2.8" step="0.05" value={state.zoom} onChange={(event) => onChange({ zoom: Number(event.target.value) })} className="w-full" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">Move Left / Right</span>
              <input type="range" min="-100" max="100" step="1" value={state.offsetX} onChange={(event) => onChange({ offsetX: Number(event.target.value) })} className="w-full" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">Move Up / Down</span>
              <input type="range" min="-100" max="100" step="1" value={state.offsetY} onChange={(event) => onChange({ offsetY: Number(event.target.value) })} className="w-full" />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E8E8E8] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#0D0D0D]">Cancel</button>
          <button type="button" onClick={onSubmit} disabled={isSaving} className="rounded-md bg-[#0D0D0D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D] disabled:opacity-60">
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
    <article className="border-b border-black/10 px-5 py-5 transition-colors hover:bg-black/[0.02]">
      <div className="flex gap-3">
        <div className="mt-1 h-12 w-12 shrink-0 overflow-hidden rounded-md border border-black/10 bg-[#F2F0EB]">
          {avatar ? <img src={avatar} alt={displayName} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#0D0D0D]">?</div>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="truncate font-bold text-[#0D0D0D]">{displayName}</span>
                <span className="text-[#6B6B6B]">@{handle}</span>
                <span className="text-[#B0B0B0]">·</span>
                <span className="text-[#6B6B6B]">{formatRelativeTime(post.created_at)}</span>
                {post.is_anonymous && (
                  <>
                    <span className="rounded-md bg-[#F1F1F1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">Anonymous</span>
                    <span
                      title="Only you and admin can see this is yours"
                      className="inline-flex items-center rounded-md border border-black/10 bg-[#FAFAF8] px-2 py-0.5 text-[10px] font-bold text-[#6B6B6B]"
                    >
                      🔒
                    </span>
                  </>
                )}
                {post.author?.college && !post.is_anonymous && (
                  <span className="rounded-md bg-[#FFD600]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0D0D0D]">
                    {post.author.college.includes('(MAIT)') ? 'MAIT' : post.author.college}
                  </span>
                )}
              </div>
              {post.title && <h3 className="mt-2 text-lg font-bold leading-tight text-[#0D0D0D]">{post.title}</h3>}
            </div>

            <button className="flex h-9 w-9 items-center justify-center rounded-md text-[#6B6B6B] transition-colors hover:bg-black/5 hover:text-[#0D0D0D]">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <p className="community-post-content mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[#222222]">{post.content}</p>

          {images.length > 0 && (
            images.length === 1 ? (
              <div className="mt-4 overflow-hidden rounded-[24px] border border-black/10 bg-[#F2F0EB]">
                <AdaptivePostImage
                  src={images[0]}
                  alt="Post attachment"
                  onClick={() => onOpenImage(images, 0)}
                  className="w-full max-h-[620px] bg-[#F2F0EB]"
                  imgClassName="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-[24px] border border-black/10 bg-[#F2F0EB]">
                {images.slice(0, 4).map((image, index) => (
                  <AdaptivePostImage
                    key={`${image}-${index}`}
                    src={image}
                    alt={`Post attachment ${index + 1}`}
                    onClick={() => onOpenImage(images, index)}
                    className="bg-[#EDE9DF]"
                    imgClassName="h-full w-full object-contain"
                  >
                    {images.length > 4 && index === 3 ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-extrabold text-white">+{images.length - 4}</div>
                    ) : null}
                  </AdaptivePostImage>
                ))}
              </div>
            )
          )}

          <div className="mt-4 flex max-w-xl items-center justify-between text-[#6B6B6B]">
            <button
              onClick={() => onLike(post.id, likedByMe)}
              className={`group flex items-center gap-2 text-sm transition-colors ${likedByMe ? 'text-[#FF3D57]' : 'hover:text-[#FF3D57]'}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${likedByMe ? 'bg-[#FF3D57]/10' : 'group-hover:bg-[#FF3D57]/10'}`}>
                <Heart className={`h-4 w-4 ${likedByMe ? 'fill-current' : ''}`} />
              </span>
              <span>{post.likes_count || 0}</span>
            </button>

            <button className="group flex items-center gap-2 text-sm transition-colors hover:text-[#0D0D0D]">
              <span className="flex h-9 w-9 items-center justify-center rounded-md transition-colors group-hover:bg-[#0057FF]/10">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span>{post.comments_count || 0}</span>
            </button>

            <button onClick={handleCopyPostLink} className="group flex items-center gap-2 text-sm transition-colors hover:text-[#0D0D0D]">
              <span className="flex h-9 w-9 items-center justify-center rounded-md transition-colors group-hover:bg-[#FFD600]/15">
                <Link2 className="h-4 w-4" />
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
  const [isLoadingContent, setIsLoadingContent] = useState(false);
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
            .select('id, content, created_at, post:posts!post_id(id, title, content, created_at, image_url, likes_count, comments_count, is_anonymous, author:profiles!author_id(id, name, avatar_url, username, college), post_likes!left(user_id))')
            .eq('author_id', profile.id)
            .order('created_at', { ascending: false });

          const normalizedReplies = (data || [])
            .map((entry: any) => ({
              ...entry.post,
              reply_content: entry.content,
              liked_by: Array.isArray(entry.post?.post_likes) ? entry.post.post_likes.map((like: any) => like.user_id) : [],
            }))
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
    return <div className="p-8 text-center text-[#6B6B6B]">Please log in to view your profile.</div>;
  }

  const postsStat = activeTab === 'posts' ? content.length : 0;
  const displayWebsite = profile.website?.replace(/^https?:\/\//, '');
  const joinedOn = profile.created_at ? new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24 text-[#0D0D0D]">
      <div className="mx-auto w-full max-w-[1100px] pb-10 md:px-0">
        <section className="w-full bg-[#FAFAF8]">
          <div className="group relative w-full overflow-hidden" style={{ aspectRatio: `${BANNER_WIDTH} / ${BANNER_HEIGHT}`, minHeight: '180px', maxHeight: '280px' }}>
            {profile.cover_url && !removeCover ? (
              <img src={coverPreview || profile.cover_url} alt="Profile banner" className="h-full w-full object-cover object-center transition-opacity duration-300" />
            ) : (
              <img src={DEFAULT_BANNER_IMAGE_URL} alt="Default profile banner" className="h-full w-full object-cover object-center" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-[6px] bg-white/90 px-3 py-1.5 text-[13px] font-medium text-[#0D0D0D] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              <Camera className="h-4 w-4" />
              Edit Cover
            </button>
            {profile.cover_url ? (
              <button
                onClick={() => handleRemoveMedia('cover')}
                className="absolute right-[132px] top-4 inline-flex items-center gap-2 rounded-[6px] bg-white/90 px-3 py-1.5 text-[13px] font-medium text-[#DC2626] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : null}
            <input ref={coverInputRef} type="file" accept="image/png,image/jpeg" onChange={handleBannerChange} className="hidden" />
          </div>

          <div className={`relative mx-auto -mt-12 flex items-end justify-between px-4 md:px-8 ${visibleSocialLinks.length ? 'pb-14' : ''}`}>
            <div className="group relative h-28 w-28 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] md:h-28 md:w-28">
              <img src={displayAvatar} alt={profile.name} className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]" />
              <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </button>
              {profile.avatar_url ? (
                <button onClick={() => handleRemoveMedia('avatar')} className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#DC2626] shadow-sm" title="Remove photo">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditModalOpen(true)} className="rounded-[6px] border border-black/10 bg-white px-3.5 py-2 text-[13px] font-medium text-[#0D0D0D] transition-colors duration-150 hover:bg-[#F5F4F0]">
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
                    className="rounded-[6px] border border-transparent bg-transparent px-3.5 py-2 text-[13px] font-medium text-[#6B6B6B] transition-colors duration-150 hover:bg-white hover:text-[#0D0D0D]"
                  >
                    Share Profile
                  </button>
                </div>
                {visibleSocialLinks.length ? <SocialLinksStrip links={visibleSocialLinks} className="absolute right-0 top-full mt-3 w-max" /> : null}
              </div>
            </div>
          </div>

          <div className="mx-auto px-4 pt-3 md:px-8">
            <div className="animate-[fadeIn_0.3s_ease]">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-syne text-[22px] font-bold text-[#0D0D0D]">{profile.name}</h1>
                <span className="inline-flex items-center rounded-[4px] bg-[#FEFCE8] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#CA8A04]">
                  <GraduationCap className="mr-1 h-3.5 w-3.5" />
                  MAIT
                </span>
              </div>

              <p className="mt-0.5 text-[14px] font-normal text-[#9B9B9B]">@{getDisplayHandle(profile.username, 'student')}</p>

              <p className="mt-2 max-w-[480px] whitespace-pre-wrap text-[14px] font-normal leading-[1.6] text-[#6B6B6B]">
                {profile.bio || 'Set up your profile with a short intro, your links, and what you are known for on campus.'}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#9B9B9B]">
                {profile.location ? (
                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><span>{profile.location}</span></div>
                ) : null}
                {profile.website ? (
                  <a href={`https://${displayWebsite}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-[#0D0D0D]"><Link2 className="h-3.5 w-3.5" /><span>{displayWebsite}</span></a>
                ) : null}
                {joinedOn ? <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><span>Joined {joinedOn}</span></div> : null}
                <div className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /><span>{profile.college || ONLY_COLLEGE}</span></div>
              </div>

              <div className="mt-5 border-t border-[#E8E8E8] pt-5">
                <div className="grid grid-cols-2 gap-y-4 md:flex md:items-center md:gap-0">
                  <div className="pr-4 md:min-w-[120px]">
                    <button className="text-left">
                      <div className="font-syne text-[20px] font-bold text-[#0D0D0D]">{postsStat}</div>
                      <div className="text-[13px] font-normal text-[#9B9B9B]">Posts</div>
                    </button>
                  </div>
                  <div className="hidden h-10 w-px bg-[#E8E8E8] md:block" />
                  <div className="pr-4 md:min-w-[120px] md:pl-5">
                    <button onClick={() => setPeopleModal('followers')} className="text-left">
                      <div className="font-syne text-[20px] font-bold text-[#0D0D0D]">{followersCount}</div>
                      <div className="text-[13px] font-normal text-[#9B9B9B]">Followers</div>
                    </button>
                  </div>
                  <div className="hidden h-10 w-px bg-[#E8E8E8] md:block" />
                  <div className="pr-4 md:min-w-[120px] md:pl-5">
                    <button onClick={() => setPeopleModal('following')} className="text-left">
                      <div className="font-syne text-[20px] font-bold text-[#0D0D0D]">{followingCount}</div>
                      <div className="text-[13px] font-normal text-[#9B9B9B]">Following</div>
                    </button>
                  </div>
                  <div className="hidden h-10 w-px bg-[#E8E8E8] md:block" />
                  <div className="md:min-w-[120px] md:pl-5">
                    <div className="font-syne text-[20px] font-bold text-[#CA8A04]">{profile.campus_credits || 0}</div>
                    <div className="text-[13px] font-normal text-[#9B9B9B]">Reputation</div>
                  </div>
                </div>

                <div className="mt-5 rounded-[8px] border border-[#FDE68A] bg-[#FEFCE8] px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0D0D0D]"><Star className="h-5 w-5 text-[#CA8A04]" />Your Reputation</div>
                      <div className="mt-1 font-syne text-[24px] font-bold text-[#CA8A04]">{profile.campus_credits || 0}</div>
                    </div>
                    <button className="text-[13px] font-normal text-[#CA8A04] transition-colors hover:text-[#9A7500]">How to earn {'>'}</button>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-b border-[#E8E8E8] px-4 md:px-8">
            <div className="flex overflow-x-auto">
              {['posts', 'replies', 'likes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-[14px] font-medium capitalize transition-colors duration-150 ${activeTab === tab ? 'border-b-[#0D0D0D] text-[#0D0D0D]' : 'border-b-transparent text-[#9B9B9B] hover:text-[#0D0D0D]'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FAFAF8] px-4 py-6 md:px-8">
            <div className="min-h-[260px] transition-opacity duration-200">
              {isLoadingContent ? (
                <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-[#0D0D0D]" /></div>
              ) : content.length > 0 ? (
                <div className="divide-y divide-[#E8E8E8]">
                  {content.map((item) => (
                    <div key={`${activeTab}-${item.id}`}>
                      {activeTab === 'replies' && item.reply_content ? <div className="px-5 pt-5 text-sm text-[#6B6B6B]">Replied: "{item.reply_content}"</div> : null}
                      <PostCard post={item} viewerProfile={profile} onLike={handleLike} onOpenImage={(images, index) => setLightbox({ images, index })} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F4F0] text-[#D0D0D0]">
                    {activeTab === 'posts' ? <Star className="h-5 w-5" /> : activeTab === 'replies' ? <MessageCircle className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                  </div>
                  <h3 className="font-syne text-[16px] font-semibold text-[#0D0D0D]">No {activeTab} yet</h3>
                  <p className="mt-1 text-[14px] text-[#9B9B9B]">Your {activeTab} activity will appear here.</p>
                  {activeTab === 'posts' ? (
                    <button className="mt-4 rounded-[6px] border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#0D0D0D] transition-colors hover:bg-[#F5F4F0]" onClick={() => navigate('/student/community')}>
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
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 z-10 rounded-md bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-6 w-6" /></button>
          {lightbox.images.length > 1 ? (
            <>
              <button onClick={(event) => { event.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length } : current); }} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-white/10 p-2 text-white hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></button>
              <button onClick={(event) => { event.stopPropagation(); setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.images.length } : current); }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-white/10 p-2 text-white hover:bg-white/20"><ChevronRight className="h-6 w-6" /></button>
            </>
          ) : null}
          <img onClick={(event) => event.stopPropagation()} src={lightbox.images[Math.max(0, Math.min(lightbox.index, lightbox.images.length - 1))]} alt="Expanded attachment" className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain" />
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
          <div className="flex h-[100dvh] w-full flex-col bg-white md:h-auto md:max-h-[92vh] md:max-w-[600px] md:rounded-[14px] md:shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-[#E8E8E8] px-5 py-4">
              <h2 className="font-syne text-[18px] font-semibold text-[#0D0D0D]">Edit Profile</h2>
              <button onClick={() => !isSaving && setIsEditModalOpen(false)} className="rounded-[6px] p-1.5 text-[#6B6B6B] hover:bg-[#F5F4F0] hover:text-[#0D0D0D]"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-6">
                <section className="space-y-4">
                  <p className="text-[13px] font-medium text-[#0D0D0D]">Basic Info</p>
                  <label className="block"><span className="mb-1 block text-[13px] font-medium text-[#0D0D0D]">Full Name</span><input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm outline-none focus:border-black/20" /></label>
                  <label className="block"><span className="mb-1 block text-[13px] font-medium text-[#0D0D0D]">Username</span><div className="flex items-center rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5"><span className="mr-1 text-sm text-[#9B9B9B]">@</span><input value={formData.username} onChange={(event) => setFormData({ ...formData, username: event.target.value.replace(/^@+/, '').replace(/\s+/g, '') })} className="w-full bg-transparent text-sm outline-none" /></div></label>
                  <label className="block"><span className="mb-1 block text-[13px] font-medium text-[#0D0D0D]">Bio</span><textarea value={formData.bio} onChange={(event) => setFormData({ ...formData, bio: event.target.value })} rows={4} maxLength={160} className="w-full resize-none rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm outline-none focus:border-black/20" /><span className="mt-1 block text-right text-[12px] text-[#9B9B9B]">{formData.bio.length}/160</span></label>
                </section>

                <section className="space-y-4 border-t border-[#E8E8E8] pt-5">
                  <p className="text-[13px] font-medium text-[#0D0D0D]">Personal</p>
                  <label className="block"><span className="mb-1 block text-[13px] font-medium text-[#0D0D0D]">Location</span><div className="flex items-center rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5"><MapPin className="mr-2 h-4 w-4 text-[#9B9B9B]" /><input value={formData.location} onChange={(event) => setFormData({ ...formData, location: event.target.value })} className="w-full bg-transparent text-sm outline-none" /></div></label>
                  <label className="block"><span className="mb-1 block text-[13px] font-medium text-[#0D0D0D]">Website</span><div className="flex items-center rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5"><Link2 className="mr-2 h-4 w-4 text-[#9B9B9B]" /><input value={formData.website} onChange={(event) => setFormData({ ...formData, website: event.target.value })} className="w-full bg-transparent text-sm outline-none" /></div></label>
                  <label className="block"><span className="mb-1 block text-[13px] font-medium text-[#0D0D0D]">College</span><div className="flex items-center rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5"><GraduationCap className="mr-2 h-4 w-4 text-[#9B9B9B]" /><select value={formData.college} onChange={(event) => setFormData({ ...formData, college: event.target.value })} className="w-full bg-transparent text-sm outline-none"><option value={ONLY_COLLEGE}>{ONLY_COLLEGE}</option></select></div></label>
                </section>

                <section className="space-y-4 border-t border-[#E8E8E8] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium text-[#0D0D0D]">Social Links</p>
                      <p className="mt-1 text-[12px] text-[#9B9B9B]">Add up to {MAX_PROFILE_SOCIAL_LINKS} profile links.</p>
                    </div>
                    {socialLinks.length < MAX_PROFILE_SOCIAL_LINKS ? (
                      <button
                        type="button"
                        onClick={() => setSocialLinks((current) => [...current, { platform: 'instagram', url: '' }])}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-[#E8E8E8] px-3 py-1.5 text-xs font-medium text-[#0D0D0D]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add link
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {socialLinks.length ? socialLinks.map((item, index) => (
                      <div key={`${item.platform}-${index}`} className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_auto]">
                        <select
                          value={item.platform}
                          onChange={(event) => setSocialLinks((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, platform: event.target.value } : entry))}
                          className="rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm outline-none"
                        >
                          {SOCIAL_PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <input
                          value={item.url}
                          onChange={(event) => setSocialLinks((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, url: event.target.value } : entry))}
                          placeholder="Paste a full link or handle"
                          className="rounded-[8px] border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setSocialLinks((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                          className="inline-flex items-center justify-center rounded-[8px] border border-[#F1CACA] px-3 text-[#DC2626]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )) : (
                      <p className="text-sm text-[#9B9B9B]">No extra links added yet.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E8E8E8] px-5 py-4">
              <button onClick={() => !isSaving && setIsEditModalOpen(false)} className="rounded-[6px] border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#0D0D0D]">Cancel</button>
              <button onClick={handleSaveProfile} disabled={isSaving} className="rounded-[6px] bg-[#0D0D0D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#111111] disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Changes'}</button>
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
  );
};