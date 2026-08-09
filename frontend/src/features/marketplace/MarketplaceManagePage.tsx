import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { deleteListing, getMyListings, markAsSold, updateListing } from '../../api/marketplace';
import { ImageWithFallback } from '../../shared/components/ImageWithFallback';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  MarketplaceListing,
  formatPrice,
  formatMarketplaceTime,
} from './marketplace/marketplaceShared';

const SF = 'SF Pro Text, system-ui, -apple-system, sans-serif';
const SF_DISPLAY = 'SF Pro Display, system-ui, -apple-system, sans-serif';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return fallback;
}

type Tab = 'active' | 'sold';

type EditDraft = {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  location: string;
};

type EditErrors = Partial<Record<keyof EditDraft, string>>;

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 11,
  border: '1px solid #e0e0e0',
  background: '#ffffff',
  fontFamily: SF,
  fontSize: 17,
  letterSpacing: '-0.374px',
  color: '#1d1d1f',
  padding: '10px 16px',
  outline: 'none',
};

// ─── STYLES INJECTION ────────────────────────────────────────────────────────
const pageCss = `
  .app-canvas {
      position: relative;
      width: 100%;
      background-color: transparent; 
      display: flex;
      flex-direction: column;
      margin: 0 auto;
  }
  
  @media (min-width: 640px) {
    .app-canvas {
      max-width: 500px;
    }
  }

  /* 3. Dark Hero Section - Edge to Edge */
  .hero-dark-tile {
      background-color: #272729;
      width: auto;
      margin-left: -16px;
      margin-right: -16px;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
  }
  .hero-tag {
      color: #2997ff;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-family: "SF Pro Text", system-ui, sans-serif;
  }
  .hero-title {
      color: #ffffff;
      font-size: 40px;
      font-weight: 600;
      line-height: 1.1;
      letter-spacing: 0;
      font-family: "SF Pro Display", system-ui, sans-serif;
      margin: 0;
  }
  .hero-desc {
      color: #cccccc;
      font-size: 17px;
      line-height: 1.47;
      margin: 0;
      margin-bottom: 8px;
      font-family: "SF Pro Text", system-ui, sans-serif;
  }
  
  /* Primary Pill Button */
  .btn-primary {
      background-color: #0066cc;
      color: #ffffff;
      font-size: 17px;
      font-weight: 400;
      padding: 11px 22px;
      border-radius: 9999px;
      border: none;
      align-self: flex-start;
      cursor: pointer;
      font-family: "SF Pro Text", system-ui, sans-serif;
      transition: transform 0.2s;
  }
  .btn-primary:active {
      transform: scale(0.95);
  }

  /* Minimal Stats */
  .stats-row {
      display: flex;
      gap: 40px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.1);
  }
  .stat-item {
      display: flex;
      flex-direction: column;
  }
  .stat-num {
      color: #ffffff;
      font-size: 34px;
      font-weight: 600;
      font-family: "SF Pro Display", system-ui, sans-serif;
  }
  .stat-label {
      color: #7a7a7a;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: "SF Pro Text", system-ui, sans-serif;
  }

  /* 4. Filter Chips */
  .filter-row {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      padding: 24px 20px 24px 20px;
      overflow-x: auto;
      scrollbar-width: none;
  }
  .filter-row::-webkit-scrollbar { display: none; }
  
  .chip {
      background-color: #ffffff;
      color: #1d1d1f;
      font-size: 14px;
      padding: 12px 20px;
      border-radius: 9999px;
      border: 1px solid #e0e0e0;
      white-space: nowrap;
      cursor: pointer;
      font-family: "SF Pro Text", system-ui, sans-serif;
      transition: all 0.2s;
  }
  .chip.active {
      border: 2px solid #0071e3;
      padding: 11px 19px;
  }

  /* 5. Item Cards */
  .listings-feed {
      padding: 12px 20px 40px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
  }
  .listing-card {
      background-color: #ffffff;
      border-radius: 18px;
      border: 1px solid #e0e0e0;
      padding: 24px;
      display: flex;
      gap: 20px;
      position: relative;
      box-shadow: none !important;
  }
  
  .product-img-wrapper {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      border: none;
      overflow: visible;
  }
  
  .product-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(3px 5px 15px rgba(0, 0, 0, 0.22)); 
  }

  .product-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      min-width: 0;
      padding-right: 32px;
  }
  .product-title {
      font-size: 17px;
      font-weight: 600;
      color: #1d1d1f;
      font-family: "SF Pro Text", system-ui, sans-serif;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
  }
  .product-price {
      font-size: 17px;
      font-weight: 400;
      color: #1d1d1f;
      font-family: "SF Pro Text", system-ui, sans-serif;
  }
  .product-meta {
      font-size: 14px;
      color: #7a7a7a;
      margin-top: 4px;
      font-family: "SF Pro Text", system-ui, sans-serif;
  }

  .btn-options {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: rgba(210, 210, 215, 0.64);
      display: flex;
      justify-content: center;
      align-items: center;
      border: none;
      cursor: pointer;
      transition: transform 0.2s;
  }
  .btn-options:active {
      transform: scale(0.95);
  }
  .btn-options svg {
      fill: #1d1d1f;
  }

  /* 6. Footer Dense Links */
  .dense-footer {
      padding: 40px 24px;
      display: flex;
      justify-content: center;
      gap: 24px;
  }
  .dense-footer a {
      color: #0066cc;
      text-decoration: none;
      font-size: 14px;
      line-height: 2.41;
      font-family: "SF Pro Text", system-ui, sans-serif;
  }
`;

