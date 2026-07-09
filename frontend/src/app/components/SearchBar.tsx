import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Search, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { searchStudents, searchPosts, searchListings } from '../../api/search';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';
import { FollowButton } from './FollowButton';

const RECENT_KEY = 'campus_blink_recent_searches';
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const prev = getRecentSearches().filter((q) => q !== trimmed);
  localStorage.setItem(RECENT_KEY, JSON.stringify([trimmed, ...prev].slice(0, MAX_RECENT)));
}

function removeRecentSearch(query: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecentSearches().filter((q) => q !== query)));
}

interface SearchResults {
  students: any[];
  posts: any[];
  listings: any[];
}

export interface SearchSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchSlidePanel: React.FC<SearchSlidePanelProps> = ({ isOpen, onClose }) => {
  const profile = useAuthStore((state) => state.profile);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({ students: [], posts: [], listings: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setResults({ students: [], posts: [], listings: [] });
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const runSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setResults({ students: [], posts: [], listings: [] });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [studentsRes, postsRes, listingsRes] = await Promise.all([
        searchStudents(term, { limit: 8, currentUserId: profile?.id || null }),
        searchPosts(term, { limit: 5 }),
        searchListings(term, { limit: 5 }),
      ]);
      setResults({
        students: studentsRes.data || [],
        posts: postsRes.data || [],
        listings: listingsRes.data || [],
      });
      setIsLoading(false);
    },
    [profile?.id]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const handleClearQuery = () => {
    setQuery('');
    setResults({ students: [], posts: [], listings: [] });
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    addRecentSearch(term);
    go(`/student/search?q=${encodeURIComponent(term)}`);
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    runSearch(term);
  };

  const handleClearAll = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecentSearches([]);
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeRecentSearch(term);
    setRecentSearches(getRecentSearches());
  };

