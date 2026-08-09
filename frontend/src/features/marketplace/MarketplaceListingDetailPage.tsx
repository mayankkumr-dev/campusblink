import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flag, Heart, MapPin, MessageCircle, Share2, ShieldCheck, Smartphone, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import {
  createListingReport,
  ensureConversation,
  getListingById,
  getListings,
  getWishlistIds,
  toggleWishlist,
} from '../../api/marketplace';
import { ImageWithFallback } from '../../shared/components/ImageWithFallback';
import {
  MarketplaceAvatar,
  MarketplaceConditionBadge,
  MarketplaceEmptyState,
  MarketplaceListing,
  MarketplaceListingCard,
  MarketplaceListingCardSkeleton,
  MarketplaceStatusBadge,
  formatMarketplaceTime,
  formatPrice,
  getListingImage,
  getProfileName,
} from './marketplace/marketplaceShared';

const REPORT_REASONS = ['Spam', 'Fake item', 'Wrong category', 'Prohibited item', 'Scam concern', 'Other'];

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return fallback;
}

const SF = 'SF Pro Text, system-ui, -apple-system, sans-serif';
const SF_DISPLAY = 'SF Pro Display, system-ui, -apple-system, sans-serif';

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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Chat
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!listingId) return;
      setIsLoading(true);
      setLoadError(null);

      const listingResult = await getListingById(listingId);
      if (!active) return;

      if (listingResult.error || !listingResult.data) {
        setLoadError(getErrorMessage(listingResult.error, 'Listing not found.'));
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

      // Load related
      const relatedResult = await getListings({ category: listingResult.data.category || 'all' });
      if (!active) return;
      if (!relatedResult.error) {
        setRelatedListings((relatedResult.data || []).filter((i) => i.id !== listingResult.data!.id).slice(0, 4));
      }

      // Load wishlist
      if (profile?.id) {
        const wResult = await getWishlistIds(profile.id);
        if (active && !wResult.error) setWishlistIds(wResult.data || []);
      }

      setIsLoading(false);
    }

    load();
    return () => { active = false; };
  }, [listingId, profile?.id]);

  async function handleWishlistToggle() {
    if (!profile?.id || !listing) { toast.error('Please log in to use wishlist.'); return; }
    const wished = wishlistIds.includes(listing.id);
    setWishlistIds((cur) => wished ? cur.filter((id) => id !== listing.id) : [...cur, listing.id]);
    const { error } = await toggleWishlist(profile.id, listing.id);
    if (error) {
      setWishlistIds((cur) => wished ? [...cur, listing.id] : cur.filter((id) => id !== listing.id));
      toast.error(getErrorMessage(error, 'Could not update wishlist.'));
      return;
    }
    toast.success(wished ? 'Removed from wishlist.' : 'Saved to wishlist.');
  }

  async function handleChatSeller() {
    if (!profile?.id || !listing) { toast.error('Please log in to start chatting.'); return; }
    if (profile.id === listing.seller_id) { toast.error('This is your own listing.'); return; }

    setIsStartingChat(true);
    const { data, error } = await ensureConversation(listing.id, profile.id, listing.seller_id);
    setIsStartingChat(false);

    if (error || !data) { toast.error(getErrorMessage(error, 'Could not open conversation.')); return; }
    navigate(`/student/campus-exchange/messages?conversation=${data.id}`);
  }

  async function handleReport() {
    if (!profile?.id || !listing) { toast.error('Please log in to report a listing.'); return; }
    setIsReporting(true);
    const { error } = await createListingReport(listing.id, profile.id, reportReason, reportDescription.trim());
    setIsReporting(false);
    if (error) { toast.error(getErrorMessage(error, 'Could not submit report.')); return; }
    toast.success('Report submitted for review. Thank you.');
    setShowReportModal(false);
    setReportDescription('');
  }

  // ── Error / restricted states ────────────────────────────────────────────

  if (!isLoading && (loadError || (!listing && !isRestricted))) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', padding: '32px 16px' }}>
        <MarketplaceEmptyState
          title="Listing not found"
          description={loadError || 'The item may have been removed or already sold.'}
          action={
            <Link
              to="/student/buy-sell"
              className="inline-flex items-center gap-2 rounded-full text-white active:scale-95"
              style={{ padding: '11px 22px', background: '#0066cc', fontSize: 17 }}
            >
              Back to marketplace
            </Link>
          }
        />
      </div>
    );
  }

  if (!isLoading && isRestricted) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', padding: '32px 16px' }}>
        <MarketplaceEmptyState
          title="Listing unavailable"
          description="This listing has been restricted by admin and cannot be viewed."
          action={
            <Link
              to="/student/buy-sell"
              className="inline-flex items-center gap-2 rounded-full text-white active:scale-95"
              style={{ padding: '11px 22px', background: '#0066cc', fontSize: 17 }}
            >
              Back to marketplace
            </Link>
          }
        />
      </div>
    );
  }

  const images = listing?.images?.length ? listing.images : [getListingImage(listing)];
  const activeImageSrc = images[Math.min(activeImage, images.length - 1)];
  const isOwner = profile?.id === listing?.seller_id;
  const wished = listing ? wishlistIds.includes(listing.id) : false;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: SF }}>
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        {/* Back nav */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/student/buy-sell"
            className="flex items-center gap-1.5 text-[14px] font-medium transition-transform active:scale-95"
            style={{ color: '#0066cc' }}
            aria-label="Back to marketplace"
          >
            ← Back to marketplace
          </Link>
          <Link
            to="/student/campus-exchange/messages"
            className="flex items-center gap-1.5 rounded-full text-[14px] font-medium transition-transform active:scale-95"
            style={{ padding: '8px 15px', background: '#1d1d1f', color: '#ffffff', borderRadius: 8 }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Messages
          </Link>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Image gallery */}
          <section
            style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18, overflow: 'hidden' }}
          >
            {/* Main image */}
            <div className="relative aspect-[1.1/1]" style={{ background: '#f5f5f7' }}>
              {isLoading ? (
                <div className="h-full w-full animate-pulse" style={{ background: '#f0f0f0' }} />
              ) : (
                <ImageWithFallback
                  src={activeImageSrc}
                  alt={listing?.title ?? 'Listing image'}
                  className="h-full w-full object-cover"
                  style={{ boxShadow: 'rgba(0,0,0,0.22) 3px 5px 30px 0px' }}
                />
              )}
              {listing?.is_sold && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  <span
                    className="rounded-full px-6 py-2 text-sm font-semibold uppercase tracking-widest text-white"
                    style={{ background: '#1d1d1f' }}
                  >
                    Sold
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 p-3 sm:p-4">
                {images.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-pressed={activeImage === i}
                    className="aspect-square overflow-hidden transition-all active:scale-95"
                    style={{
                      borderRadius: 8,
                      border: activeImage === i ? '2px solid #0066cc' : '1px solid #e0e0e0',
                    }}
                  >
                    <ImageWithFallback src={img} alt={`${listing?.title} image ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Info panel */}
          <section className="space-y-4">
            {/* Price + title + badges */}
            <div
              style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18, padding: '28px 24px' }}
            >
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 w-1/2 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
                  <div className="h-6 w-3/4 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
                  <div className="h-4 w-1/3 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div
                        style={{
                          fontFamily: SF_DISPLAY,
                          fontSize: 'clamp(32px, 5vw, 48px)',
                          fontWeight: 600,
                          letterSpacing: '-0.28px',
                          color: '#1d1d1f',
                          lineHeight: 1.1,
                        }}
                      >
                        {formatPrice(listing?.price)}
                      </div>
                      <h1
                        style={{
                          fontFamily: SF_DISPLAY,
                          fontSize: 21,
                          fontWeight: 600,
                          letterSpacing: '0.231px',
                          color: '#1d1d1f',
                          marginTop: 8,
                        }}
                      >
                        {listing?.title}
                      </h1>
                    </div>
                    {/* Wishlist button — button-icon-circular spec */}
                    <button
                      type="button"
                      onClick={handleWishlistToggle}
                      aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                      style={{
                        background: wished ? '#fff0f0' : '#f5f5f7',
                        border: wished ? '1px solid #fca5a5' : '1px solid #e0e0e0',
                      }}
                    >
                      <Heart
                        className="h-5 w-5"
                        style={{ color: wished ? '#ef4444' : '#7a7a7a' }}
                        fill={wished ? '#ef4444' : 'none'}
                      />
                    </button>
                  </div>

                  {/* Status + condition chips */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {listing && <MarketplaceStatusBadge listing={listing} />}
                    <MarketplaceConditionBadge condition={listing?.condition} />
                    {listing?.category && (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        style={{ background: '#f5f5f7', color: '#7a7a7a', border: '1px solid #e0e0e0' }}
                      >
                        {listing.category}
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div
                    className="mt-5 grid gap-3 sm:grid-cols-3"
                    style={{ background: '#f5f5f7', borderRadius: 12, padding: 16 }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a7a7a' }}>Location</div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[14px] font-medium" style={{ color: '#1d1d1f' }}>
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#7a7a7a]" />
                        {listing?.location || listing?.seller_profile?.college || 'On campus'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a7a7a' }}>Posted</div>
                      <div className="mt-1.5 text-[14px] font-medium" style={{ color: '#1d1d1f' }}>
                        {formatMarketplaceTime(listing?.created_at)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a7a7a' }}>Views</div>
                      <div className="mt-1.5 text-[14px] font-medium" style={{ color: '#1d1d1f' }}>
                        {listing?.views_count ?? 0} looks
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {listing?.description && (
                    <div className="mt-5">
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0066cc', marginBottom: 8 }}>
                        Description
                      </div>
                      <p
                        style={{
                          fontFamily: SF,
                          fontSize: 17,
                          fontWeight: 400,
                          lineHeight: 1.47,
                          letterSpacing: '-0.374px',
                          color: '#333333',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {listing.description}
                      </p>
                    </div>
                  )}

                  {/* CTAs */}
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {/* Chat — button-primary spec */}
                    <button
                      type="button"
                      id="contact-seller-btn"
                      onClick={handleChatSeller}
                      disabled={isOwner || isStartingChat || listing?.is_sold}
                      className="inline-flex items-center justify-center gap-2 transition-transform active:scale-95"
                      style={{
                        padding: '11px 22px',
                        borderRadius: 9999,
                        background: isOwner || listing?.is_sold ? '#f5f5f7' : '#0066cc',
                        color: isOwner || listing?.is_sold ? '#7a7a7a' : '#ffffff',
                        fontSize: 17,
                        border: 'none',
                        cursor: isOwner || isStartingChat || listing?.is_sold ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {isOwner ? 'Your listing' : listing?.is_sold ? 'Item sold' : isStartingChat ? 'Opening…' : 'Contact seller'}
                    </button>

                    {/* Share — button-dark-utility spec */}
                    <button
                      type="button"
                      id="share-listing-btn"
                      className="inline-flex items-center justify-center gap-2 transition-transform active:scale-95"
                      style={{
                        padding: '8px 15px',
                        borderRadius: 8,
                        background: '#1d1d1f',
                        color: '#ffffff',
                        fontSize: 14,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                          .then(() => toast.success('Link copied to clipboard.'))
                          .catch(() => toast.error('Could not copy link.'));
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                      Share listing
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Seller card */}
            {!isLoading && listing && (
              <div
                style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18, padding: '24px' }}
              >
                <div className="flex items-center gap-4">
                  <MarketplaceAvatar profile={listing.seller_profile} size="lg" />
                  <div className="min-w-0">
                    <div style={{ fontFamily: SF_DISPLAY, fontSize: 17, fontWeight: 600, color: '#1d1d1f' }}>
                      {getProfileName(listing.seller_profile)}
                    </div>
                    <div style={{ fontSize: 14, color: '#7a7a7a', marginTop: 2 }}>
                      {listing.seller_profile?.college || 'Campus Blink'}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0066cc', marginTop: 4 }}>
                      {listing.seller_listing_count ?? 0} active listings
                    </div>
                  </div>
                </div>

                {/* Safety tips */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div style={{ background: '#f5f5f7', borderRadius: 12, padding: 16 }}>
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#7a7a7a' }}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Safety tip
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: '#333333', marginTop: 8 }}>
                      Always inspect items in person. Avoid advance payment outside campus.
                    </p>
                  </div>
                  <div style={{ background: '#f5f5f7', borderRadius: 12, padding: 16 }}>
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#7a7a7a' }}>
                      <Smartphone className="h-3.5 w-3.5" />
                      Negotiate smartly
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: '#333333', marginTop: 8 }}>
                      Chat to ask for more photos, make offers, and lock a pickup near a known campus spot.
                    </p>
                  </div>
                </div>

                {!isOwner && (
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="mt-4 flex items-center gap-2 text-[13px] font-medium transition-colors"
                    style={{ color: '#7a7a7a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report this listing
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── Related listings ──────────────────────────────────────── */}
        <section
          style={{ background: '#f5f5f7', border: '1px solid #e0e0e0', borderRadius: 18, padding: '28px 24px' }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0066cc', marginBottom: 6 }}>
            More like this
          </div>
          <h2 style={{ fontFamily: SF_DISPLAY, fontSize: 21, fontWeight: 600, letterSpacing: '0.231px', color: '#1d1d1f', marginBottom: 20 }}>
            Other listings
          </h2>
          {relatedListings.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {relatedListings.map((item) => (
                <MarketplaceListingCard
                  key={item.id}
                  listing={item}
                  wished={wishlistIds.includes(item.id)}
                  onToggleWishlist={async (id) => {
                    if (!profile?.id) { toast.error('Please log in to use wishlist.'); return; }
                    const currentlyWished = wishlistIds.includes(id);
                    setWishlistIds((cur) => currentlyWished ? cur.filter((e) => e !== id) : [...cur, id]);
                    const { error } = await toggleWishlist(profile.id, id);
                    if (error) {
                      setWishlistIds((cur) => currentlyWished ? [...cur, id] : cur.filter((e) => e !== id));
                      toast.error(getErrorMessage(error, 'Could not update wishlist.'));
                    }
                  }}
                />
              ))}
            </div>
          ) : !isLoading ? (
            <MarketplaceEmptyState
              title="No similar listings yet"
              description="More listings will appear here as students post similar items."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <MarketplaceListingCardSkeleton key={`related-sk-${i}`} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Mobile sticky CTA bar — floating-sticky-bar spec ─────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 sm:hidden"
        style={{
          background: 'rgba(245,245,247,0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          height: 64,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ background: wished ? '#fff0f0' : '#f5f5f7', border: '1px solid #e0e0e0' }}
          >
            <Heart className="h-5 w-5" style={{ color: wished ? '#ef4444' : '#7a7a7a' }} fill={wished ? '#ef4444' : 'none'} />
          </button>
          <button
            type="button"
            onClick={handleChatSeller}
            disabled={isOwner || isStartingChat || listing?.is_sold}
            className="flex-1 rounded-full text-white transition-transform active:scale-95"
            style={{
              height: 44,
              background: isOwner || listing?.is_sold ? '#f5f5f7' : '#0066cc',
              color: isOwner || listing?.is_sold ? '#7a7a7a' : '#ffffff',
              fontSize: 17,
              fontWeight: 400,
              border: 'none',
              cursor: isOwner || isStartingChat || listing?.is_sold ? 'not-allowed' : 'pointer',
            }}
          >
            {isOwner ? 'Your listing' : listing?.is_sold ? 'Item sold' : isStartingChat ? 'Opening…' : 'Contact seller'}
          </button>
        </div>
      </div>

      {/* ── Report modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-md"
              style={{
                background: '#ffffff',
                borderRadius: '20px 20px 0 0',
                padding: 24,
                boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Report listing"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0066cc', marginBottom: 4 }}>
                    Report listing
                  </div>
                  <h3 style={{ fontFamily: SF_DISPLAY, fontSize: 21, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>
                    Help keep Campus Blink safe
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  aria-label="Close report modal"
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: '#f5f5f7' }}
                >
                  <X className="h-4 w-4" style={{ color: '#1d1d1f' }} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="report-reason" style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: SF }}>
                    Reason
                  </label>
                  <select
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 11,
                      border: '1px solid #e0e0e0',
                      background: '#ffffff',
                      fontFamily: SF,
                      fontSize: 17,
                      color: '#1d1d1f',
                      padding: '10px 16px',
                      outline: 'none',
                    }}
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="report-desc" style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: SF }}>
                    Additional details (optional)
                  </label>
                  <textarea
                    id="report-desc"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={4}
                    placeholder="Tell the admin team what looks wrong."
                    style={{
                      width: '100%',
                      borderRadius: 11,
                      border: '1px solid #e0e0e0',
                      background: '#ffffff',
                      fontFamily: SF,
                      fontSize: 17,
                      color: '#1d1d1f',
                      padding: '10px 16px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 rounded-full transition-transform active:scale-95"
                    style={{ padding: '11px 22px', background: '#f5f5f7', color: '#333333', fontSize: 17, border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={isReporting}
                    className="flex-1 rounded-full text-white transition-transform active:scale-95"
                    style={{
                      padding: '11px 22px',
                      background: isReporting ? '#7a7a7a' : '#1d1d1f',
                      color: '#ffffff',
                      fontSize: 17,
                      border: 'none',
                      cursor: isReporting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isReporting ? 'Sending…' : 'Submit report'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
