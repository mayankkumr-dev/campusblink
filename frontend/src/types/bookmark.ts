/** Bookmark row from the `bookmarks` table */
export interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

/** Response shape from togglePostBookmark */
export interface BookmarkToggleResult {
  bookmarked: boolean;
}

/** Author profile embedded in a post */
export interface PostAuthor {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  college: string | null;
}

/** Normalized post shape used across the app (output of normalizePostRecord) */
export interface NormalizedPost {
  id: string;
  content: string;
  title: string | null;
  type: string;
  image_url: string | null;
  is_anonymous: boolean;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  bookmarks_count: number;
  views_count: number;
  is_pinned: boolean;
  created_at: string;
  author_id: string;
  author: PostAuthor | null;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  college: string | null;
  user_has_liked: boolean;
  user_has_bookmarked: boolean;
  user_has_reposted: boolean;
  liked_by?: string[];
}

/** Paginated response from getBookmarkedPosts */
export interface BookmarkedPostsResponse {
  data: NormalizedPost[];
  hasMore: boolean;
  error: Error | null;
}
