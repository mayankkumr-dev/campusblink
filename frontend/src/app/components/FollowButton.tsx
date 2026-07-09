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
  variant?: 'primary' | 'ghost' | 'inline' | 'soft';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 px-3.5 text-xs rounded-xl',
  md: 'h-9.5 px-4 text-xs rounded-xl',
};

const VARIANT_CLASSES = {
  primary: {
    idle: 'border border-slate-200 bg-slate-900 text-white hover:bg-amber-500 hover:border-amber-500 shadow-2xs',
    active: 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200',
  },
  ghost: {
    idle: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs',
    active: 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600',
  },
  inline: {
    idle: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    active: 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200',
  },
  soft: {
    idle: 'border border-slate-200/90 bg-slate-100 hover:bg-amber-500 hover:text-white hover:border-amber-500 text-slate-700 shadow-2xs font-bold',
    active: 'border border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold',
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