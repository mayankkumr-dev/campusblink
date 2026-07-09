import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Virtuoso } from "react-virtuoso";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import {
  createPost,
  deletePost,
  getSocietyPosts,
  getSocieties,
  reportContent,
  togglePostLike,
} from "../../api/community";
import { getFollowingIds, getFollowingPosts } from "../../api/follow";
import { useCommunityFeed } from "../../hooks/useRealtime";
import { useFeatureAccess } from "../../hooks/useFeatureAccess";
import { AccessDenied } from "./AccessDenied";
import { getAvatarDataUrl } from "../../lib/avatar";
import { getDisplayHandle } from "../../lib/user";
import { getOptimizedImageUrl } from "../../lib/imageOpt";
import { AdaptivePostImage } from "./AdaptivePostImage";
import { FollowButton } from "./FollowButton";
import { ListSkeleton } from "./ui/Skeletons";

const ONLY_COLLEGE = "Maharaja Agrasen Institute of Technology (MAIT)";
const POST_IMAGE_DELIMITER = "|||";
const COMMUNITY_IMAGE_MIN_WIDTH = 600;
const COMMUNITY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const COMMUNITY_GIF_MAX_BYTES = 15 * 1024 * 1024;
const COMMUNITY_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))}d`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseImageUrls(post: any): string[] {
  if (Array.isArray(post?.image_urls) && post.image_urls.length > 0) {
    return post.image_urls.filter(Boolean);
  }

  const value = post?.image_url;
  if (!value || typeof value !== "string") return [];

  if (value.includes(POST_IMAGE_DELIMITER)) {
    return value
      .split(POST_IMAGE_DELIMITER)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [value];
}

function PostImageGrid({
  images,
  onOpen,
}: {
  images: string[];
  onOpen: (index: number) => void;
}) {
  if (!images.length) return null;

  if (images.length === 1) {
    return (
      <div className="mt-4 overflow-hidden rounded-[14px] border border-black/10 bg-[var(--bg-secondary)]">
        <AdaptivePostImage
          src={getOptimizedImageUrl(images[0], 800, 600) || images[0]}
          alt="Post attachment"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(0);
          }}
          className="w-full max-h-[620px] bg-[var(--bg-secondary)]"
          imgClassName="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-[14px] border border-black/10 bg-[var(--bg-secondary)]">
      {images.slice(0, 4).map((image, index) => (
        <AdaptivePostImage
          key={`${image}-${index}`}
          src={getOptimizedImageUrl(image, 600, 400) || image}
          alt={`Post attachment ${index + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(index);
          }}
          className="bg-[var(--bg-tertiary)]"
          imgClassName="h-full w-full object-contain"
        >
          {images.length > 4 && index === 3 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-extrabold text-[var(--text-primary)]">
              +{images.length - 4}
            </div>
          )}
        </AdaptivePostImage>
      ))}
    </div>
  );
}

function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-md bg-[var(--bg)]/10 p-2 text-[var(--text-primary)] hover:bg-[var(--bg)]/20"
      >
        <X className="h-6 w-6" />
      </button>
      {images.length > 1 ? (
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((safeIndex - 1 + images.length) % images.length);
            }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-[var(--text-primary)] hover:bg-[var(--bg)]/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((safeIndex + 1) % images.length);
            }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-[var(--text-primary)] hover:bg-[var(--bg)]/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}
      <img
        onClick={(event) => event.stopPropagation()}
        src={images[safeIndex]}
        alt="Expanded attachment"
        className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
      />
    </div>
  );
}

