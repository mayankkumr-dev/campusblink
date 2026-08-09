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
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: SF }}>
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

        {/* ── Filter tile (parchment) ────────────────────────────── */}
        <section
          style={{ background: '#f5f5f7', border: '1px solid #e0e0e0', borderRadius: 18, padding: '20px 24px' }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your saved items…"
              aria-label="Search saved listings"
              style={{
                flex: 1,
                minWidth: 0,
                height: 44,
                borderRadius: 9999,
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#ffffff',
                fontFamily: SF,
                fontSize: 17,
                letterSpacing: '-0.374px',
                color: '#1d1d1f',
                padding: '0 16px',
                outline: 'none',
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.border = '1px solid #0066cc'; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.border = '1px solid rgba(0,0,0,0.08)'; }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className="rounded-full px-4 py-1.5 text-[14px] font-medium transition-all active:scale-95"
              style={{
                background: category === 'all' ? '#0066cc' : '#ffffff',
                color: category === 'all' ? '#ffffff' : '#333333',
                border: category === 'all' ? '1.5px solid #0066cc' : '1px solid #e0e0e0',
              }}
              aria-pressed={category === 'all'}
            >
              All
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat === category ? 'all' : cat)}
                className="rounded-full px-4 py-1.5 text-[14px] font-medium transition-all active:scale-95"
                style={{
                  background: category === cat ? '#0066cc' : '#ffffff',
                  color: category === cat ? '#ffffff' : '#333333',
                  border: category === cat ? '1.5px solid #0066cc' : '1px solid #e0e0e0',
                }}
                aria-pressed={category === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* ── Listings (white canvas) ────────────────────────────── */}
        <section
          style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18, padding: '24px' }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0066cc', marginBottom: 6 }}>
            Your saved items
          </div>
          <h2 style={{ fontFamily: SF_DISPLAY, fontSize: 21, fontWeight: 600, color: '#1d1d1f', marginBottom: 20 }}>
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
                  className="inline-flex items-center gap-2 rounded-full text-white transition-transform active:scale-95"
                  style={{ padding: '11px 22px', background: '#0066cc', fontSize: 17 }}
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