// ─── Modals ───────────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  open,
  listingTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  listingTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="w-full max-w-sm mx-4"
            style={{ background: '#ffffff', borderRadius: 20, padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
            role="dialog"
            aria-modal="true"
          >
            <h2 style={{ fontFamily: SF_DISPLAY, fontSize: 21, fontWeight: 600, color: '#1d1d1f', marginBottom: 8, margin: 0 }}>
              Delete listing?
            </h2>
            <p style={{ fontFamily: SF, fontSize: 17, lineHeight: 1.47, color: '#1d1d1f', marginBottom: 20, marginTop: 8 }}>
              This will permanently remove "{listingTitle}".
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-full transition-transform active:scale-95"
                style={{ padding: '11px 22px', background: '#f5f5f7', color: '#1d1d1f', fontFamily: SF, fontSize: 17, border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-full transition-transform active:scale-95"
                style={{ padding: '11px 22px', background: isDeleting ? '#e0e0e0' : '#1d1d1f', color: '#ffffff', fontFamily: SF, fontSize: 17, border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EditListingModal({
  open,
  listing,
  onClose,
  onSaved,
}: {
  open: boolean;
  listing: MarketplaceListing | null;
  onClose: () => void;
  onSaved: (updated: MarketplaceListing) => void;
}) {
  const [draft, setDraft] = useState<EditDraft>({
    title: '',
    description: '',
    category: 'Electronics',
    condition: 'Good',
    price: '',
    location: '',
  });
  const [errors, setErrors] = useState<EditErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (listing) {
      setDraft({
        title: listing.title || '',
        description: listing.description || '',
        category: listing.category || 'Electronics',
        condition: listing.condition || 'Good',
        price: listing.price != null ? String(listing.price) : '',
        location: listing.location || '',
      });
      setErrors({});
    }
  }, [listing]);

  function validate() {
    const errs: EditErrors = {};
    if (!draft.title.trim()) errs.title = 'Title is required.';
    if (!draft.description.trim()) errs.description = 'Description is required.';
    if (!draft.price.trim() || Number(draft.price) <= 0) errs.price = 'Enter a valid price greater than 0.';
    return errs;
  }

  async function handleSave() {
    if (!listing) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error('Please fix the highlighted errors.'); return; }
    setErrors({});
    setIsSaving(true);

    const { data, error } = await updateListing(listing.id, {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      condition: draft.condition,
      price: Number(draft.price),
      images: listing.images || [],
    });

    setIsSaving(false);
    if (error || !data) { toast.error(getErrorMessage(error, 'Could not save changes.')); return; }
    onSaved(data);
    onClose();
    toast.success('Changes saved.');
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto"
            style={{ background: '#ffffff', borderRadius: '24px 24px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e0e0e0' }}
            >
              <div>
                <h2 style={{ fontFamily: SF_DISPLAY, fontSize: 21, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>Edit listing</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: '#f5f5f7', border: 'none', cursor: 'pointer' }}
              >
                <X className="h-4 w-4" style={{ color: '#1d1d1f' }} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6 pb-8">
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: SF }}>Title *</label>
                <input
                  type="text"
                  value={draft.title}
                  maxLength={100}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  style={{ ...inputStyle, borderColor: errors.title ? '#1d1d1f' : '#e0e0e0' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: SF }}>Description *</label>
                <textarea
                  value={draft.description}
                  rows={4}
                  maxLength={2000}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical', borderColor: errors.description ? '#1d1d1f' : '#e0e0e0' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: SF }}>Category</label>
                  <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {MARKETPLACE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: SF }}>Condition</label>
                  <select value={draft.condition} onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {MARKETPLACE_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: SF }}>Price (₹) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draft.price}
                    onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value.replace(/[^0-9]/g, '') }))}
                    style={{ ...inputStyle, borderColor: errors.price ? '#1d1d1f' : '#e0e0e0' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full transition-transform active:scale-95"
                  style={{ padding: '11px 22px', background: '#f5f5f7', color: '#1d1d1f', fontFamily: SF, fontSize: 17, border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-full text-white transition-transform active:scale-95"
                  style={{ padding: '11px 22px', background: isSaving ? '#e0e0e0' : '#0066cc', color: '#ffffff', fontFamily: SF, fontSize: 17, border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BottomSheet({
  isOpen,
  onClose,
  listing,
  onView,
  onEdit,
  onMarkSold,
  onMarkAvailable,
  onDelete
}: {
  isOpen: boolean;
  onClose: () => void;
  listing: MarketplaceListing | null;
  onView: () => void;
  onEdit: () => void;
  onMarkSold: () => void;
  onMarkAvailable: () => void;
  onDelete: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && listing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md pb-8"
            style={{ background: '#ffffff', borderRadius: '24px 24px 0 0' }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 36, height: 5, borderRadius: 2.5, background: '#d2d2d7' }} />
            </div>
            <div className="px-6 py-4">
               <div className="flex flex-col">
                 <button onClick={() => { onClose(); onView(); }} style={{ padding: '16px 0', borderBottom: '1px solid #e0e0e0', textAlign: 'left', fontFamily: SF, fontSize: 17, color: '#1d1d1f', background: 'none', border: 'none', cursor: 'pointer' }}>View Listing</button>
                 <button onClick={() => { onClose(); onEdit(); }} style={{ padding: '16px 0', borderBottom: '1px solid #e0e0e0', textAlign: 'left', fontFamily: SF, fontSize: 17, color: '#1d1d1f', background: 'none', border: 'none', cursor: 'pointer' }}>Edit Listing</button>
                 {!listing.is_sold ? (
                   <button onClick={() => { onClose(); onMarkSold(); }} style={{ padding: '16px 0', borderBottom: '1px solid #e0e0e0', textAlign: 'left', fontFamily: SF, fontSize: 17, color: '#1d1d1f', background: 'none', border: 'none', cursor: 'pointer' }}>Mark as Sold</button>
                 ) : (
                   <button onClick={() => { onClose(); onMarkAvailable(); }} style={{ padding: '16px 0', borderBottom: '1px solid #e0e0e0', textAlign: 'left', fontFamily: SF, fontSize: 17, color: '#1d1d1f', background: 'none', border: 'none', cursor: 'pointer' }}>Relist Item</button>
                 )}
                 <button onClick={() => { onClose(); onDelete(); }} style={{ padding: '16px 0', textAlign: 'left', fontFamily: SF, fontSize: 17, color: '#1d1d1f', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MarketplaceManagePage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');

  const [pendingDelete, setPendingDelete] = useState<MarketplaceListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  
  const [bottomSheetListing, setBottomSheetListing] = useState<MarketplaceListing | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!profile?.id) return;
      setIsLoading(true);
      const { data, error } = await getMyListings(profile.id);
      if (!active) return;
      if (error) toast.error(getErrorMessage(error, 'Could not load your listings.'));
      setListings(data || []);
      setIsLoading(false);
    }
    load();
    return () => { active = false; };
  }, [profile?.id]);

  async function handleMarkSold(id: string) {
    setListings((cur) => cur.map((l) => l.id === id ? { ...l, is_sold: true } : l));
    const { error } = await markAsSold(id);
    if (error) {
      setListings((cur) => cur.map((l) => l.id === id ? { ...l, is_sold: false } : l));
      toast.error(getErrorMessage(error, 'Could not mark as sold.'));
      return;
    }
    toast.success('Listing marked as sold.');
  }

  async function handleMarkAvailable(id: string) {
    setListings((cur) => cur.map((l) => l.id === id ? { ...l, is_sold: false } : l));
    const { data, error } = await updateListing(id, { is_sold: false });
    if (error) {
      setListings((cur) => cur.map((l) => l.id === id ? { ...l, is_sold: true } : l));
      toast.error(getErrorMessage(error, 'Could not relist.'));
      return;
    }
    toast.success('Listing is now active again.');
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const { error } = await deleteListing(pendingDelete.id);
    setIsDeleting(false);
    if (error) { toast.error(getErrorMessage(error, 'Could not delete listing.')); return; }
    setListings((cur) => cur.filter((l) => l.id !== pendingDelete.id));
    setPendingDelete(null);
    toast.success('Listing deleted.');
  }

  const activeListings = listings.filter((l) => !l.is_sold);
  const soldListings = listings.filter((l) => l.is_sold);
  const displayedListings = tab === 'active' ? activeListings : soldListings;

  return (
    <>
      <style>{pageCss}</style>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        background: '#f5f5f7',
        minHeight: '100vh',
      }}>
        <div className="app-canvas">
          
          {/* Edge-to-Edge Dark Hero */}
          <section className="hero-dark-tile">
              <span className="hero-tag">Campus Marketplace</span>
              <h2 className="hero-title">My Listings</h2>
              <p className="hero-desc">Manage your campus marketplace items — edit prices, mark as sold, or delete.</p>
              
              <button 
                className="btn-primary" 
                onClick={() => navigate('/student/buy-sell?compose=1')}
              >
                + Post new listing
              </button>

              <div className="stats-row">
                  <div className="stat-item">
                      <span className="stat-num">{activeListings.length}</span>
                      <span className="stat-label">Active</span>
                  </div>
                  <div className="stat-item">
                      <span className="stat-num">{soldListings.length}</span>
                      <span className="stat-label">Sold</span>
                  </div>
              </div>
          </section>

          {/* Filter Chips */}
          <div className="filter-row">
              <div 
                className={`chip ${tab === 'active' ? 'active' : ''}`}
                onClick={() => setTab('active')}
              >
                Active ({activeListings.length})
              </div>
              <div 
                className={`chip ${tab === 'sold' ? 'active' : ''}`}
                onClick={() => setTab('sold')}
              >
                Sold ({soldListings.length})
              </div>
          </div>

          {/* Feed */}
          <div className="listings-feed">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="listing-card" style={{ opacity: 0.6 }}>
                    <div className="product-img-wrapper" style={{ background: '#e0e0e0', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                    <div className="product-info" style={{ flex: 1 }}>
                      <div style={{ height: 20, width: '70%', background: '#e0e0e0', borderRadius: 4, marginBottom: 8, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                      <div style={{ height: 16, width: '40%', background: '#e0e0e0', borderRadius: 4, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                    </div>
                  </div>
                ))
              ) : displayedListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7a7a7a', fontFamily: SF, fontSize: 17 }}>
                  {tab === 'active' ? 'No active listings. Post your first item to start selling!' : 'Nothing sold yet.'}
                </div>
              ) : (
                displayedListings.map(listing => (
                  <div className="listing-card" key={listing.id}>
                      <div className="product-img-wrapper">
                          {listing.images?.[0] ? (
                            <img src={listing.images[0]} alt="Product" className="product-img" />
                          ) : (
                            <div className="product-img" style={{ background: 'transparent' }} />
                          )}
                      </div>
                      
                      <div className="product-info">
                          <h3 className="product-title">{listing.title}</h3>
                          <span className="product-price">{formatPrice(listing.price)}</span>
                          <span className="product-meta">{listing.category} • {formatMarketplaceTime(listing.created_at)}</span>
                      </div>

                      <button 
                        className="btn-options"
                        onClick={() => setBottomSheetListing(listing)}
                      >
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="5" cy="12" r="2"/>
                            <circle cx="19" cy="12" r="2"/>
                          </svg>
                      </button>
                  </div>
                ))
              )}
          </div>

          {/* Clean Footer Links */}
          <footer className="dense-footer">
              <Link to="/student/buy-sell">Back to marketplace</Link>
              <Link to="/student/wishlist">Wishlist</Link>
              <Link to="/student/campus-exchange/messages">Messages</Link>
          </footer>
        </div>

        {/* Modals */}
        <BottomSheet
          isOpen={!!bottomSheetListing}
          onClose={() => setBottomSheetListing(null)}
          listing={bottomSheetListing}
          onView={() => {
            if (bottomSheetListing) navigate(`/student/buy-sell/${bottomSheetListing.id}`);
          }}
          onEdit={() => setEditingListing(bottomSheetListing)}
          onMarkSold={() => {
            if (bottomSheetListing) handleMarkSold(bottomSheetListing.id);
          }}
          onMarkAvailable={() => {
            if (bottomSheetListing) handleMarkAvailable(bottomSheetListing.id);
          }}
          onDelete={() => setPendingDelete(bottomSheetListing)}
        />

        <DeleteConfirmModal
          open={!!pendingDelete}
          listingTitle={pendingDelete?.title ?? ''}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
        
        <EditListingModal
          open={!!editingListing}
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={(updated) => {
            setListings((cur) => cur.map((l) => l.id === updated.id ? updated : l));
            setEditingListing(null);
          }}
        />
      </div>
    </>
  );
}