  const hasStudents = results.students.length > 0;
  const hasPosts = results.posts.length > 0;
  const hasListings = results.listings.length > 0;
  const hasAny = hasStudents || hasPosts || hasListings;
  const showEmpty = !!query.trim() && !isLoading && !hasAny;
  const showRecent = !query.trim() && recentSearches.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[75] bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className={`fixed left-0 top-0 h-full z-[76] flex flex-col bg-[var(--bg-primary)] border-r border-black/[0.08] shadow-[6px_0_40px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-in-out w-full md:w-[390px] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-[70px] shrink-0 items-center justify-between px-6 border-b border-black/[0.06] bg-[var(--bg)]">
          <h2 className="font-syne font-extrabold text-[22px] text-[var(--text-primary)] tracking-tight">Search</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-black/[0.06] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search students, posts, listings..."
              className="h-[44px] w-full rounded-[10px] border border-black/[0.08] bg-[var(--bg-2)] pl-10 pr-10 text-[14px] font-sans text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg)] transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#C8C6BE] text-white hover:bg-[var(--text-muted)] transition-colors"
                aria-label="Clear search"
              >
                <X size={11} />
              </button>
            )}
          </form>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Recent Searches */}
          {showRecent && (
            <div>
              <div className="flex items-center justify-between px-5 pt-2 pb-1">
                <p className="font-sans font-semibold text-[12px] uppercase tracking-[0.7px] text-[#ACACAC]">Recent</p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="font-sans text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((term) => (
                <div
                  key={term}
                  className="group flex items-center gap-3 px-5 py-[11px] cursor-pointer hover:bg-black/[0.035] transition-colors"
                  onClick={() => handleRecentClick(term)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDECEA]">
                    <Clock size={16} className="text-[var(--text-secondary)]" />
                  </div>
                  <span className="flex-1 font-sans text-[14px] font-medium text-[var(--text-primary)] truncate">{term}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveRecent(e, term)}
                    className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-black/[0.06] hover:text-[var(--text-primary)] transition-all"
                    aria-label={`Remove ${term} from recent`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state - no query, no recent */}
          {!query.trim() && !showRecent && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EDECEA]">
                <Search size={26} className="text-[#C0BDB7]" />
              </div>
              <p className="font-sans text-[14px] text-[var(--text-muted)]">Search for students, posts or listings</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--yellow)]" />
            </div>
          )}

          {/* No results */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 px-8 text-center">
              <Search className="h-8 w-8 text-[#DDDCDA]" />
              <p className="font-sans text-[14px] text-[var(--text-muted)]">No results for &apos;{query}&apos;</p>
            </div>
          )}

          {/* Results */}
          {!isLoading && hasAny && (
            <>
              {/* Students / People */}
              {hasStudents && (
                <div>
                  <p className="px-5 pt-4 pb-1 font-sans font-semibold text-[11px] uppercase tracking-[0.7px] text-[#ACACAC]">
                    People
                  </p>
                  {results.students.map((student) => {
                    const avatar = student.avatar_url || getAvatarDataUrl({ name: student.name, seed: student.id });
                    return (
                      <div
                        key={student.id}
                        className="flex cursor-pointer items-center gap-3 px-5 py-[11px] hover:bg-black/[0.035] transition-colors"
                        onClick={() => {
                          if (query.trim()) addRecentSearch(query.trim());
                          go(`/student/profile/${student.id}`);
                        }}
                      >
                        <img
                          src={avatar}
                          alt={student.name}
                          className="h-10 w-10 shrink-0 rounded-full object-cover border border-black/[0.06]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-sans font-semibold text-[14px] text-[var(--text-primary)] leading-tight">
                            {student.name}
                          </p>
                          <p className="truncate font-sans text-[12px] text-[var(--text-muted)] leading-tight">
                            @{getDisplayHandle(student.username, 'student')}
                            {student.college && (
                              <span className="ml-1.5">
                                · {student.college.includes('(MAIT)') ? 'MAIT' : student.college.split(' ').slice(-1)[0].replace(/[()]/g, '')}
                              </span>
                            )}
                          </p>
                        </div>
                        <FollowButton
                          targetUserId={student.id}
                          initialFollowing={Boolean(student.is_following)}
                          size="sm"
                          className="ml-1 shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Posts */}
              {hasPosts && (
                <div className={hasStudents ? 'border-t border-black/[0.05] mt-1' : ''}>
                  <p className="px-5 pt-4 pb-1 font-sans font-semibold text-[11px] uppercase tracking-[0.7px] text-[#ACACAC]">
                    Posts
                  </p>
                  {results.posts.map((post) => {
                    const avatar = post.author?.avatar_url || getAvatarDataUrl({ name: post.author?.name, seed: post.author?.id });
                    return (
                      <div
                        key={post.id}
                        className="flex cursor-pointer items-center gap-3 px-5 py-[10px] hover:bg-black/[0.035] transition-colors"
                        onClick={() => {
                          if (query.trim()) addRecentSearch(query.trim());
                          go(`/community/${post.id}`);
                        }}
                      >
                        <img
                          src={avatar}
                          alt={post.author?.name}
                          className="h-9 w-9 shrink-0 rounded-full object-cover border border-black/[0.06]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-sans font-semibold text-[13px] text-[var(--text-primary)] truncate leading-tight">
                            {post.author?.name || 'Campus Student'}
                          </p>
                          <p className="font-sans text-[12px] text-[var(--text-secondary)] line-clamp-2 leading-snug">
                            {post.title || post.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Listings */}
              {hasListings && (
                <div className={(hasStudents || hasPosts) ? 'border-t border-black/[0.05] mt-1' : ''}>
                  <p className="px-5 pt-4 pb-1 font-sans font-semibold text-[11px] uppercase tracking-[0.7px] text-[#ACACAC]">
                    Listings
                  </p>
                  {results.listings.map((listing) => {
                    const thumbnail = Array.isArray(listing.images) && listing.images.length ? listing.images[0] : null;
                    return (
                      <div
                        key={listing.id}
                        className="flex cursor-pointer items-center gap-3 px-5 py-[10px] hover:bg-black/[0.035] transition-colors"
                        onClick={() => {
                          if (query.trim()) addRecentSearch(query.trim());
                          go(`/student/buy-sell/${listing.id}`);
                        }}
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[6px] border border-black/[0.06] bg-[#EDECEA]">
                          {thumbnail ? (
                            <img loading="lazy" src={thumbnail} alt={listing.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#C0BDB7] text-[10px]">No img</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-sans font-semibold text-[13px] text-[var(--text-primary)] leading-tight">
                            {listing.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-syne font-semibold text-[13px] text-[var(--text-primary)]">
                              ₹{Number(listing.price).toLocaleString()}
                            </span>
                            {listing.category && (
                              <span className="rounded-md bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--text-secondary)]">
                                {listing.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View all */}
              <div className="border-t border-black/[0.05] px-5 py-3 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (query.trim()) {
                      addRecentSearch(query.trim());
                      go(`/student/search?q=${encodeURIComponent(query.trim())}`);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-[8px] py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)] transition-colors"
                >
                  View all results for &quot;{query}&quot;
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// Backward-compatible alias
export const SearchBar = SearchSlidePanel;
