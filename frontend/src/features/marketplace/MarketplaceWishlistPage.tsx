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
  MarketplaceSectionCard,
} from './marketplace/marketplaceShared';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
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
      if (error) {
        toast.error(getErrorMessage(error, 'Could not load wishlist.'));
        return;
      }

      setListings(data || []);
    }

    load();
    return () => {
      active = false;
    };
  }, [category, profile?.id, searchTerm]);

  async function handleToggleWishlist(listingId: string) {
    if (!profile?.id) return;
    const currentListings = listings;
    setListings((current) => current.filter((item) => item.id !== listingId));

    const { error } = await toggleWishlist(profile.id, listingId);
    if (error) {
      setListings(currentListings);
      toast.error(getErrorMessage(error, 'Could not update wishlist.'));
      return;
    }

    toast.success('Removed from wishlist.');
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-secondary)_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="rounded-[34px] border border-black/8 bg-[var(--text-primary)] px-6 py-8 text-white shadow-[0_28px_110px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[var(--bg)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--yellow)]">
                Your shortlist
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight">Wishlist</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">Track the best campus deals in one place and jump back in before someone else grabs them.</p>
            </div>
            <div className="rounded-[28px] bg-[var(--bg)]/8 px-6 py-5 text-center ">
              <Heart className="mx-auto h-6 w-6 text-[var(--yellow)]" />
              <div className="mt-3 text-3xl font-black tracking-tight">{listings.length}</div>
              <div className="mt-1 text-sm text-white/68">Saved listings</div>
            </div>
          </div>
        </section>

        <MarketplaceSectionCard eyebrow="Filter" title="Keep only the items you still want">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search saved items"
              className="w-full rounded-md border border-black/10 bg-[var(--bg-primary)] px-5 py-3 text-sm outline-none"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-md border border-black/10 bg-[var(--bg-primary)] px-5 py-3 text-sm outline-none"
            >
              <option value="all">All categories</option>
              {MARKETPLACE_CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </MarketplaceSectionCard>

        <MarketplaceSectionCard eyebrow="Saved items" title="Your campus watchlist">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {new Array(6).fill(null).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-[30px] border border-black/8 bg-[var(--bg)]">
                  <div className="aspect-square animate-pulse bg-[var(--bg-secondary)]" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-28 animate-pulse rounded-md bg-[var(--bg-secondary)]" />
                    <div className="h-4 w-full animate-pulse rounded-md bg-[var(--bg-secondary)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
              description="Tap the heart on any listing to keep it here and return when you're ready to chat."
              action={
                <Link to="/student/buy-sell" className="rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                  Explore marketplace
                </Link>
              }
            />
          )}
        </MarketplaceSectionCard>
      </div>
    </div>
  );
}
