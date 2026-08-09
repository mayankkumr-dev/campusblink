import { Heart, MessageCircle, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { ImageWithFallback } from '../../../shared/components/ImageWithFallback';

// ─── Types ──────────────────────────────────────────────────────────────────

export type MarketplaceProfile = {
  id?: string;
  name?: string;
  avatar_url?: string | null;
  username?: string | null;
  college?: string | null;
  created_at?: string;
};

export type MarketplaceListing = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  category?: string | null;
  condition?: string | null;
  location?: string | null;
  images?: string[] | null;
  created_at?: string;
  updated_at?: string;
  is_sold?: boolean;
  is_admin_disabled?: boolean;
  disabled_reason?: string | null;
  seller_id: string;
  views_count?: number;
  seller_listing_count?: number;
  seller_profile?: MarketplaceProfile | null;
};

export type MarketplaceConversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  last_message?: string | null;
  last_message_at?: string | null;
  buyer_unread?: number;
  seller_unread?: number;
  listing?: MarketplaceListing | null;
  buyer?: MarketplaceProfile | null;
  seller?: MarketplaceProfile | null;
};

export type MarketplaceMessage = {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  message?: string | null;
  message_type?: 'text' | 'image' | 'offer' | string;
  image_url?: string | null;
  offer_amount?: number | null;
  offer_status?: 'pending' | 'accepted' | 'rejected' | null;
  is_read?: boolean;
  created_at?: string;
  sender?: MarketplaceProfile | null;
  receiver?: MarketplaceProfile | null;
};

// ─── Constants ──────────────────────────────────────────────────────────────

export const MARKETPLACE_CATEGORIES = [
  'Electronics',
  'Textbooks',
  'Furniture',
  'Clothing',
  'Hostel Supplies',
  'Tickets & Events',
  'Vehicles',
  'Sports',
  'Other',
];

export const MARKETPLACE_CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used', 'For Parts'];

export const MARKETPLACE_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
] as const;

export type MarketplaceSortOption = (typeof MARKETPLACE_SORT_OPTIONS)[number]['value'];

// ─── Utilities ───────────────────────────────────────────────────────────────

export function formatPrice(value?: number | null) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatMarketplaceTime(value?: string | null) {
  if (!value) return 'Just now';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return 'Just now';
  }
}

export function getListingImage(listing?: Partial<MarketplaceListing> | null) {
  if (Array.isArray(listing?.images) && listing!.images!.length > 0) {
    return listing!.images![0];
  }
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';
}

export function getProfileName(profile?: MarketplaceProfile | null) {
  return profile?.name || profile?.username || 'Campus Blink User';
}

export function getInitials(name?: string | null) {
  if (!name) return 'CB';
  const segments = name.split(' ').filter(Boolean).slice(0, 2);
  return segments.map((s) => s[0]?.toUpperCase()).join('') || 'CB';
}

