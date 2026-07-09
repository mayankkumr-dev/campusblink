import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Search, Clock, ArrowRight, User, FileText, Store } from 'lucide-react';
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
      {/* Blurred Glassmorphism Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-[75] bg-slate-900/15 backdrop-blur-sm transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sleek Light-Mode Slide-in Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Campus"
        className={`fixed left-0 top-0 h-full z-[76] flex flex-col bg-white border-r border-slate-100 shadow-[0_16px_50px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-in-out w-full md:w-[410px] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sticky Header */}
        <div className="flex h-18 shrink-0 items-center justify-between px-6 border-b border-slate-100 bg-white">
          <div>
            <h2 className="font-syne font-extrabold text-xl text-slate-900 tracking-tight">
              Search Campus
            </h2>
            <p className="text-[11px] font-medium text-slate-400">
              Find students, posts, and marketplace items
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/70 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-2xs"
            aria-label="Close search drawer"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Softly Rounded Search Input */}
        <div className="px-6 pt-4 pb-3 shrink-0 bg-white">
          <form onSubmit={handleSubmit} className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[1.75]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search people, posts, textbooks..."
              className="h-11 w-full rounded-2xl border border-slate-200/80 bg-slate-50 pl-10.5 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/80 text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            )}
          </form>
        </div>

        {/* Scrollable Search Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {/* Recent Searches Section */}
          {showRecent && (
            <div className="py-2">
              <div className="flex items-center justify-between px-6 pt-3 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-0.5">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="group flex items-center justify-between gap-3 px-6 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleRecentClick(term)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/60 text-slate-500">
                        <Clock className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">
                        {term}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveRecent(e, term)}
                      className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-all"
                      aria-label={`Remove ${term} from recent searches`}
                    >
                      <X className="w-3.5 h-3.5 stroke-[1.75]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State when No Query */}
          {!query.trim() && !showRecent && (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 mb-4 shadow-2xs">
                <Search className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="font-syne text-base font-bold text-slate-800">
                Explore Your Campus
              </p>
              <p className="text-xs text-slate-500 font-medium max-w-[240px] mt-1 leading-relaxed">
                Search across students, active community discussions, and verified marketplace listings.
              </p>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span className="text-xs font-semibold text-slate-400">
                Searching campus...
              </span>
            </div>
          )}

          {/* No Results Found */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 mb-3">
                <Search className="w-5 h-5 stroke-[1.5]" />
              </div>
              <p className="font-syne text-sm font-bold text-slate-800">
                No results found
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                We couldn&apos;t find anything matching &quot;{query}&quot;
              </p>
            </div>
          )}

          {/* Results List */}
          {!isLoading && hasAny && (
            <div className="pb-4">
              {/* People Category */}
              {hasStudents && (
                <div className="py-2">
                  <div className="px-6 pt-3 pb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      People
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {results.students.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {results.students.map((student) => {
                      const avatar =
                        student.avatar_url ||
                        getAvatarDataUrl({ name: student.name, seed: student.id });
                      const collegeName = student.college
                        ? student.college.includes('(MAIT)')
                          ? 'MAIT'
                          : student.college.split(' ').slice(-1)[0].replace(/[()]/g, '')
                        : 'Student';

                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                          onClick={() => {
                            if (query.trim()) addRecentSearch(query.trim());
                            go(`/student/profile/${student.id}`);
                          }}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <img
                              src={avatar}
                              alt={student.name}
                              className="h-11 w-11 shrink-0 rounded-full object-cover border border-slate-200/80 shadow-2xs"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-syne font-bold text-sm text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                                {student.name}
                              </p>
                              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                @{getDisplayHandle(student.username, 'student')}
                                <span className="mx-1.5 text-slate-300">·</span>
                                <span className="text-slate-600 font-semibold">{collegeName}</span>
                              </p>
                            </div>
                          </div>
                          {/* Sleek Soft-Fill Follow Button */}
                          <FollowButton
                            targetUserId={student.id}
                            initialFollowing={Boolean(student.is_following)}
                            size="sm"
                            variant="soft"
                            className="shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Posts Category */}
              {hasPosts && (
                <div className="py-2 border-t border-slate-100">
                  <div className="px-6 pt-3 pb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Community Posts
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {results.posts.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {results.posts.map((post) => {
                      const avatar =
                        post.author?.avatar_url ||
                        getAvatarDataUrl({ name: post.author?.name, seed: post.author?.id });
                      return (
                        <div
                          key={post.id}
                          className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                          onClick={() => {
                            if (query.trim()) addRecentSearch(query.trim());
                            go(`/community/${post.id}`);
                          }}
                        >
                          <img
                            src={avatar}
                            alt={post.author?.name}
                            className="h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200/80 mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-syne font-bold text-xs text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                              {post.author?.name || 'Campus Student'}
                            </p>
                            <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-0.5 leading-snug">
                              {post.title || post.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Marketplace Listings Category */}
              {hasListings && (
                <div className="py-2 border-t border-slate-100">
                  <div className="px-6 pt-3 pb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Marketplace Listings
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {results.listings.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {results.listings.map((listing) => {
                      const thumbnail =
                        Array.isArray(listing.images) && listing.images.length
                          ? listing.images[0]
                          : null;
                      return (
                        <div
                          key={listing.id}
                          className="flex items-center gap-3.5 px-6 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                          onClick={() => {
                            if (query.trim()) addRecentSearch(query.trim());
                            go(`/student/buy-sell/${listing.id}`);
                          }}
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-center">
                            {thumbnail ? (
                              <img
                                loading="lazy"
                                src={thumbnail}
                                alt={listing.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Store className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-syne font-bold text-sm text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                              {listing.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-syne font-extrabold text-xs text-slate-800">
                                ₹{Number(listing.price).toLocaleString()}
                              </span>
                              {listing.category && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                  {listing.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Centered Subtle 'View All Results' Interactive Link */}
              <div className="px-6 pt-6 pb-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (query.trim()) {
                      addRecentSearch(query.trim());
                      go(`/student/search?q=${encodeURIComponent(query.trim())}`);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-bold transition-all border border-slate-200/80 hover:border-amber-200/80 shadow-2xs group"
                >
                  <span>View all results for &quot;{query}&quot;</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Backward-compatible alias
export const SearchBar = SearchSlidePanel;
