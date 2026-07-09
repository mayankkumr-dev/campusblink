import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flag, Heart, MessageCircle, MapPin, Phone, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import {
  createListingReport,
  ensureConversation,
  getListingById,
  getListings,
  getWishlistIds,
  toggleWishlist,
} from '../../api/marketplace';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  MarketplaceAvatar,
  MarketplaceEmptyState,
  MarketplaceListing,
  MarketplaceListingCard,
  formatMarketplaceTime,
  formatPrice,
  getListingImage,
  getProfileName,
} from './marketplace/marketplaceShared';

const REPORT_REASONS = ['Spam', 'Fake item', 'Wrong category', 'Prohibited item', 'Scam concern'];

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

export function MarketplaceListingDetailPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [relatedListings, setRelatedListings] = useState<MarketplaceListing[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!listingId) return;
      setIsLoading(true);

      const listingResult = await getListingById(listingId);
      if (!active) return;

      if (listingResult.error || !listingResult.data) {
        toast.error(getErrorMessage(listingResult.error, 'Listing not found.'));
        setIsLoading(false);
        return;
      }

      const viewerIsOwner = profile?.id && listingResult.data.seller_id === profile.id;
      const viewerIsAdmin = profile?.role === 'admin';
      if (listingResult.data.is_admin_disabled && !viewerIsOwner && !viewerIsAdmin) {
        setIsRestricted(true);
        setListing(null);
        setIsLoading(false);
        return;
      }

      setListing(listingResult.data);
      setIsRestricted(false);
      setActiveImage(0);

      const relatedResult = await getListings({ category: listingResult.data.category || 'all' });
      if (!active) return;

      if (!relatedResult.error) {
        setRelatedListings((relatedResult.data || []).filter((item) => item.id !== listingResult.data.id).slice(0, 4));
      }

      if (profile?.id) {
        const wishlistResult = await getWishlistIds(profile.id);
        if (!active) return;
        if (!wishlistResult.error) {
          setWishlistIds(wishlistResult.data || []);
        }
      }

      setIsLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [listingId, profile?.id]);

  async function handleWishlistToggle() {
    if (!profile?.id || !listing) {
      toast.error('Please log in to use wishlist.');
      return;
    }

    const currentlyWished = wishlistIds.includes(listing.id);
    setWishlistIds((current) => currentlyWished ? current.filter((id) => id !== listing.id) : [...current, listing.id]);

    const { error } = await toggleWishlist(profile.id, listing.id);
    if (error) {
      setWishlistIds((current) => currentlyWished ? [...current, listing.id] : current.filter((id) => id !== listing.id));
      toast.error(getErrorMessage(error, 'Could not update wishlist.'));
      return;
    }

    toast.success(currentlyWished ? 'Removed from wishlist.' : 'Saved to wishlist.');
  }

  async function handleChatSeller() {
    if (!profile?.id || !listing) {
      toast.error('Please log in to start chatting.');
      return;
    }

    if (profile.id === listing.seller_id) {
      toast.error('This is your own listing.');
      return;
    }

    setIsStartingChat(true);
    const { data, error } = await ensureConversation(listing.id, profile.id, listing.seller_id);
    setIsStartingChat(false);

    if (error || !data) {
      toast.error(getErrorMessage(error, 'Could not open conversation.'));
      return;
    }

    navigate(`/student/campus-exchange/messages?conversation=${data.id}`);
  }

  async function handleReport() {
    if (!profile?.id || !listing) {
      toast.error('Please log in to report a listing.');
      return;
    }

    setIsReporting(true);
    const { error } = await createListingReport(listing.id, profile.id, reportReason, reportDescription.trim());
    setIsReporting(false);

    if (error) {
      toast.error(getErrorMessage(error, 'Could not submit report.'));
      return;
    }

    toast.success('Report submitted for review.');
    setShowReportModal(false);
    setReportDescription('');
  }

  if (!isLoading && !listing) {
    if (isRestricted) {
      return (
        <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6">
          <div className="w-full">
            <MarketplaceEmptyState
              title="Listing unavailable"
              description="This listing is currently restricted by admin and cannot be viewed."
              action={
                <Link to="/student/buy-sell" className="rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                  Back to marketplace
                </Link>
              }
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6">
        <div className="w-full">
          <MarketplaceEmptyState
            title="Listing not found"
            description="The item may have been removed or already sold."
            action={
              <Link to="/student/buy-sell" className="rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                Back to marketplace
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const images = listing?.images?.length ? listing.images : [getListingImage(listing)];
  const activeImageSrc = images[Math.min(activeImage, images.length - 1)];
  const isOwner = profile?.id === listing?.seller_id;
  const wished = listing ? wishlistIds.includes(listing.id) : false;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-secondary)_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-black/8 bg-[var(--bg)] px-5 py-4 shadow-[0_18px_70px_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--yellow-dark)]">Marketplace listing</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] select-text">{listing?.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/student/buy-sell" className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              Back to results
            </Link>
            <Link to="/student/campus-exchange/messages" className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              Messages
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="overflow-hidden rounded-[34px] border border-black/8 bg-[var(--bg)] shadow-[0_25px_90px_rgba(0,0,0,0.08)]">
            <div className="relative aspect-[1.18/1] bg-[var(--bg-secondary)]">
              {isLoading ? (
                <div className="h-full animate-pulse bg-[var(--bg-tertiary)]" />
              ) : (
                <ImageWithFallback src={activeImageSrc} alt={listing?.title} className="h-full w-full object-cover" />
              )}
              {listing?.is_sold ? (
                <div className="absolute left-5 top-5 rounded-md bg-[var(--text-primary)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                  Sold
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-4 gap-3 p-4 sm:p-5">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-[20px] border ${activeImage === index ? 'border-[var(--yellow)]' : 'border-black/8'}`}
                >
                  <ImageWithFallback src={image} alt={`${listing?.title} ${index + 1}`} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[34px] border border-black/8 bg-[var(--bg)] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.08)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-4xl font-black tracking-tight text-[var(--text-primary)]">{formatPrice(listing?.price)}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B6558]">
                    <span className="rounded-md bg-[var(--bg-secondary)] px-3 py-2">{listing?.category}</span>
                    <span className="rounded-md bg-[var(--yellow-light)] px-3 py-2 text-[var(--yellow-dark)]">{listing?.condition}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleWishlistToggle}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-black/10 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                >
                  <Heart className={`h-5 w-5 ${wished ? 'fill-[var(--yellow)] text-[var(--yellow)]' : ''}`} />
                </button>
              </div>

              <div className="mt-6 grid gap-4 rounded-[28px] bg-[var(--bg-primary)] p-5 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Location</div>
                  <div className="mt-2 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                    <MapPin className="h-4 w-4" />
                    {listing?.location || listing?.seller_profile?.college || 'On campus'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Posted</div>
                  <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatMarketplaceTime(listing?.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Views</div>
                  <div className="mt-2 font-semibold text-[var(--text-primary)]">{listing?.views_count || 0} interested looks</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--yellow-dark)]">Description</div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] select-text">{listing?.description}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleChatSeller}
                  disabled={isOwner || isStartingChat}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4" />
                  {isOwner ? 'Your listing' : isStartingChat ? 'Opening...' : 'Chat with seller'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 bg-[var(--bg)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)]"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                      toast.success('Listing link copied.');
                    }).catch(() => {
                      toast.error('Could not copy the listing link.');
                    });
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Share listing
                </button>
              </div>
            </div>

            <div className="rounded-[34px] border border-black/8 bg-[var(--bg)] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.08)] sm:p-7">
              <div className="flex items-center gap-4">
                <MarketplaceAvatar profile={listing?.seller_profile} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-black tracking-tight text-[var(--text-primary)]">{getProfileName(listing?.seller_profile)}</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">{listing?.seller_profile?.college || 'Campus Blink'}</div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--yellow-dark)]">{listing?.seller_listing_count || 0} active listings</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[var(--bg-primary)] p-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    <ShieldCheck className="h-4 w-4" />
                    Campus safety tip
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Inspect items in person, confirm condition, and avoid advance payment outside campus trust.</p>
                </div>
                <div className="rounded-[24px] bg-[var(--bg-primary)] p-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    <Phone className="h-4 w-4" />
                    Negotiate smartly
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Use chat to ask for more photos, send offers, and lock a pickup time near a known campus spot.</p>
                </div>
              </div>

              {!isOwner ? (
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
                >
                  <Flag className="h-4 w-4" />
                  Report this listing
                </button>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-[34px] border border-black/8 bg-[var(--bg)] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.08)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--yellow-dark)]">More like this</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">Other listings worth a look</h2>
            </div>
            <Sparkles className="h-5 w-5 text-[var(--yellow-hover)]" />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedListings.length ? relatedListings.map((item) => (
              <MarketplaceListingCard key={item.id} listing={item} wished={wishlistIds.includes(item.id)} onToggleWishlist={async (id) => {
                if (!profile?.id) {
                  toast.error('Please log in to use wishlist.');
                  return;
                }
                const currentlyWished = wishlistIds.includes(id);
                setWishlistIds((current) => currentlyWished ? current.filter((entry) => entry !== id) : [...current, id]);
                const { error } = await toggleWishlist(profile.id, id);
                if (error) {
                  setWishlistIds((current) => currentlyWished ? [...current, id] : current.filter((entry) => entry !== id));
                  toast.error(getErrorMessage(error, 'Could not update wishlist.'));
                }
              }} />
            )) : (
              <MarketplaceEmptyState
                title="No similar listings yet"
                description="Campus Blink will show more listings here as students post similar items."
              />
            )}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-30 mt-6 bg-[var(--bg-primary)]var(--bg-secondary)] via-[var(--bg-secondary)] to-transparent px-4 pb-4 pt-8 sm:hidden">
        <div className="mx-auto flex max-w-7xl gap-3 rounded-[26px] border border-black/8 bg-[var(--bg)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.1)]">
          <button
            type="button"
            onClick={handleWishlistToggle}
            className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-black/10"
          >
            <Heart className={`h-5 w-5 ${wished ? 'fill-[var(--yellow)] text-[var(--yellow)]' : 'text-[var(--text-primary)]'}`} />
          </button>
          <button
            type="button"
            onClick={handleChatSeller}
            disabled={isOwner || isStartingChat}
            className="flex-1 rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOwner ? 'Your listing' : isStartingChat ? 'Opening...' : 'Chat with seller'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showReportModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-lg rounded-t-[30px] bg-[var(--bg-primary)] p-5 shadow-md sm:rounded-[30px] sm:p-6"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--yellow-dark)]">Report listing</div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">Help keep Campus Blink safe</h3>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Reason</span>
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-[var(--bg)] px-4 py-3 text-sm outline-none"
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Details</span>
                <textarea
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  rows={4}
                  placeholder="Tell the admin team what looks wrong."
                  className="w-full rounded-lg border border-black/10 bg-[var(--bg)] px-4 py-3 text-sm outline-none"
                />
              </label>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 rounded-md border border-black/10 px-5 py-3 text-sm font-semibold text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={isReporting}
                  className="flex-1 rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)] disabled:opacity-60"
                >
                  {isReporting ? 'Sending...' : 'Submit report'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
