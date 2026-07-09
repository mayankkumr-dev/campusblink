import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, MessageCircle, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { AccessDenied } from './AccessDenied';
import {
  createListing,
  getListings,
  getMyListings,
  getWishlistIds,
  toggleWishlist,
} from '../../api/marketplace';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  MarketplaceEmptyState,
  MarketplaceListing,
  MarketplaceSectionCard,
  formatMarketplaceTime,
  formatPrice,
  getListingImage,
} from './marketplace/marketplaceShared';
import { ListSkeleton, ProductSkeleton } from './ui/Skeletons';

type ListingDraft = {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  location: string;
};

const INITIAL_DRAFT: ListingDraft = {
  title: '',
  description: '',
  category: 'Electronics',
  condition: 'Good',
  price: '',
  location: '',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

function CreateListingModal({
  open,
  draft,
  files,
  previewUrls,
  isSubmitting,
  onClose,
  onChange,
  onFilesChange,
  onSubmit,
}: {
  open: boolean;
  draft: ListingDraft;
  files: File[];
  previewUrls: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (field: keyof ListingDraft, value: string) => void;
  onFilesChange: (nextFiles: File[]) => void;
  onSubmit: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.24 }}
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[32px] bg-[var(--bg)] shadow-[var(--shadow-lg)] sm:rounded-[32px]"
          >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[color:rgba(255,255,255,0.96)] px-5 py-4 sm:px-7">
              <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Sell something</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)]">Post a listing in minutes</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-2)]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-7 p-5 sm:grid-cols-[1.1fr_0.9fr] sm:p-7">
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Listing title</span>
                  <input
                    value={draft.title}
                    onChange={(event) => onChange('title', event.target.value)}
                    placeholder="MacBook Air M1, barely used"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => onChange('description', event.target.value)}
                    rows={5}
                    placeholder="Add condition, reason for selling, and pickup details."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Category</span>
                    <select
                      value={draft.category}
                      onChange={(event) => onChange('category', event.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                    >
                      {MARKETPLACE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Condition</span>
                    <select
                      value={draft.condition}
                      onChange={(event) => onChange('condition', event.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                    >
                      {MARKETPLACE_CONDITIONS.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Price</span>
                    <input
                      value={draft.price}
                      onChange={(event) => onChange('price', event.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="25000"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Location</span>
                    <input
                      value={draft.location}
                      onChange={(event) => onChange('location', event.target.value)}
                      placeholder="Boys Hostel Gate"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-5">
                <label className="block rounded-[28px] border border-dashed border-[var(--border-accent)] bg-[var(--bg)] p-5 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-[var(--accent-light)] text-[var(--accent)]">
                    <Plus className="h-6 w-6" />
                  </span>
                  <div className="mt-4 text-base font-bold text-[var(--text-primary)]">Add up to 5 photos</div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">Clear photos get faster replies. Campus Blink will upload them for you.</div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => onFilesChange(Array.from(event.target.files || []).slice(0, 5))}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {(previewUrls.length ? previewUrls : new Array(4).fill(null)).map((preview, index) => (
                    <div key={`${preview || 'placeholder'}-${index}`} className="aspect-square overflow-hidden rounded-[24px] bg-[var(--bg-3)]">
                      {preview ? (
                        <ImageWithFallback src={preview} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-3)]">
                          Photo {index + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-[28px] bg-[var(--accent)] p-5 text-white">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/90">Preview</div>
                  <div className="mt-3 text-3xl font-black tracking-tight">{draft.price ? formatPrice(Number(draft.price)) : 'Add a price'}</div>
                  <div className="mt-2 text-base font-semibold">{draft.title || 'Your listing title will appear here'}</div>
                  <div className="mt-3 text-sm leading-6 text-white/74">{draft.description || 'Describe the item honestly, include pickup details, and mention if the price is negotiable.'}</div>
                </div>

                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="w-full rounded-md bg-[var(--accent)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Publishing...' : `Publish ${files.length ? `(${files.length} photos)` : ''}`}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function BuySellPage() {
  const location = useLocation();
  const { profile } = useAuthStore();
  const { hasAccess: hasMarketplaceAccess, isChecking: checkingMarketplaceAccess } = useFeatureAccess('marketplace_access');
  const { isAllowed } = useFeatureAccess(profile);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [showComposer, setShowComposer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState<ListingDraft>(INITIAL_DRAFT);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);

  const placeholderWords = ['Electronics', 'Books', 'Cycle', 'Hostel essentials', 'Furniture'];

  useEffect(() => {
    let active = true;

    async function load() {
      if (!profile?.id) return;
      setIsLoading(true);

      const [listingResult, myListingResult, wishlistResult] = await Promise.all([
        getListings({ category, searchTerm }),
        getMyListings(profile.id),
        getWishlistIds(profile.id),
      ]);

      if (!active) return;

      if (listingResult.error) {
        toast.error(getErrorMessage(listingResult.error, 'Could not load marketplace listings.'));
      } else {
        setListings(listingResult.data || []);
      }

      if (myListingResult.error) {
        toast.error(getErrorMessage(myListingResult.error, 'Could not load your listings.'));
      } else {
        setMyListings(myListingResult.data || []);
      }

      if (!wishlistResult.error) {
        setWishlistIds(wishlistResult.data || []);
      }

      setIsLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [category, profile?.id, searchTerm]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlaceholderVisible(false);
      window.setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderWords.length);
        setPlaceholderVisible(true);
      }, 180);
    }, 2200);

    return () => window.clearInterval(interval);
  }, [placeholderWords.length]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('compose') === '1') {
      setShowComposer(true);
    }
  }, [location.search]);

  const featuredListings = listings;
  const activeListingsCount = myListings.filter((listing) => !listing.is_sold).length;
  const soldListingsCount = myListings.filter((listing) => listing.is_sold).length;

  if (checkingMarketplaceAccess) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <ListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (!hasMarketplaceAccess) {
    return <AccessDenied feature="Marketplace" />;
  }

  async function handleToggleWishlist(listingId: string) {
    if (!profile?.id) {
      toast.error('Please log in to use wishlist.');
      return;
    }

    const currentlyWished = wishlistIds.includes(listingId);
    setWishlistIds((current) => currentlyWished ? current.filter((id) => id !== listingId) : [...current, listingId]);

    const { data, error } = await toggleWishlist(profile.id, listingId);
    if (error) {
      setWishlistIds((current) => currentlyWished ? [...current, listingId] : current.filter((id) => id !== listingId));
      toast.error(getErrorMessage(error, 'Could not update wishlist.'));
      return;
    }

    toast.success(data?.wished ? 'Saved to wishlist.' : 'Removed from wishlist.');
  }

  async function handleCreateListing() {
    if (!profile?.id) {
      toast.error('Please log in again before posting.');
      return;
    }

    if (!isAllowed('listing_creation')) {
      toast.error('Listing creation is currently restricted for your account.');
      return;
    }

    if (!draft.title.trim() || !draft.description.trim() || !draft.price.trim()) {
      toast.error('Title, description, and price are required.');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await createListing(
      {
        seller_id: profile.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        condition: draft.condition,
        price: Number(draft.price),
        location: draft.location.trim() || profile.college || 'On campus',
      },
      files
    );
    setIsSubmitting(false);

    if (error) {
      toast.error(getErrorMessage(error, 'Could not publish listing.'));
      return;
    }

    setListings((current) => data ? [data, ...current] : current);
    setMyListings((current) => data ? [data, ...current] : current);
    setShowComposer(false);
    setDraft(INITIAL_DRAFT);
    setFiles([]);
    toast.success('Listing published.');
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(45,78,245,0.06)_0%,transparent_70%)] px-4 pt-4 pb-24 sm:px-6 md:pb-8 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] shadow-[var(--shadow-md)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.38fr_0.62fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-light)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Campus Blink Marketplace
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Buy smart, sell fast, campus-first.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                A clean campus marketplace for gadgets, books, furniture, and quick hostel pickups.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAllowed('listing_creation')) {
                      toast.error('Listing creation is currently restricted for your account.');
                      return;
                    }
                    setShowComposer(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-black uppercase tracking-[0.15em] text-white hover:bg-[var(--accent-hover)]"
                >
                  <Plus className="h-4 w-4" />
                  Sell Now
                </button>
                <Link
                  to="/student/campus-exchange/messages"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-2)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Messages
                </Link>
                <Link
                  to="/student/wishlist"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-2)]"
                >
                  <Heart className="h-4 w-4" />
                  Wishlist
                </Link>
                <Link
                  to="/student/buy-sell/manage"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-2)]"
                >
                  Manage Listings
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-2)] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-3)]">Active listings</div>
                <div className="mt-3 text-4xl font-black tracking-tight text-[var(--accent)]">{activeListingsCount}</div>
                <div className="mt-2 text-sm text-[var(--text-2)]">Items currently live</div>
              </div>
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-2)] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-3)]">Sold</div>
                <div className="mt-3 text-4xl font-black tracking-tight text-[var(--text-primary)]">{soldListingsCount}</div>
                <div className="mt-2 text-sm text-[var(--text-2)]">Listings closed successfully</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-6">
            <MarketplaceSectionCard eyebrow="Discover" title="Fresh picks around you">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder=""
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-12 py-3.5 text-sm outline-none transition focus:border-[var(--accent)]"
                  />
                  {!searchTerm.trim() ? (
                    <div className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-sm">
                      <span className="text-[var(--text-3)]">Search for </span>
                      <span className={`text-[var(--accent)] transition-opacity duration-200 ${placeholderVisible ? 'opacity-100' : 'opacity-0'}`}>
                        {placeholderWords[placeholderIndex]}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <SlidersHorizontal className="h-4 w-4" />
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="bg-transparent outline-none"
                  >
                    <option value="all">All categories</option>
                    {MARKETPLACE_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('all')}
                  className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${category === 'all' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-3)] text-[var(--text-2)]'}`}
                >
                  All
                </button>
                {MARKETPLACE_CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${category === item ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-3)] text-[var(--text-2)]'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </MarketplaceSectionCard>

            <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[var(--shadow-sm)]">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <ProductSkeleton key={`marketplace-product-skeleton-${index}`} />
                  ))}
                </div>
              ) : featuredListings.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {featuredListings.map((listing) => (
                    <div key={listing.id} className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-2.5">
                          <Link to={`/student/buy-sell/${listing.id}`} className="block">
                            <div className="aspect-[1/0.9] overflow-hidden rounded-[8px] bg-[var(--bg-3)]">
                              <ImageWithFallback src={getListingImage(listing)} alt={listing.title} className="h-full w-full object-cover" />
                            </div>
                          </Link>
                          <div className="pt-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="card-title listing-title line-clamp-2 text-[13px] font-semibold text-[var(--text-primary)]">{listing.title}</p>
                              <p className="listing-price text-[13px] font-bold text-[var(--text-primary)]">{formatPrice(listing.price)}</p>
                            </div>
                            <p className="listing-category-badge mt-1 line-clamp-1 text-[11px] text-[var(--text-secondary)]">{listing.category} · {listing.condition}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <button onClick={() => handleToggleWishlist(listing.id)} className={`text-[11px] font-medium ${wishlistIds.includes(listing.id) ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}>{wishlistIds.includes(listing.id) ? '♥ Saved' : '♡ Save'}</button>
                              <div className="flex items-center gap-1.5">
                                {profile?.id && profile.id !== listing.seller_id ? (
                                  <Link
                                    to="/student/campus-exchange/messages"
                                    className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-2)]"
                                  >
                                    Chat
                                  </Link>
                                ) : null}
                                <Link to={`/student/buy-sell/${listing.id}`} className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-2)]">Open Listing</Link>
                              </div>
                            </div>
                          </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MarketplaceEmptyState
                  title="No listings matched that search"
                  description="Try a broader keyword, switch categories, or post the first item in this niche."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAllowed('listing_creation')) {
                          toast.error('Listing creation is currently restricted for your account.');
                          return;
                        }
                        setShowComposer(true);
                      }}
                      className="rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white hover:bg-[var(--accent-hover)]"
                    >
                      Post a listing
                    </button>
                  }
                />
              )}
            </section>
          </div>
        </section>
      </div>

      <CreateListingModal
        open={showComposer}
        draft={draft}
        files={files}
        previewUrls={previewUrls}
        isSubmitting={isSubmitting}
        onClose={() => setShowComposer(false)}
        onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
        onFilesChange={setFiles}
        onSubmit={handleCreateListing}
      />
    </div>
  );
}
