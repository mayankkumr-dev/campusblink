import React, { useEffect, useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useFollowStore } from '../../store/followStore';

interface FollowButtonProps {
  targetUserId?: string | null;
  targetRole?: string | null;
  initialFollowing?: boolean;
  onChange?: (nextFollowing: boolean) => void;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'ghost' | 'inline' | 'soft';
  className?: string;
  isJoin?: boolean;
}

const SIZE_CLASSES = {
  sm: 'h-8 px-3.5 text-xs rounded-xl',
  md: 'h-9.5 px-4 text-xs rounded-xl',
};

const VARIANT_CLASSES = {
  primary: {
    idle: 'border border-border-subtle bg-slate-900 text-white hover:bg-amber-500 hover:border-amber-500 shadow-2xs',
    active: 'border border-border-subtle bg-surface-elevated text-text-secondary hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200',
  },
  ghost: {
    idle: 'border border-border-subtle bg-surface text-text-primary hover:bg-surface-elevated shadow-2xs',
    active: 'border border-border-subtle bg-surface-elevated text-text-secondary hover:bg-rose-50 hover:text-rose-600',
  },
  inline: {
    idle: 'border border-border-subtle bg-surface text-text-primary hover:bg-surface-elevated',
    active: 'border border-border-subtle bg-surface-elevated text-text-secondary hover:bg-slate-200',
  },
  soft: {
    idle: 'border border-slate-200/90 bg-surface-elevated hover:bg-amber-500 hover:text-white hover:border-amber-500 text-text-primary shadow-2xs font-bold',
    active: 'border border-emerald-200/80 bg-accent-green/15 text-accent-green hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold',
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
  isJoin = false,
}) => {
  const profile = useAuthStore((state) => state.profile);
  const { followingIds, toggleFollowOptimistic, isInitialized } = useFollowStore();
  const [localFollowing, setLocalFollowing] = useState(initialFollowing);

  const isFollowing = targetUserId 
    ? (isInitialized ? followingIds.has(targetUserId) : localFollowing) 
    : false;

  useEffect(() => {
    if (!isInitialized) {
      setLocalFollowing(initialFollowing);
    }
  }, [initialFollowing, isInitialized]);

  if (!targetUserId || !profile?.id || targetUserId === profile.id || targetRole === 'professor') {
    return null;
  }

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Optimistic fallback for when store isn't fully ready
    if (!isInitialized) {
      setLocalFollowing(!localFollowing);
    }
    
    onChange?.(!isFollowing);
    await toggleFollowOptimistic(profile.id, targetUserId);
  };

  const appearance = isFollowing ? VARIANT_CLASSES[variant].active : VARIANT_CLASSES[variant].idle;
  
  const activeText = isJoin ? 'Joined' : 'Following';
  const idleText = isJoin ? 'Join' : 'Follow';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors ${SIZE_CLASSES[size]} ${appearance} ${className}`}
    >
      {isFollowing ? (
        <>
          <Check className="h-3.5 w-3.5" />
          {activeText}
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          {idleText}
        </>
      )}
    </button>
  );
};