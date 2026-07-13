import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { getFollowers, getFollowing } from '../../api/follow';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';

interface FollowListModalProps {
  userId?: string | null;
  openList: 'followers' | 'following' | null;
  onClose: () => void;
  currentUserId?: string | null;
  totalFollowers?: number;
  totalFollowing?: number;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  userId,
  openList,
  onClose,
  currentUserId,
  totalFollowers = 0,
  totalFollowing = 0,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId || !openList) return;

    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const action = openList === 'followers' ? getFollowers : getFollowing;
      const { data } = await action(userId, query);
      if (!mounted) return;
      setRows(data || []);
      setIsLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [openList, query, userId]);

  const total = useMemo(() => {
    if (openList === 'followers') return totalFollowers;
    if (openList === 'following') return totalFollowing;
    return 0;
  }, [openList, totalFollowers, totalFollowing]);

  if (!openList) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[440px] rounded-[16px] bg-[var(--bg)] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-syne text-[18px] font-semibold capitalize text-[var(--text-primary)]">{openList}</h3>
            <span className="rounded-[4px] bg-[var(--bg-secondary)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]">{total}</span>
          </div>
          <button onClick={onClose} className="rounded-[6px] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${openList}`}
            className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-primary)] py-2 pl-9 pr-3 text-sm outline-none focus:border-black/20"
          />
        </div>

        <div className="mt-3 max-h-[340px] overflow-y-auto rounded-[8px] border border-[var(--border)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[var(--text-primary)]" /></div>
          ) : rows.length ? (
            rows.map((person) => (
              <button
                key={person.id}
                onClick={() => {
                  onClose();
                  navigate(person.id === currentUserId ? '/student/profile' : `/student/profile/${person.id}`);
                }}
                className="flex w-full items-center gap-3 border-b border-[#F2F2F2] px-3 py-2.5 text-left hover:bg-[var(--bg-primary)]"
              >
                <img
                  src={person.avatar_url || getAvatarDataUrl({ name: person.name, seed: person.id })}
                  alt={person.name || 'Student'}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">{person.name || 'Student'}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">@{getDisplayHandle(person.username, 'student')}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No {openList} found.</div>
          )}
        </div>
      </div>
    </div>
  );
};