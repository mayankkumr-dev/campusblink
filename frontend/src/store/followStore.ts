import { create } from 'zustand';
import { toggleFollow, getFollowingIds } from '../api/follow';
import toast from 'react-hot-toast';

interface FollowState {
  followingIds: Set<string>;
  isInitialized: boolean;
  initialize: (userId: string) => Promise<void>;
  toggleFollowOptimistic: (followerId: string, followingId: string) => Promise<void>;
  setFollowingIds: (ids: Set<string>) => void;
}

export const useFollowStore = create<FollowState>((set, get) => ({
  followingIds: new Set(),
  isInitialized: false,

  initialize: async (userId: string) => {
    if (!userId) return;
    try {
      const { data } = await getFollowingIds(userId);
      set({ followingIds: new Set(data || []), isInitialized: true });
    } catch (err) {
      console.error('Failed to initialize follow store', err);
    }
  },

  setFollowingIds: (ids: Set<string>) => {
    set({ followingIds: ids });
  },

  toggleFollowOptimistic: async (followerId: string, followingId: string) => {
    if (!followerId || !followingId) return;

    const previousIds = new Set(get().followingIds);
    const isCurrentlyFollowing = previousIds.has(followingId);
    
    // 1. Optimistic Update
    const nextIds = new Set(previousIds);
    if (isCurrentlyFollowing) {
      nextIds.delete(followingId);
    } else {
      nextIds.add(followingId);
    }
    set({ followingIds: nextIds });

    // 2. Background Mutation
    try {
      const { error } = await toggleFollow(followerId, followingId);
      if (error) throw error;
    } catch (error) {
      // 3. Revert on failure
      set({ followingIds: previousIds });
      toast.error('Failed to update follow status. Please try again.');
    }
  },
}));
