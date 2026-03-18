import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { deleteListing, getMyListings, markAsSold } from '../../api/marketplace';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatMarketplaceTime, formatPrice, getListingImage, MarketplaceListing } from './marketplace/marketplaceShared';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

export const MarketplaceManagePage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!profile?.id) return;
      setIsLoading(true);
      const { data, error } = await getMyListings(profile.id);
      if (!active) return;
      if (error) toast.error(getErrorMessage(error, 'Could not load your listings.'));
      setMyListings(data || []);
      setIsLoading(false);
    }
    load();
    return () => { active = false; };
  }, [profile?.id]);

  const activeCount = useMemo(() => myListings.filter((listing) => !listing.is_sold).length, [myListings]);
  const soldCount = useMemo(() => myListings.filter((listing) => listing.is_sold).length, [myListings]);

  const handleMarkSold = async (listingId: string) => {
    const { error } = await markAsSold(listingId);
    if (error) {
      toast.error(getErrorMessage(error, 'Could not mark listing as sold.'));
      return;
    }
    setMyListings((current) => current.map((item) => item.id === listingId ? { ...item, is_sold: true } : item));
    toast.success('Listing marked as sold.');
  };

  const handleDelete = async (listingId: string) => {
    const confirmed = window.confirm('Delete this listing? This cannot be undone.');
    if (!confirmed) return;
    const { error } = await deleteListing(listingId);
    if (error) {
      toast.error(getErrorMessage(error, 'Could not delete listing.'));
      return;
    }
    setMyListings((current) => current.filter((item) => item.id !== listingId));
    toast.success('Listing deleted.');
  };

  return (
    <div className="min-h-full bg-[#FAFAF8] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-[980px] space-y-5">
        <section className="rounded-[20px] border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(13,13,13,0.06)]">
          <h1 className="font-syne text-3xl font-extrabold tracking-tight text-[#0D0D0D]">Manage your listings</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">Track live listings, sold items, and remove old posts.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-md bg-[#FFF6CC] px-3 py-1.5 text-sm font-semibold text-[#5A4A00]">Active: {activeCount}</span>
            <span className="rounded-md bg-[#F2F0EA] px-3 py-1.5 text-sm font-semibold text-[#0D0D0D]">Sold: {soldCount}</span>
            <Link to="/student/buy-sell" className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-semibold text-[#0D0D0D] hover:bg-[#F5F4F0]">Back to Buy & Sell</Link>
          </div>
        </section>

        <section className="rounded-[20px] border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(13,13,13,0.06)]">
          {isLoading ? (
            <p className="text-sm text-[#6B6B6B]">Loading your listings...</p>
          ) : myListings.length === 0 ? (
            <p className="text-sm text-[#6B6B6B]">No listings yet.</p>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => (
                <article key={listing.id} className="rounded-[12px] border border-[#E8E8E8] bg-[#FFFCF5] p-4">
                  <div className="flex gap-3">
                    <ImageWithFallback src={getListingImage(listing)} alt={listing.title} className="h-20 w-20 rounded-[12px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black tracking-tight text-[#0D0D0D]">{formatPrice(listing.price)}</p>
                          <p className="line-clamp-1 text-sm font-semibold text-[#222]">{listing.title}</p>
                          {listing.is_admin_disabled ? (
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#DC2626]">Disabled by admin</p>
                          ) : null}
                        </div>
                        <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${listing.is_sold ? 'bg-[#0D0D0D] text-white' : 'bg-[#FFF0A3] text-[#5A4A00]'}`}>
                          {listing.is_sold ? 'Sold' : 'Live'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6B6B6B]">Updated {formatMarketplaceTime(listing.updated_at || listing.created_at)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!listing.is_sold ? (
                          <button onClick={() => handleMarkSold(listing.id)} className="rounded-md bg-[#0D0D0D] px-3 py-1.5 text-xs font-semibold text-white">Mark sold</button>
                        ) : null}
                        <button onClick={() => handleDelete(listing.id)} className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#0D0D0D]">Delete</button>
                        <Link to={`/student/buy-sell/${listing.id}`} className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#0D0D0D]">View</Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
