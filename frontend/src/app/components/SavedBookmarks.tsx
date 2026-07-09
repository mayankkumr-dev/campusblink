import React, { useEffect, useState } from 'react';
import { getBookmarkedPosts } from '../../api/community';
import { useAuthStore } from '../../store/authStore';
import { PostCardSkeleton } from './BoneyardSkeletons';
// We would reuse the Twitter-cloned Post UI components here

export const SavedBookmarks = () => {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookmarks() {
      if (!user) return;
      setLoading(true);
      const { data } = await getBookmarkedPosts(user.id);
      setPosts(data || []);
      setLoading(false);
    }
    fetchBookmarks();
  }, [user]);

  return (
    <PostCardSkeleton loading={loading} name="saved-bookmarks-posts">
    <div className="w-full max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Saved Bookmarks</h1>
      {posts.length === 0 ? (
        <div className="text-center text-[var(--text-3)] py-10">No bookmarks yet.</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <div key={post.id} className="p-4 border rounded-xl bg-[var(--bg)] shadow-sm">
              <p className="font-semibold">{post.profiles?.name || 'Unknown'}</p>
              <p className="mt-2 text-[var(--text)]">{post.text_content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
    </PostCardSkeleton>
  );
};