const FeedPost = React.memo(function FeedPost({
  post,
  profile,
  onLike,
  onDelete,
  onReportPost,
  onReportAccount,
  onOpenImage,
  followingIds,
  onFollowChange,
}: {
  post: any;
  profile: any;
  onLike: (postId: string, likedByMe: boolean) => void;
  onDelete: (post: any) => void;
  onReportPost: (post: any) => void;
  onReportAccount: (post: any) => void;
  onOpenImage: (images: string[], index: number) => void;
  followingIds: Set<string>;
  onFollowChange: (userId: string, nextFollowing: boolean) => void;
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const likedByMe = Boolean(profile?.id && post.liked_by?.includes(profile.id));
  const isAnonymous = post.is_anonymous;
  const avatar = isAnonymous
    ? null
    : post.author?.avatar_url ||
      getAvatarDataUrl({
        name: post.author?.name,
        seed: post.author?.id || post.author_id || post.id,
      });
  const handle = isAnonymous
    ? "anonymous"
    : getDisplayHandle(post.author?.username, "student");
  const images = parseImageUrls(post);
  const postLink = `${window.location.origin}/community/${post.id}`;
  const isAdmin = profile?.role === "admin";
  const isOwnPost = Boolean(profile?.id && post.author_id === profile.id);
  const canReportPost = Boolean(profile?.id && !isOwnPost);
  const canReportAccount = Boolean(
    profile?.id && !isOwnPost && !isAnonymous && post.author_id,
  );
  const authorId = post.author?.id || post.author_id || null;
  const canFollow = Boolean(!isAnonymous && !isOwnPost && authorId);
  const isFollowingAuthor = Boolean(
    canFollow && authorId && followingIds.has(authorId),
  );

  useEffect(() => {
    if (!showMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showMenu]);

  const handleAuthorClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isAnonymous || !authorId) return;
    if (authorId === profile?.id) navigate("/student/profile");
    else navigate(`/student/profile/${authorId}`);
  };

  const copyLink = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(postLink);
      toast.success("Link copied! 📋");
    } catch {
      toast.error("Could not copy link.");
    }
    setShowMenu(false);
  };

  const handleShare = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || "Campus Blink Post",
          text: `${(post.content || "").slice(0, 100)}${(post.content || "").length > 100 ? "..." : ""}`,
          url: postLink,
        });
        return;
      } catch {}
    }
    await copyLink();
  };

  return (
    <article
      onClick={() => navigate(`/community/${post.id}`)}
      className="cursor-pointer rounded-[16px] border border-black/10 bg-[var(--bg)] p-4 shadow-[0_6px_20px_rgba(13,13,13,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(13,13,13,0.08)] md:p-5"
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAuthorClick}
          disabled={isAnonymous}
          className="mt-1 h-11 w-11 shrink-0 overflow-hidden rounded-full border border-black/10 bg-[var(--bg-secondary)] transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
        >
          {avatar ? (
            <img
              loading="lazy"
              src={getOptimizedImageUrl(avatar, 80, 80) || avatar}
              alt={post.author?.name || "avatar"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-[var(--text-primary)]">
              ?
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <button
                  type="button"
                  onClick={handleAuthorClick}
                  disabled={isAnonymous}
                  className="truncate font-bold text-[var(--text-primary)] transition-colors hover:underline disabled:cursor-default disabled:hover:no-underline"
                >
                  {isAnonymous
                    ? "Anonymous Student"
                    : post.author?.name || "Campus Student"}
                </button>
                <button
                  type="button"
                  onClick={handleAuthorClick}
                  disabled={isAnonymous}
                  className="text-[var(--text-secondary)] transition-colors hover:underline disabled:cursor-default disabled:hover:no-underline"
                >
                  @{handle}
                </button>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[#8A8A8A]">
                  {formatRelativeTime(post.created_at)}
                </span>
                {post.author?.college && !isAnonymous && (
                  <span className="rounded-md bg-[var(--yellow)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-primary)]">
                    {post.author.college.includes("(MAIT)")
                      ? "MAIT"
                      : post.author.college}
                  </span>
                )}
                {post.is_pinned && (
                  <span className="rounded-md bg-[var(--yellow)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-primary)]">
                    Pinned
                  </span>
                )}
              </div>
              {post.title && (
                <h3 className="mt-2 text-lg font-bold leading-tight text-[var(--text-primary)]">
                  {post.title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-1">
              {canFollow && (
                <FollowButton
                  targetUserId={authorId}
                  initialFollowing={isFollowingAuthor}
                  size="sm"
                  variant="inline"
                  className="hidden sm:inline-flex h-6 px-2 text-[11px]"
                  onChange={(nextFollowing) => {
                    if (authorId) onFollowChange(authorId, nextFollowing);
                  }}
                />
              )}

              <div className="relative" ref={menuRef}>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowMenu((value) => !value);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-10 z-20 min-w-[140px] overflow-hidden rounded-lg border border-black/10 bg-[var(--bg)] shadow-md">
                    <button
                      onClick={copyLink}
                      className="w-full px-4 py-2 text-left text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                    >
                      Copy Link
                    </button>
                    {canReportPost && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onReportPost(post);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[var(--yellow-dark)] hover:bg-[#FEF9C3]"
                      >
                        Report Post
                      </button>
                    )}
                    {canReportAccount && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onReportAccount(post);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[var(--yellow-dark)] hover:bg-[#FEF9C3]"
                      >
                        Report Account
                      </button>
                    )}
                    {isOwnPost && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(post);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[#DC2626] hover:bg-[#FEE2E2]"
                      >
                        Delete Post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="community-post-content mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[var(--text-primary)]">
            {post.content}
          </p>
          <PostImageGrid
            images={images}
            onOpen={(index) => onOpenImage(images, index)}
          />

          <div className="mt-4 flex max-w-xl items-center justify-between border-t border-black/10 pt-3 text-[var(--text-secondary)]">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onLike(post.id, likedByMe);
              }}
              className={`group flex items-center gap-2 text-sm transition-colors ${likedByMe ? "text-[var(--error)]" : "hover:text-[var(--error)]"}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${likedByMe ? "bg-[var(--error)]/10" : "group-hover:bg-[var(--error)]/10"}`}
              >
                <Heart
                  className={`h-4 w-4 ${likedByMe ? "fill-current" : ""}`}
                />
              </span>
              <span>{post.likes_count || 0}</span>
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/community/${post.id}`);
              }}
              className="group flex items-center gap-2 text-sm transition-colors hover:text-[var(--text-primary)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md transition-colors group-hover:bg-[var(--yellow)]/15">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span>{post.comments_count || 0}</span>
            </button>

            <button
              onClick={handleShare}
              className="group flex items-center gap-2 text-sm transition-colors hover:text-[var(--text-primary)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md transition-colors group-hover:bg-[var(--yellow)]/15">
                <Share2 className="h-4 w-4" />
              </span>
            </button>
          </div>

          {isAdmin && isAnonymous && (
            <div className="mt-2 flex justify-end">
              <span
                onClick={(e) => e.stopPropagation()}
                className="rounded bg-black/6 px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] select-all"
                title="Post ID (admin only)"
              >
                ID: {post.id.substring(0, 8)}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

export const SocietiesFeedPage: React.FC = () => {
  const [societiesList, setSocietiesList] = useState<any[]>([]);
  useEffect(() => {
    getSocieties().then(({ data }) => setSocietiesList(data || []));
  }, []);

  const profile = useAuthStore((state) => state.profile);
  const { hasAccess: hasCommunityAccess, isChecking: checkingCommunityAccess } =
    useFeatureAccess("community_access");
  const { isAllowed } = useFeatureAccess(profile);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [reportModal, setReportModal] = useState<{
    targetType: "post" | "profile";
    targetId: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [noFollows, setNoFollows] = useState(false);
  const composeParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const initialComposeType = composeParams.get("type") || "discussion";

  const tabs = [
    { label: "All", value: "all" },
    { label: "Following", value: "following" },
    { label: "Notices", value: "notice" },
    { label: "Internships", value: "internship" },
    { label: "Discussions", value: "discussion" },
    { label: "Memes", value: "meme" },
    { label: "Confessions", value: "confession" },
  ];

  // Load which users we follow
  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    getFollowingIds(profile.id).then(({ data }) => {
      if (mounted) setFollowingIds(new Set(data || []));
    });
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    if (params.get("compose") === "1") {
      setComposerExpanded(true);
    }
  }, []);

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      if (activeTab === "Following") {
        if (!profile?.id) {
          setAllPosts([]);
          setNoFollows(false);
          setIsLoading(false);
          return;
        }
        const {
          data,
          error,
          noFollows: noF,
        } = await getFollowingPosts(profile.id);
        if (error)
          toast.error(
            (error as any)?.message || "Failed to load following posts",
          );
        else {
          setAllPosts(data || []);
          setNoFollows(Boolean(noF));
        }
      } else {
        const typeValue =
          tabs.find((tab) => tab.label === activeTab)?.value || "all";
        const { data, error } = await getSocietyPosts(typeValue);
        if (error) toast.error(error.message || "Failed to load posts");
        else {
          setAllPosts(data || []);
          setNoFollows(false);
        }
      }
      setIsLoading(false);
    };

    loadPosts();
  }, [activeTab, profile?.id]);

  useEffect(() => {
    if (collegeFilter === "all") {
      setPosts(allPosts);
      return;
    }

    setPosts(
      allPosts.filter(
        (post) =>
          (post.author?.college || "").toLowerCase() ===
          collegeFilter.toLowerCase(),
      ),
    );
  }, [allPosts, collegeFilter]);

  useCommunityFeed((newPost: any) => {
    if (activeTab === "Following") {
      if (!followingIds.has(newPost.author_id)) return;
    } else {
      const typeValue =
        tabs.find((tab) => tab.label === activeTab)?.value || "all";
      if (typeValue !== "all" && newPost.type !== typeValue) return;
    }

    const hydratedPost = {
      ...newPost,
      likes_count: newPost.likes_count ?? 0,
      liked_by: [],
      image_urls: parseImageUrls(newPost),
      author: newPost.author || {
        name: "Campus Student",
        username: null,
        avatar_url: null,
        college: newPost.college || ONLY_COLLEGE,
      },
    };

    setAllPosts((prev) => [hydratedPost, ...prev]);
  });

  const collegeOptions = Array.from(
    new Set(
      allPosts
        .map((post) => post.author?.college)
        .filter((value): value is string => Boolean(value && value.trim())),
    ),
  );

  const handleLike = async (postId: string, likedByMe: boolean) => {
    if (!profile?.id) {
      toast.error("Please log in to like posts.");
      return;
    }

    const applyMutation = (items: any[], reverse = false) =>
      items.map((item) => {
        if (item.id !== postId) return item;

        const likedBy = new Set(item.liked_by || []);
        const shouldUnlike = reverse ? !likedByMe : likedByMe;

        if (shouldUnlike) likedBy.delete(profile.id);
        else likedBy.add(profile.id);

        return {
          ...item,
          liked_by: Array.from(likedBy),
          likes_count: Math.max(
            0,
            (item.likes_count || 0) + (shouldUnlike ? -1 : 1),
          ),
        };
      });

    setAllPosts((prev) => applyMutation(prev));
    setPosts((prev) => applyMutation(prev));

    const { error } = await togglePostLike(postId, profile.id);
    if (error) {
      toast.error(error.message || "Could not update like.");
      setAllPosts((prev) => applyMutation(prev, true));
      setPosts((prev) => applyMutation(prev, true));
    }
  };

  const handleDeletePost = async (post: any) => {
    if (!profile?.id || post.author_id !== profile.id) {
      toast.error("You can only delete your own post.");
      return;
    }

    if (!confirm("Delete this post?")) {
      return;
    }

    const loadingToast = toast.loading("Deleting post...");
    const { error } = await deletePost(post.id);

    if (error) {
      toast.error((error as any)?.message || "Failed to delete post.", {
        id: loadingToast,
      });
      return;
    }

    toast.success("Post deleted.", { id: loadingToast });
    setAllPosts((prev) => prev.filter((item) => item.id !== post.id));
    setPosts((prev) => prev.filter((item) => item.id !== post.id));
  };

  const handleReportPost = (post: any) => {
    if (!profile?.id) {
      toast.error("Please log in to report posts.");
      return;
    }

    setReportReason("");
    setReportDetails("");
    setReportModal({ targetType: "post", targetId: post.id });
  };

  const handleReportAccount = (post: any) => {
    if (!profile?.id) {
      toast.error("Please log in to report accounts.");
      return;
    }
    if (!post?.author_id) {
      toast.error("This account cannot be reported.");
      return;
    }

    setReportReason("");
    setReportDetails("");
    setReportModal({ targetType: "profile", targetId: post.author_id });
  };

  const submitReport = async () => {
    if (!profile?.id || !reportModal?.targetId) return;

    const reason = reportReason.trim();
    if (!reason) {
      toast.error("Reason is required to submit a report.");
      return;
    }

    setIsSubmittingReport(true);
    const loadingToast = toast.loading("Submitting report...");
    const { error } = await reportContent(
      reportModal.targetType,
      reportModal.targetId,
      profile.id,
      reason,
      reportDetails.trim() || null,
    );

    if (error) {
      toast.error((error as any)?.message || "Could not submit report.", {
        id: loadingToast,
      });
      setIsSubmittingReport(false);
      return;
    }

    toast.success(
      `${reportModal.targetType === "post" ? "Post" : "Account"} reported. Admin will review it.`,
      { id: loadingToast },
    );
    setIsSubmittingReport(false);
    setReportModal(null);
  };

  const handleFollowChange = (userId: string, nextFollowing: boolean) => {
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (nextFollowing) next.add(userId);
      else next.delete(userId);
      return next;
    });
    if (!nextFollowing && activeTab === "Following") {
      setAllPosts((prev) => prev.filter((p) => p.author_id !== userId));
    }
  };

  if (checkingCommunityAccess) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListSkeleton key={`societies-access-skeleton-${index}`} rows={1} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasCommunityAccess) {
    return <AccessDenied feature="Community" />;
  }

  return (
    <div className="min-h-full bg-[var(--bg-primary)] pb-28">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 md:px-6 md:py-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[16px] border border-black/10 bg-[var(--bg)] shadow-[0_6px_20px_rgba(13,13,13,0.04)]">
            <div className="border-b border-black/10 px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${activeTab === tab.label ? "bg-[var(--yellow)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-3 md:p-4">
              {/* Societies Scroll */}
              {societiesList.length > 0 && (
                <div className="mb-4 rounded-[14px] border border-black/10 bg-[var(--bg)] p-4">
                  <h2 className="mb-3 text-[15px] font-extrabold text-[var(--text-primary)]">
                    Campus Societies
                  </h2>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 scroll-smooth">
                    {societiesList.map((society) => (
                      <div
                        key={society.id}
                        className="flex flex-col items-center gap-2 min-w-[76px] cursor-pointer group"
                        onClick={() => {
                          window.location.href = `/student/profile/${society.id}`;
                        }}
                      >
                        <div 
                          className="w-[68px] h-[68px] rounded-full border-2 p-0.5 flex items-center justify-center overflow-hidden bg-[#F5F5F7] group-hover:scale-105 transition-transform duration-200"
                          style={{ borderColor: society.theme_color || 'var(--yellow)' }}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg)]">
                            {society.avatar_url ? (
                              <img
                                src={society.avatar_url}
                                alt={society.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div 
                                className="text-xl font-bold flex items-center justify-center w-full h-full text-[var(--text-primary)]"
                                style={{ backgroundColor: society.theme_color || 'var(--text-primary)' }}
                              >
                                {society.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-center leading-tight line-clamp-2 text-[var(--text-primary)]">
                          {society.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile?.role === "society" && (
                <InlinePostComposer
                  profile={profile}
                  canPost={isAllowed("community_posting")}
                  initialType={initialComposeType}
                  expanded={composerExpanded}
                  onExpandedChange={setComposerExpanded}
                  onCreated={(post) => {
                    const hydratedPost = {
                      ...post,
                      likes_count: post.likes_count ?? 0,
                      liked_by: [],
                      image_urls: parseImageUrls(post),
                      author: {
                        id: profile?.id,
                        name: profile?.name || "Campus Student",
                        username: profile?.username || null,
                        avatar_url: profile?.avatar_url || null,
                        college: profile?.college || ONLY_COLLEGE,
                      },
                    };
                    setAllPosts((prev) => [hydratedPost, ...prev]);
                  }}
                />
              )}

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <ListSkeleton key={`societies-feed-skeleton-${index}`} rows={1} />
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <Virtuoso
                  useWindowScroll
                  data={posts}
                  itemContent={(index, post) => (
                    <div className="mb-3">
                      <FeedPost
                        key={post.id}
                        post={post}
                        profile={profile}
                        onLike={handleLike}
                        onDelete={handleDeletePost}
                        onReportPost={handleReportPost}
                        onReportAccount={handleReportAccount}
                        onOpenImage={(images, idx) =>
                          setLightbox({ images, index: idx })
                        }
                        followingIds={followingIds}
                        onFollowChange={handleFollowChange}
                      />
                    </div>
                  )}
                />
              ) : activeTab === "Following" && noFollows ? (
                <div className="px-6 py-16 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-[var(--border)]" />
                  <h2 className="font-syne text-xl font-extrabold text-[var(--text-primary)]">
                    Follow students to see their posts
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Search for students and follow them to build your feed.
                  </p>
                  <button
                    onClick={() => navigate("/search")}
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--yellow)] text-[var(--text-primary)] hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]"
                  >
                    <Search className="h-4 w-4" /> Search for students
                  </button>
                </div>
              ) : (
                <div className="px-6 py-20 text-center">
                  <h2 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">
                    Nothing here yet
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {activeTab === "Following"
                      ? "The people you follow haven't posted recently."
                      : "Be the first person to publish in this lane."}
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[16px] border border-[#F4E7A6] bg-[linear-gradient(135deg,var(--yellow-light)_0%,var(--bg-primary)_78%)] p-4 shadow-[0_6px_20px_rgba(13,13,13,0.04)]">
              <h2 className="font-syne text-[34px] font-extrabold leading-[0.95] text-[var(--text-primary)]">
                Hello{" "}
                {profile?.name?.split(" ")[0] ||
                  profile?.full_name?.split(" ")[0] ||
                  "Student"}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Share what is happening in your campus community.
              </p>
              <button
                onClick={() => {
                  if (!profile) {
                    toast.error("Please log in to post.");
                    return;
                  }
                  if (!isAllowed("community_posting")) {
                    toast.error(
                      "Community posting is currently restricted for your account.",
                    );
                    return;
                  }
                  setComposerExpanded(true);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--yellow)] text-[var(--text-primary)] transition-colors hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]"
              >
                <Plus className="h-4 w-4" />
                Create post
              </button>
            </div>

            <div className="rounded-[16px] border border-[#EFE5BA] bg-[#FFFDF4] p-4 shadow-[0_6px_20px_rgba(13,13,13,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Filter by college
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setCollegeFilter("all")}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${collegeFilter === "all" ? "bg-[var(--yellow)] text-[var(--text-primary)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}`}
                >
                  All
                </button>
                {collegeOptions.map((college) => (
                  <button
                    key={college}
                    onClick={() => setCollegeFilter(college)}
                    className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${collegeFilter === college ? "bg-[var(--yellow)] text-[var(--text-primary)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}`}
                  >
                    {college.includes("(MAIT)") ? "MAIT" : college}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {lightbox ? (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) =>
            setLightbox((current) =>
              current ? { ...current, index } : current,
            )
          }
        />
      ) : null}

      {reportModal ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[18px] border border-black/10 bg-[var(--bg)] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-syne text-xl font-bold text-[var(--text-primary)]">
                Report {reportModal.targetType === "post" ? "post" : "account"}
              </h3>
              <button
                onClick={() => !isSubmittingReport && setReportModal(null)}
                className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm font-semibold text-[var(--text-primary)]">
              Reason
              <input
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="spam, abuse, harassment..."
                className="mt-1 w-full rounded-md border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm outline-none focus:border-[var(--yellow-dark)]"
              />
            </label>

            <label className="mt-3 block text-sm font-semibold text-[var(--text-primary)]">
              Details (optional)
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder="Tell admin what happened"
                className="mt-1 w-full resize-none rounded-md border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm outline-none focus:border-[var(--yellow-dark)]"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setReportModal(null)}
                className="rounded-md border border-black/10 px-3 py-2 text-sm font-bold text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={isSubmittingReport}
                className="rounded-md bg-[var(--yellow-dark)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] disabled:opacity-60"
              >
                {isSubmittingReport ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const InlinePostComposer = ({
  profile,
  canPost,
  initialType = "discussion",
  expanded,
  onExpandedChange,
  onCreated,
}: {
  profile: any;
  canPost: boolean;
  initialType?: string;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
  onCreated: (post: any) => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    content: "",
    type: initialType,
    isAnonymous: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        !rootRef.current?.contains(event.target as Node) &&
        !formData.content.trim()
      ) {
        onExpandedChange(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded, formData.content, onExpandedChange]);

  const getImageSize = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        reject(new Error("Could not read image dimensions."));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

  const handleSubmit = async () => {
    if (!profile?.id) return;
    if (!canPost) {
      toast.error(
        "Community posting is currently restricted for your account.",
      );
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Content is required.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Publishing post...");

    const payload = {
      author_id: profile.id,
      college: profile.college || ONLY_COLLEGE,
      title: "",
      content: formData.content,
      type: formData.type,
      is_anonymous: formData.isAnonymous,
    };

    const { data, error } = await createPost(
      payload,
      files.length ? files : undefined,
    );
    if (error)
      toast.error(error.message || "Failed to publish post.", { id: toastId });
    else if (data) {
      toast.success(
        formData.isAnonymous
          ? "Post published."
          : "2 Reputation added for posting ⭐",
        { id: toastId },
      );
      onCreated(data);
      setFormData({ content: "", type: formData.type, isAnonymous: false });
      setFiles([]);
      onExpandedChange(false);
    }
    setIsSubmitting(false);
  };

  const appendFiles = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;

    const capacity = Math.max(0, 4 - files.length);
    if (capacity === 0) {
      toast("Only 4 images are allowed per post.", { icon: "ℹ️" });
      return;
    }

    const accepted: File[] = [];
    for (const file of Array.from(incoming)) {
      if (accepted.length >= capacity) break;

      if (!COMMUNITY_ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG, and GIF are allowed.`);
        continue;
      }

      const sizeLimit =
        file.type === "image/gif"
          ? COMMUNITY_GIF_MAX_BYTES
          : COMMUNITY_IMAGE_MAX_BYTES;
      if (file.size > sizeLimit) {
        toast.error(`${file.name}: file is too large.`);
        continue;
      }

      try {
        const dimensions = await getImageSize(file);
        if (dimensions.width < COMMUNITY_IMAGE_MIN_WIDTH) {
          toast.error(
            `${file.name}: minimum width is ${COMMUNITY_IMAGE_MIN_WIDTH}px.`,
          );
          continue;
        }
      } catch {
        toast.error(`${file.name}: invalid image file.`);
        continue;
      }

      accepted.push(file);
    }

    const next = [...files, ...accepted].slice(0, 4);
    if (files.length + incoming.length > 4) {
      toast("Only 4 images are allowed per post.", { icon: "ℹ️" });
    }
    setFiles(next);
  };

  return (
    <div
      ref={rootRef}
      className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-black/10 bg-[var(--bg)]">
          <img
            loading="lazy"
            src={
              getOptimizedImageUrl(profile?.avatar_url, 80, 80) ||
              profile?.avatar_url ||
              getAvatarDataUrl({
                name: profile?.name,
                seed: profile?.id || profile?.email,
              })
            }
            alt="avatar"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            value={formData.content}
            onFocus={() => onExpandedChange(true)}
            onChange={(event) => {
              setFormData({ ...formData, content: event.target.value });
              if (!expanded) onExpandedChange(true);
            }}
            placeholder="What's on your mind?"
            rows={expanded ? 4 : 1}
            className="w-full resize-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />

          {files.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative h-20 w-20 overflow-hidden rounded-[6px] border border-black/10 bg-[var(--bg-tertiary)]"
                >
                  <img
                    loading="lazy"
                    src={URL.createObjectURL(file)}
                    alt={`Attachment ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="absolute right-1 top-1 rounded-full bg-[var(--bg)]/95 p-0.5 text-[var(--text-primary)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {expanded ? (
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  "discussion",
                  "notice",
                  "meme",
                  "confession",
                  "internship",
                  "event",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: item })}
                    className={`rounded-[4px] px-2.5 py-1 text-xs font-medium capitalize ${formData.type === item ? "bg-[var(--yellow)] text-[var(--text-primary)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Image
                  </button>
                  <label className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={formData.isAnonymous}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          isAnonymous: !formData.isAnonymous,
                        })
                      }
                    />{" "}
                    Post anonymously
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)]">
                    {formData.content.length}/1000
                  </span>
                  <button
                    type="button"
                    disabled={isSubmitting || !formData.content.trim()}
                    onClick={() => void handleSubmit()}
                    className="rounded-md bg-[var(--yellow)] text-[var(--text-primary)] disabled:opacity-60 hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]"
                  >
                    {isSubmitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={(event) => {
          void appendFiles(event.target.files);
          event.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
};
