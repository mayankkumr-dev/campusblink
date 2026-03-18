import { Heart, MapPin, MessageCircle, Star } from 'lucide-react';
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { ImageWithFallback } from '../figma/ImageWithFallback';

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

export const MARKETPLACE_CATEGORIES = [
  'Electronics',
  'Furniture',
  'Books',
  'Fashion',
  'Sports',
  'Hostel',
  'Accessories',
  'Vehicles',
  'Other',
];

export const MARKETPLACE_CONDITIONS = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Used',
];

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
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function getListingImage(listing?: Partial<MarketplaceListing> | null) {
  if (Array.isArray(listing?.images) && listing.images.length > 0) {
    return listing.images[0];
  }

  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';
}

export function getProfileName(profile?: MarketplaceProfile | null) {
  return profile?.name || profile?.username || 'Campus Blink User';
}

export function getInitials(name?: string | null) {
  if (!name) return 'CB';
  const segments = name.split(' ').filter(Boolean).slice(0, 2);
  return segments.map((segment) => segment[0]?.toUpperCase()).join('') || 'CB';
}

export function MarketplaceAvatar({ profile, size = 'md' }: { profile?: MarketplaceProfile | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-14 w-14 text-base' : 'h-11 w-11 text-sm';

  if (profile?.avatar_url) {
    return (
      <ImageWithFallback
        src={profile.avatar_url}
        alt={getProfileName(profile)}
        className={`${sizeClass} rounded-md object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div className={`${sizeClass} flex items-center justify-center rounded-md bg-[#0D0D0D] text-white ring-2 ring-white`}>
      {getInitials(getProfileName(profile))}
    </div>
  );
}

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
    <Link
      to={`/student/buy-sell/${listing.id}`}
      className="group block w-full overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_14px_34px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(0,0,0,0.12)]"
    >
      <div className="relative aspect-[1.05/1] overflow-hidden bg-[#F3EFE5]">
        <ImageWithFallback
          src={getListingImage(listing)}
          alt={listing.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleWishlist?.(listing.id);
          }}
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/90 text-[#0D0D0D] shadow-md "
        >
          <Heart className={`h-5 w-5 ${wished ? 'fill-[#FFD600] text-[#FFD600]' : ''}`} />
        </button>
        {listing.is_sold ? (
          <div className="absolute left-4 top-4 rounded-md bg-[#0D0D0D] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
            Sold
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="listing-price text-2xl font-black tracking-tight text-[#0D0D0D]">{formatPrice(listing.price)}</div>
            <h3 className="card-title listing-title mt-1 line-clamp-2 text-base font-semibold text-[#141414]">{listing.title}</h3>
          </div>
          <div className="listing-category-badge rounded-md bg-[#FFF5BF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A4A00]">
            {listing.condition || 'Good'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-[#5B584F]">
          <span className="listing-category-badge rounded-md bg-[#F7F3EA] px-3 py-1">{listing.category || 'Other'}</span>
          {listing.location ? <span className="listing-category-badge rounded-md bg-[#F7F3EA] px-3 py-1">{listing.location}</span> : null}
        </div>

        <div className="flex items-center justify-between text-sm text-[#5B584F]">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{listing.location || listing.seller_profile?.college || 'On campus'}</span>
          </div>
          <span className="activity-date">{formatMarketplaceTime(listing.created_at)}</span>
        </div>

        <div className="flex items-center justify-between border-t border-black/6 pt-4">
          <div className="flex items-center gap-3">
            <MarketplaceAvatar profile={listing.seller_profile} size="sm" />
            <div>
              <div className="seller-name text-sm font-semibold text-[#111111]">{getProfileName(listing.seller_profile)}</div>
              <div className="text-xs text-[#6A675F]">{listing.seller_profile?.college || 'Campus Blink'}</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md bg-[#0D0D0D] px-3 py-2 text-xs font-semibold text-white">
            <MessageCircle className="h-3.5 w-3.5" />
            Chat
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MarketplaceSectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_14px_32px_rgba(0,0,0,0.06)] sm:p-7">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7C6C20]">{eyebrow}</div>
        <h2 className="mt-2 text-[30px] font-black tracking-tight text-[#0D0D0D]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

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
    <div className="rounded-[28px] border border-dashed border-black/12 bg-[#FFFCF2] px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-[#FFD600] text-[#0D0D0D]">
        <Star className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-black tracking-tight text-[#0D0D0D]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5F5B52]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
