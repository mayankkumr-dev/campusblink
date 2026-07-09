import React, { useState } from 'react';
import { Check, Loader2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { toggleFollow } from '../../api/follow';

interface FollowButtonProps {
  targetUserId?: string | null;
  targetRole?: string | null;
  initialFollowing?: boolean;
  onChange?: (nextFollowing: boolean, counts?: { followers_count?: number; following_count?: number }) => void;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'ghost' | 'inline';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-10 px-4 text-[13px]',
};

const VARIANT_CLASSES = {
  primary: {
    idle: 'border border-[var(--text-primary)] bg-[var(--text-primary)] text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] hover:border-[var(--yellow)]',
    active: 'border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]',
  },
  ghost: {
    idle: 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
    active: 'border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]',
  },
  inline: {
    idle: 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
    active: 'border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]',
  },
};

export const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  targetRole,
  initialFollowing = false,
  onChange,
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  const profile = useAuthStore((state) => state.profile);
  const [isFollowing, setIsFollowing] = useState(Boolean(initialFollowing));
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    setIsFollowing(Boolean(initialFollowing));
  }, [initialFollowing]);

  if (!targetUserId || !profile?.id || targetUserId === profile.id || targetRole === 'professor') {
    return null;
  }

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isLoading) return;

    const previous = isFollowing;
    setIsFollowing(!previous);
    setIsLoading(true);

    const { data, error } = await toggleFollow(profile.id, targetUserId);

    if (error) {
      setIsFollowing(previous);
      toast.error((error as any).message || 'Could not update follow status.');
    } else {
      const nextFollowing = Boolean(data?.is_following);
      setIsFollowing(nextFollowing);
      onChange?.(nextFollowing, data as any);
      toast.success(nextFollowing ? 'Following updated.' : 'Unfollowed.');
    }

    setIsLoading(false);
  };

  const appearance = isFollowing ? VARIANT_CLASSES[variant].active : VARIANT_CLASSES[variant].idle;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${SIZE_CLASSES[size]} ${appearance} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isFollowing ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </button>
  );
};