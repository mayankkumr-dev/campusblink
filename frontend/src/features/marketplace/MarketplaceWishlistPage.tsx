import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { getWishlistedListings, toggleWishlist } from '../../api/marketplace';
import { useAuthStore } from '../../store/authStore';
import {
  MARKETPLACE_CATEGORIES,
  MarketplaceEmptyState,
  MarketplaceListing,
  MarketplaceListingCard,
  MarketplaceListingCardSkeleton,
} from './marketplace/marketplaceShared';

const SF = 'SF Pro Text, system-ui, -apple-system, sans-serif';
const SF_DISPLAY = 'SF Pro Display, system-ui, -apple-system, sans-serif';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return fallback;
}

export function MarketplaceWishlistPage() {
  const { profile } = useAuthStore();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!profile?.id) return;
      setIsLoading(true);
      const { data, error } = await getWishlistedListings(profile.id, { category, searchTerm });
      if (!active) return;
      setIsLoading(false);
      if (error) { toast.error(getErrorMessage(error, 'Could not load wishlist.')); return; }
      setListings(data || []);
    }
    load();
    return () => { active = false; };
  }, [category, profile?.id, searchTerm]);

  async function handleToggleWishlist(listingId: string) {
    if (!profile?.id) return;
    const prev = listings;
    setListings((cur) => cur.filter((l) => l.id !== listingId));
    const { error } = await toggleWishlist(profile.id, listingId);
    if (error) {
      setListings(prev);
      toast.error(getErrorMessage(error, 'Could not update wishlist.'));
      return;
    }
    toast.success('Removed from wishlist.');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101113] text-[#1d1d1f] dark:text-[#F4F5F7] font-sans">
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {/* ── Hero tile (dark) ───────────────────────────────────── */}
        <section
          style={{ background: '#272729', border: '1px solid #3a3a3c', borderRadius: 18, padding: '40px 32px' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0066cc', marginBottom: 10 }}>
                Saved items
              </div>
              <h1 style={{ fontFamily: SF_DISPLAY, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-0.28px', color: '#f5f5f7', margin: 0, lineHeight: 1.1 }}>
                Your wishlist
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.47, color: '#acacac', marginTop: 10, maxWidth: 440 }}>
                Items you've saved to revisit before someone else grabs them.
              </p>
              <Link
                to="/student/buy-sell"
                className="mt-6 inline-flex items-center gap-2 transition-transform active:scale-95"
                style={{ padding: '11px 22px', borderRadius: 9999, background: '#0066cc', color: '#ffffff', fontSize: 17, display: 'inline-flex' }}
              >
                Explore marketplace →
              </Link>
            </div>

            {/* Stat */}
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: '24px 32px', textAlign: 'center' }}>
              <Heart className="mx-auto h-7 w-7" style={{ color: '#ef4444' }} />
              <div style={{ fontFamily: SF_DISPLAY, fontSize: 48, fontWeight: 600, color: '#f5f5f7', marginTop: 8, lineHeight: 1 }}>
                {isLoading ? '—' : listings.length}
              </div>
              <div style={{ fontSize: 13, color: '#acacac', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Saved listings
              </div>
            </div>
          </div>
        </section>

        {/* ── Filter tile ────────────────────────────── */}
        <section
          className="bg-white dark:bg-[#171A21] border border-gray-200 dark:border-[#262A33] rounded-[18px] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your saved items…"
              aria-label="Search saved listings"
              className="flex-1 min-w-0 h-[44px] rounded-full border border-gray-200 dark:border-[#262A33] bg-gray-50 dark:bg-gray-800 font-sans text-[17px] tracking-[-0.374px] text-gray-900 dark:text-[#F4F5F7] px-4 outline-none focus:border-[#0066cc] dark:focus:border-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-all active:scale-95 ${
                category === 'all'
                  ? 'bg-[#0066cc] dark:bg-blue-600 text-white border border-[#0066cc] dark:border-blue-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
              aria-pressed={category === 'all'}
            >
              All
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat === category ? 'all' : cat)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-all active:scale-95 ${
                  category === cat
                    ? 'bg-[#0066cc] dark:bg-blue-600 text-white border border-[#0066cc] dark:border-blue-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
                aria-pressed={category === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* ── Listings ────────────────────────────── */}
        <section
          className="bg-white dark:bg-[#171A21] border border-gray-200 dark:border-[#262A33] rounded-[18px] p-6"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.6px] text-[#0066cc] dark:text-[#60A5FA] mb-1">
            Your saved items
          </div>
          <h2 className="font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[21px] font-semibold text-gray-900 dark:text-[#F4F5F7] mb-5">
            {isLoading ? 'Loading…' : `${listings.length} item${listings.length !== 1 ? 's' : ''} saved`}
          </h2>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <MarketplaceListingCardSkeleton key={`sk-${i}`} />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <MarketplaceListingCard
                  key={listing.id}
                  listing={listing}
                  wished
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          ) : (
            <MarketplaceEmptyState
              title="Nothing saved yet"
              description="Tap the heart icon on any listing to save it here and return when you're ready to buy."
              action={
                <Link
                  to="/student/buy-sell"
                  className="inline-flex items-center gap-2 px-[22px] py-[11px] rounded-full bg-[#0066cc] dark:bg-blue-600 text-white text-[17px] transition-transform active:scale-95"
                >
                  Explore marketplace
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
