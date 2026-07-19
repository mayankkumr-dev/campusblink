import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { searchStudents, searchPosts, searchListings } from '../../api/search';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';
import { FollowButton } from '../../shared/components/FollowButton';
import { SearchResultsSkeleton } from './BoneyardSkeletons';

const POST_IMAGE_DELIMITER = '|||';

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parsePostImage(post: any): string | null {
  if (Array.isArray(post?.image_urls) && post.image_urls.length) return post.image_urls[0];
  const value = post?.image_url;
  if (!value || typeof value !== 'string') return null;
  if (value.includes(POST_IMAGE_DELIMITER)) return value.split(POST_IMAGE_DELIMITER)[0].trim();
  return value;
}

type TabType = 'All' | 'Students' | 'Posts' | 'Listings';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);

  const initialQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);

  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [isLoading, setIsLoading] = useState(false);

  const [students, setStudents] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setStudents([]);
        setPosts([]);
        setListings([]);
        return;
      }
      setIsLoading(true);
      const [studentsRes, postsRes, listingsRes] = await Promise.all([
        searchStudents(term, { limit: 20, currentUserId: profile?.id || null }),
        searchPosts(term, { limit: 20 }),
        searchListings(term, { limit: 20 }),
      ]);
      setStudents(studentsRes.data || []);
      setPosts(postsRes.data || []);
      setListings(listingsRes.data || []);
      setIsLoading(false);
    },
    [profile?.id]
  );

  // Run search when activeQuery changes
  useEffect(() => {
    if (activeQuery) runSearch(activeQuery);
  }, [activeQuery, runSearch]);

  // Sync URL param → state when navigating here
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setInputValue(q);
    setActiveQuery(q);
  }, [searchParams]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      setActiveQuery(trimmed);
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true });
      }
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setActiveQuery(trimmed);
    setSearchParams({ q: trimmed }, { replace: true });
  };

  const tabs: { label: TabType; count: number }[] = [
    { label: 'All', count: students.length + posts.length + listings.length },
    { label: 'Students', count: students.length },
    { label: 'Posts', count: posts.length },
    { label: 'Listings', count: listings.length },
  ];

  const totalCount = students.length + posts.length + listings.length;

  const showStudents = activeTab === 'All' || activeTab === 'Students';
  const showPosts = activeTab === 'All' || activeTab === 'Posts';
  const showListings = activeTab === 'All' || activeTab === 'Listings';

  return (
    <SearchResultsSkeleton loading={isLoading && Boolean(activeQuery)} name="search-page-results">
    <div className="min-h-full bg-[var(--bg-primary)] pb-24">
      <div className="mx-auto max-w-[860px] px-4 py-6 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <form onSubmit={handleSubmit} className="relative mb-3">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search students, posts, listings..."
              className="h-10 w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg-secondary)] pl-10 pr-4 text-[15px] font-sans text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--text-primary)] focus:bg-[var(--bg)] transition-colors"
            />
          </form>

          {activeQuery && (
            <>
              <h1 className="font-syne font-bold text-[24px] text-[var(--text-primary)] tracking-tight">
                Search results for &apos;{activeQuery}&apos;
              </h1>
              {!isLoading && (
                <p className="mt-1 font-sans text-[14px] text-[var(--text-muted)]">
                  {totalCount} result{totalCount !== 1 ? 's' : ''} found
                </p>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        {activeQuery && (
          <div className="mb-6 flex items-center gap-1 border-b border-[var(--border)]">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[14px] font-sans font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.label
                    ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    activeTab === tab.label ? 'bg-[var(--text-primary)] text-white' : 'bg-[#F0F0F0] text-[var(--text-secondary)]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--text-muted)]" />
          </div>
        )}

        {/* No query state */}
        {!activeQuery && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
            <Search className="h-10 w-10 text-[var(--border)] dark:text-slate-600 transition-colors" />
            <p className="font-sans text-[15px]">Search for students, posts, or listings</p>
          </div>
        )}

        {/* Zero results */}
        {activeQuery && !isLoading && totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
            <Search className="h-10 w-10 text-[var(--border)] dark:text-slate-600 transition-colors" />
            <p className="font-sans text-[15px]">No results for &apos;{activeQuery}&apos;</p>
          </div>
        )}

        {!isLoading && totalCount > 0 && (
          <div className="space-y-8">
            {/* Students */}
            {showStudents && students.length > 0 && (
              <section>
                {activeTab === 'All' && (
                  <h2 className="mb-4 font-syne font-bold text-[18px] text-[var(--text-primary)]">Students</h2>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {students.map((student) => {
                    const avatar = student.avatar_url || getAvatarDataUrl({ name: student.name, seed: student.id });
                    const isOwnProfile = student.id === profile?.id;

                    return (
                      <div
                        key={student.id}
                        className="flex flex-col items-center rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-5 text-center"
                      >
                        <button
                          onClick={() => navigate(`/student/profile/${student.id}`)}
                          className="flex flex-col items-center"
                        >
                          <img
                            src={avatar}
                            alt={student.name}
                            className="h-16 w-16 rounded-full border border-[var(--border)] object-cover mb-3"
                          />
                          <p className="font-syne font-semibold text-[16px] text-[var(--text-primary)] leading-tight">
                            {student.name}
                          </p>
                          <p className="mt-0.5 font-sans text-[13px] text-[var(--text-muted)]">
                            @{getDisplayHandle(student.username, 'student')}
                          </p>
                          {student.college && (
                            <span className="mt-2 rounded-md bg-[var(--yellow)]/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                              {student.college.includes('(MAIT)') ? 'MAIT' : student.college.split(' ').slice(-1)[0].replace(/[()]/g, '')}
                            </span>
                          )}
                          {student.campus_credits != null && (
                            <p className="mt-1.5 font-sans text-[12px] text-[var(--text-secondary)]">
                              ⭐ {student.campus_credits} Reputation
                            </p>
                          )}
                          {student.bio && (
                            <p className="mt-2 font-sans text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-snug">
                              {student.bio}
                            </p>
                          )}
                        </button>

                        {!isOwnProfile && (
                          <FollowButton
                            targetUserId={student.id}
                            initialFollowing={Boolean(student.is_following)}
                            className="mt-4 w-full"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Posts */}
            {showPosts && posts.length > 0 && (
              <section>
                {activeTab === 'All' && (
                  <h2 className="mb-4 font-syne font-bold text-[18px] text-[var(--text-primary)]">Posts</h2>
                )}
                <div className="rounded-[16px] border border-black/10 bg-[var(--bg)] overflow-hidden">
                  {posts.map((post, i) => {
                    const avatar =
                      post.author?.avatar_url ||
                      getAvatarDataUrl({ name: post.author?.name, seed: post.author?.id });
                    const thumbnail = parsePostImage(post);
                    return (
                      <article
                        key={post.id}
                        onClick={() => navigate(`/community/${post.id}`)}
                        className={`cursor-pointer px-4 py-4 hover:bg-[var(--bg-primary)] transition-colors ${i > 0 ? 'border-t border-black/10' : ''}`}
                      >
                        <div className="flex gap-3">
                          <img
                            src={avatar}
                            alt={post.author?.name}
                            className="mt-0.5 h-10 w-10 shrink-0 rounded-full border border-black/10 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-sans font-semibold text-[13px] text-[var(--text-primary)]">
                                {post.author?.name || 'Campus Student'}
                              </span>
                              {post.type && (
                                <span className="rounded-md bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--text-secondary)]">
                                  {post.type}
                                </span>
                              )}
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {formatRelativeTime(post.created_at)}
                              </span>
                            </div>
                            {post.title && (
                              <h3 className="mt-1 font-sans font-semibold text-[14px] text-[var(--text-primary)] leading-snug">
                                {post.title}
                              </h3>
                            )}
                            <p className="mt-0.5 font-sans text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-snug">
                              {post.content}
                            </p>
                            {thumbnail && (
                              <div className="mt-2 overflow-hidden rounded-[8px] border border-black/10 bg-[var(--bg-secondary)]">
                                <img loading="lazy" src={thumbnail} alt="Post" className="max-h-[160px] w-full object-cover" />
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-4 text-[12px] text-[var(--text-muted)]">
                              <span>{post.likes_count || 0} likes</span>
                              <span>{post.comments_count || 0} comments</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Listings */}
            {showListings && listings.length > 0 && (
              <section>
                {activeTab === 'All' && (
                  <h2 className="mb-4 font-syne font-bold text-[18px] text-[var(--text-primary)]">Listings</h2>
                )}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {listings.map((listing) => {
                    const thumbnail = Array.isArray(listing.images) && listing.images.length
                      ? listing.images[0]
                      : null;
                    return (
                      <div
                        key={listing.id}
                        onClick={() => navigate(`/student/buy-sell/${listing.id}`)}
                        className="cursor-pointer rounded-[8px] border border-[var(--border)] bg-[var(--bg)] overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-square bg-[var(--bg-secondary)]">
                          {thumbnail ? (
                            <img loading="lazy" src={thumbnail} alt={listing.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)] font-sans text-[11px]">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-sans font-semibold text-[13px] text-[var(--text-primary)] line-clamp-2 leading-snug">
                            {listing.title}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
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
              </section>
            )}
          </div>
        )}
      </div>
    </div>
    </SearchResultsSkeleton>
  );
};