export function sortListings(listings: MarketplaceListing[], sort: MarketplaceSortOption): MarketplaceListing[] {
  const copy = [...listings];
  if (sort === 'price_asc') return copy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (sort === 'price_desc') return copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  return copy;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

export function MarketplaceAvatar({
  profile,
  size = 'md',
}: {
  profile?: MarketplaceProfile | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs';

  if (profile?.avatar_url) {
    return (
      <ImageWithFallback
        src={profile.avatar_url}
        alt={getProfileName(profile)}
        className={`${sizeClass} aspect-square flex-shrink-0 rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex aspect-square flex-shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white`}
      style={{ backgroundColor: '#1d1d1f' }}
    >
      {getInitials(getProfileName(profile))}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export function MarketplaceStatusBadge({ listing }: { listing: Pick<MarketplaceListing, 'is_sold'> }) {
  if (listing.is_sold) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
        style={{ background: '#f0f0f0', color: '#7a7a7a' }}
      >
        Sold
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}
    >
      Available
    </span>
  );
}

export function MarketplaceConditionBadge({ condition }: { condition?: string | null }) {
  if (!condition) return null;
  const map: Record<string, { bg: string; color: string }> = {
    New: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
    'Like New': { bg: 'rgba(20,184,166,0.12)', color: '#0d9488' },
    Good: { bg: 'rgba(59,130,246,0.10)', color: '#2563eb' },
    Fair: { bg: 'rgba(234,179,8,0.12)', color: '#b45309' },
    Used: { bg: 'rgba(107,114,128,0.10)', color: '#4b5563' },
    'For Parts': { bg: 'rgba(239,68,68,0.10)', color: '#dc2626' },
  };
  const style = map[condition] ?? { bg: '#f0f0f0', color: '#7a7a7a' };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: style.bg, color: style.color }}
    >
      {condition}
    </span>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

export function MarketplaceListingCard({
  listing,
  wished = false,
  onToggleWishlist,
}: {
  listing: MarketplaceListing;
  wished?: boolean;
  onToggleWishlist?: (listingId: string) => void;
}) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18 }}
    >
      <Link to={`/student/buy-sell/${listing.id}`} className="relative block aspect-[4/3] overflow-hidden">
        <ImageWithFallback
          src={getListingImage(listing)}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          style={{ boxShadow: 'rgba(0,0,0,0.22) 3px 5px 30px 0px' }}
        />
        {listing.is_sold && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <span
              className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white"
              style={{ background: '#1d1d1f' }}
            >
              Sold
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <MarketplaceConditionBadge condition={listing.condition} />
        </div>
        <button
          type="button"
          aria-label={wished ? 'Remove from saved' : 'Save listing'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWishlist?.(listing.id);
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform active:scale-90"
          style={{ border: '1px solid #e0e0e0' }}
        >
          <Heart
            className="h-4 w-4"
            style={{ color: wished ? '#ef4444' : '#7a7a7a' }}
            fill={wished ? '#ef4444' : 'none'}
          />
        </button>
      </Link>

      <div style={{ padding: 24 }} className="flex flex-1 flex-col gap-2">
        <Link to={`/student/buy-sell/${listing.id}`} className="block min-w-0">
          <div
            className="line-clamp-2 leading-snug"
            style={{
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '-0.374px',
              color: '#1d1d1f',
            }}
          >
            {listing.title}
          </div>
        </Link>

        <div
          style={{
            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.374px',
            color: '#0066cc',
          }}
        >
          {formatPrice(listing.price)}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {listing.category && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: '#f5f5f7', color: '#7a7a7a' }}
            >
              {listing.category}
            </span>
          )}
          <span className="text-[12px]" style={{ color: '#7a7a7a' }}>
            {formatMarketplaceTime(listing.created_at)}
          </span>
        </div>

        <div
          className="mt-auto flex items-center justify-between gap-2 pt-2"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MarketplaceAvatar profile={listing.seller_profile} size="sm" />
            <span className="truncate text-[13px] font-medium" style={{ color: '#333333' }}>
              {getProfileName(listing.seller_profile)}
            </span>
          </div>
          <Link
            to={`/student/buy-sell/${listing.id}`}
            className="flex flex-shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white transition-transform active:scale-95"
            style={{ background: '#0066cc' }}
            aria-label={`View listing: ${listing.title}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Section Container ────────────────────────────────────────────────────────

export function MarketplaceSectionCard({
  title,
  eyebrow,
  children,
  variant = 'light',
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  variant?: 'light' | 'parchment';
}) {
  return (
    <section
      style={{
        background: variant === 'parchment' ? '#f5f5f7' : '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: 18,
        padding: '32px 24px',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: '#0066cc',
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: '-0.374px',
            color: '#1d1d1f',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function MarketplaceEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      style={{ border: '1.5px dashed #e0e0e0', borderRadius: 18 }}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: '#f5f5f7' }}>
        <ShoppingBag className="h-7 w-7" style={{ color: '#7a7a7a' }} />
      </div>
      <h3
        style={{
          fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
          fontSize: 21,
          fontWeight: 600,
          letterSpacing: '0.231px',
          color: '#1d1d1f',
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
          fontSize: 17,
          lineHeight: 1.47,
          letterSpacing: '-0.374px',
          color: '#7a7a7a',
          maxWidth: 380,
        }}
      >
        {description}
      </p>
      {action && <div style={{ marginTop: 24 }}>{action}</div>}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function MarketplaceListingCardSkeleton() {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 18, overflow: 'hidden' }}>
      <div className="aspect-[4/3] animate-pulse" style={{ background: '#f5f5f7' }} />
      <div style={{ padding: 24 }} className="space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
        <div className="h-4 w-1/2 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
        <div className="h-3 w-1/3 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
        <div className="mt-4 flex items-center justify-between">
          <div className="h-7 w-7 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
          <div className="h-7 w-16 animate-pulse rounded-full" style={{ background: '#f5f5f7' }} />
        </div>
      </div>
    </div>
  );
}
