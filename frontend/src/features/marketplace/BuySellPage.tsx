import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Heart, MessageCircle, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { AccessDenied } from '../../shared/components/AccessDenied';
import {
  createListing,
  getListings,
  getMyListings,
  getWishlistIds,
  toggleWishlist,
} from '../../api/marketplace';
import { ImageWithFallback } from '../../shared/components/ImageWithFallback';
import { UploadOverlay } from '../../shared/components/UploadOverlay';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  MARKETPLACE_SORT_OPTIONS,
  MarketplaceConditionBadge,
  MarketplaceEmptyState,
  MarketplaceListing,
  MarketplaceListingCard,
  MarketplaceListingCardSkeleton,
  MarketplaceSortOption,
  formatMarketplaceTime,
  formatPrice,
  sortListings,
} from './marketplace/marketplaceShared';

// ─── Types ───────────────────────────────────────────────────────────────────

type ListingDraft = {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  location: string;
};

type FormErrors = Partial<Record<keyof ListingDraft, string>>;

const INITIAL_DRAFT: ListingDraft = {
  title: '',
  description: '',
  category: 'Electronics',
  condition: 'Good',
  price: '',
  location: '',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return fallback;
}

// ─── Inline field error helper ───────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      className="mt-1 block text-[13px]"
      style={{ color: '#dc2626', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
    >
      {message}
    </span>
  );
}

// ─── Input styles (DESIGN.md search-input spec) ──────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 11,
  border: '1px solid #e0e0e0',
  background: '#ffffff',
  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
  fontSize: 17,
  letterSpacing: '-0.374px',
  color: '#1d1d1f',
  padding: '10px 16px',
  outline: 'none',
};

// ─── Create Listing Modal ─────────────────────────────────────────────────────

function CreateListingModal({
  open,
  draft,
  files,
  previewUrls,
  isSubmitting,
  photoProgress,
  errors,
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
  photoProgress: Record<number, number | 'done' | 'error'>;
  errors: FormErrors;
  onClose: () => void;
  onChange: (field: keyof ListingDraft, value: string) => void;
  onFilesChange: (nextFiles: File[]) => void;
  onSubmit: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name} is not an image.`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 10 MB limit.`);
        return false;
      }
      return true;
    });
    onFilesChange([...files, ...valid].slice(0, 5));
    // reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto"
            style={{
              background: '#ffffff',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
            // On sm+ screens, full rounding
            role="dialog"
            aria-modal="true"
            aria-label="Create a new listing"
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 sm:px-8"
              style={{
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    color: '#0066cc',
                  }}
                >
                  Campus Marketplace
                </div>
                <h2
                  style={{
                    fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '-0.374px',
                    color: '#1d1d1f',
                    marginTop: 2,
                  }}
                >
                  List an item
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95"
                style={{ background: '#f5f5f7', color: '#1d1d1f' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:grid-cols-[1.1fr_0.9fr] sm:px-8 sm:py-8">
              {/* Left — form fields */}
              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label
                    htmlFor="listing-title"
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1d1d1f',
                    }}
                  >
                    Title <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="listing-title"
                    type="text"
                    value={draft.title}
                    onChange={(e) => onChange('title', e.target.value)}
                    placeholder="MacBook Air M1, barely used"
                    maxLength={100}
                    aria-describedby={errors.title ? 'title-error' : undefined}
                    style={{
                      ...inputStyle,
                      borderColor: errors.title ? '#dc2626' : '#e0e0e0',
                    }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#0066cc'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.title ? '#dc2626' : '#e0e0e0'; }}
                  />
                  <FieldError message={errors.title} />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="listing-description"
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1d1d1f',
                    }}
                  >
                    Description <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    id="listing-description"
                    value={draft.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    rows={4}
                    placeholder="Add condition details, reason for selling, pickup preferences…"
                    maxLength={2000}
                    aria-describedby={errors.description ? 'desc-error' : undefined}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      borderColor: errors.description ? '#dc2626' : '#e0e0e0',
                    }}
                    onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = '#0066cc'; }}
                    onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = errors.description ? '#dc2626' : '#e0e0e0'; }}
                  />
                  <FieldError message={errors.description} />
                </div>

                {/* Category + Condition */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="listing-category"
                      style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
                    >
                      Category <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      id="listing-category"
                      value={draft.category}
                      onChange={(e) => onChange('category', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {MARKETPLACE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="listing-condition"
                      style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
                    >
                      Condition <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      id="listing-condition"
                      value={draft.condition}
                      onChange={(e) => onChange('condition', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {MARKETPLACE_CONDITIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price + Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="listing-price"
                      style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
                    >
                      Price (₹) <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      id="listing-price"
                      type="text"
                      inputMode="numeric"
                      value={draft.price}
                      onChange={(e) => onChange('price', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="25000"
                      aria-describedby={errors.price ? 'price-error' : undefined}
                      style={{ ...inputStyle, borderColor: errors.price ? '#dc2626' : '#e0e0e0' }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#0066cc'; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.price ? '#dc2626' : '#e0e0e0'; }}
                    />
                    <FieldError message={errors.price} />
                  </div>
                  <div>
                    <label
                      htmlFor="listing-location"
                      style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
                    >
                      Meetup location
                    </label>
                    <input
                      id="listing-location"
                      type="text"
                      value={draft.location}
                      onChange={(e) => onChange('location', e.target.value)}
                      placeholder="Boys Hostel Gate"
                      maxLength={120}
                      style={inputStyle}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#0066cc'; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#e0e0e0'; }}
                    />
                  </div>
                </div>
              </div>

              {/* Right — photos + preview + submit */}
              <div className="space-y-4">
                {/* Photo upload area */}
                <div>
                  <div
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1d1d1f',
                      fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                    }}
                  >
                    Photos ({files.length}/5)
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= 5}
                    className="flex w-full flex-col items-center justify-center gap-2 py-6 transition-all active:scale-95"
                    style={{
                      border: '1.5px dashed #e0e0e0',
                      borderRadius: 14,
                      background: '#f5f5f7',
                      cursor: files.length >= 5 ? 'not-allowed' : 'pointer',
                      opacity: files.length >= 5 ? 0.5 : 1,
                    }}
                    aria-label="Add photos"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: '#0066cc' }}
                    >
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <span
                      style={{
                        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1d1d1f',
                      }}
                    >
                      Add photos
                    </span>
                    <span style={{ fontSize: 12, color: '#7a7a7a' }}>Max 5 photos, 10 MB each</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Preview grid */}
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {previewUrls.map((url, i) => {
                      const progress = photoProgress[i];
                      const isDone = progress === 'done';
                      const isError = progress === 'error';
                      const isUploading = typeof progress === 'number';
                      return (
                        <div
                          key={`${url}-${i}`}
                          className="relative aspect-square overflow-hidden"
                          style={{ borderRadius: 10 }}
                        >
                          <ImageWithFallback src={url} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                          {url && (isUploading || isDone || isError) && (
                            <UploadOverlay
                              progress={typeof progress === 'number' ? progress : 100}
                              done={isDone}
                              error={isError}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            aria-label={`Remove photo ${i + 1}`}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Live preview card */}
                <div
                  style={{
                    borderRadius: 14,
                    background: '#f5f5f7',
                    padding: 16,
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7a7a', marginBottom: 8 }}>
                    Preview
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#0066cc', fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
                    {draft.price ? formatPrice(Number(draft.price)) : '₹—'}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginTop: 4 }}>
                    {draft.title || 'Your listing title'}
                  </div>
                  <div style={{ fontSize: 13, color: '#7a7a7a', marginTop: 4 }}>
                    {draft.category} · <MarketplaceConditionBadge condition={draft.condition} />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="w-full transition-transform active:scale-95"
                  style={{
                    padding: '14px 28px',
                    borderRadius: 9999,
                    background: isSubmitting ? '#7a7a7a' : '#0066cc',
                    color: '#ffffff',
                    fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                    fontSize: 18,
                    fontWeight: 300,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    border: 'none',
                  }}
                >
                  {isSubmitting
                    ? files.length > 0
                      ? 'Uploading photos…'
                      : 'Publishing…'
                    : `Publish${files.length ? ` (${files.length} photo${files.length > 1 ? 's' : ''})` : ''}`}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

type Filters = {
  minPrice: string;
  maxPrice: string;
  condition: string;
  sort: MarketplaceSortOption;
};

function FilterPanel({
  open,
  filters,
  onChange,
  onReset,
  onClose,
}: {
  open: boolean;
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 right-0 z-30 mt-2 sm:left-auto sm:right-0 sm:w-80"
          style={{
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: 20,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 600, color: '#1d1d1f' }}>
              Filters
            </span>
            <button type="button" onClick={onClose} aria-label="Close filters" className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#f5f5f7' }}>
              <X className="h-3.5 w-3.5" style={{ color: '#1d1d1f' }} />
            </button>
          </div>

          {/* Price range */}
          <div className="mb-4">
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7a7a', marginBottom: 8 }}>Price range (₹)</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => onChange('minPrice', e.target.value.replace(/[^0-9]/g, ''))}
                style={{ ...inputStyle, fontSize: 14 }}
                aria-label="Minimum price"
              />
              <span style={{ color: '#7a7a7a' }}>–</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => onChange('maxPrice', e.target.value.replace(/[^0-9]/g, ''))}
                style={{ ...inputStyle, fontSize: 14 }}
                aria-label="Maximum price"
              />
            </div>
          </div>

          {/* Condition */}
          <div className="mb-4">
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7a7a', marginBottom: 8 }}>Condition</div>
            <div className="flex flex-wrap gap-2">
              {['', 'New', 'Like New', 'Good', 'Fair', 'Used', 'For Parts'].map((c) => (
                <button
                  key={c || 'all'}
                  type="button"
                  onClick={() => onChange('condition', c)}
                  className="rounded-full px-3 py-1 text-[13px] font-medium transition-all active:scale-95"
                  style={{
                    border: filters.condition === c ? '2px solid #0066cc' : '1px solid #e0e0e0',
                    background: filters.condition === c ? '#f0f6ff' : '#f5f5f7',
                    color: filters.condition === c ? '#0066cc' : '#333333',
                  }}
                >
                  {c || 'Any'}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="mb-5">
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7a7a', marginBottom: 8 }}>Sort</div>
            <div className="flex flex-col gap-1.5">
              {MARKETPLACE_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange('sort', opt.value)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-medium transition-all"
                  style={{
                    background: filters.sort === opt.value ? '#f0f6ff' : 'transparent',
                    color: filters.sort === opt.value ? '#0066cc' : '#333333',
                  }}
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full border flex-shrink-0"
                    style={{
                      borderColor: filters.sort === opt.value ? '#0066cc' : '#e0e0e0',
                      background: filters.sort === opt.value ? '#0066cc' : 'transparent',
                    }}
                  >
                    {filters.sort === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-full py-2 text-[14px] font-medium transition-all active:scale-95"
            style={{ background: '#f5f5f7', color: '#7a7a7a', border: 'none' }}
          >
            Reset filters
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main BuySellPage ─────────────────────────────────────────────────────────

export function BuySellPage() {
  const location = useLocation();
  const { profile } = useAuthStore();
  const { hasAccess: hasMarketplaceAccess, isChecking: checkingMarketplaceAccess } = useFeatureAccess('marketplace_access');
  const { isAllowed } = useFeatureAccess(profile);

  // Data
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [filters, setFilters] = useState<Filters>({ minPrice: '', maxPrice: '', condition: '', sort: 'newest' });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Create listing modal
  const [showComposer, setShowComposer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState<ListingDraft>(INITIAL_DRAFT);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [photoProgress, setPhotoProgress] = useState<Record<number, number | 'done' | 'error'>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Load listings
  useEffect(() => {
    let active = true;
    async function load() {
      if (!profile?.id) return;
      setIsLoading(true);
      setError(null);

      const [listingResult, myListingResult, wishlistResult] = await Promise.all([
        getListings({ category, searchTerm }),
        getMyListings(profile.id),
        getWishlistIds(profile.id),
      ]);

      if (!active) return;

      if (listingResult.error) {
        setError(getErrorMessage(listingResult.error, 'Could not load marketplace listings.'));
      } else {
        setListings(listingResult.data || []);
      }

      if (!myListingResult.error) setMyListings(myListingResult.data || []);
      if (!wishlistResult.error) setWishlistIds(wishlistResult.data || []);
      setIsLoading(false);
    }

    load();
    return () => { active = false; };
  }, [category, profile?.id, searchTerm]);

  // Preview URLs for file upload
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  // Open composer from URL param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('compose') === '1') setShowComposer(true);
  }, [location.search]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!showFilterPanel) return;
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterPanel]);

  // Derived
  const activeListingsCount = useMemo(() => myListings.filter((l) => !l.is_sold).length, [myListings]);
  const soldListingsCount = useMemo(() => myListings.filter((l) => l.is_sold).length, [myListings]);

  const displayedListings = useMemo(() => {
    let result = [...listings];
    if (filters.minPrice) result = result.filter((l) => l.price >= Number(filters.minPrice));
    if (filters.maxPrice) result = result.filter((l) => l.price <= Number(filters.maxPrice));
    if (filters.condition) result = result.filter((l) => l.condition === filters.condition);
    return sortListings(result, filters.sort);
  }, [listings, filters]);

  const hasActiveFilters = filters.minPrice || filters.maxPrice || filters.condition || filters.sort !== 'newest';

  // Auth / access guard
  if (checkingMarketplaceAccess) {
    return (
      <div className="min-h-screen" style={{ background: '#f5f5f7', padding: '32px 24px' }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <MarketplaceListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasMarketplaceAccess) {
    return <AccessDenied feature="Marketplace" />;
  }

  // Handlers
  async function handleToggleWishlist(listingId: string) {
    if (!profile?.id) { toast.error('Please log in to use wishlist.'); return; }
    const currentlyWished = wishlistIds.includes(listingId);
    setWishlistIds((cur) => currentlyWished ? cur.filter((id) => id !== listingId) : [...cur, listingId]);
    const { data, error } = await toggleWishlist(profile.id, listingId);
    if (error) {
      setWishlistIds((cur) => currentlyWished ? [...cur, listingId] : cur.filter((id) => id !== listingId));
      toast.error(getErrorMessage(error, 'Could not update wishlist.'));
      return;
    }
    toast.success(data?.wished ? 'Saved to wishlist.' : 'Removed from wishlist.');
  }

  function validateDraft(): FormErrors {
    const errs: FormErrors = {};
    if (!draft.title.trim()) errs.title = 'Title is required.';
    else if (draft.title.trim().length < 5) errs.title = 'Title must be at least 5 characters.';
    if (!draft.description.trim()) errs.description = 'Description is required.';
    else if (draft.description.trim().length < 10) errs.description = 'Description must be at least 10 characters.';
    if (!draft.price.trim()) errs.price = 'Price is required.';
    else if (Number(draft.price) <= 0) errs.price = 'Price must be greater than 0.';
    else if (Number(draft.price) > 10000000) errs.price = 'Price seems too high.';
    return errs;
  }

  async function handleCreateListing() {
    if (!profile?.id) { toast.error('Please log in again before posting.'); return; }
    if (!isAllowed('listing_creation')) { toast.error('Listing creation is currently restricted for your account.'); return; }

    const errs = validateDraft();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      toast.error('Please fix the highlighted errors.');
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);

    // Show visual progress for each file slot
    if (files.length > 0) {
      const init: Record<number, number> = {};
      files.forEach((_, i) => { init[i] = 0; });
      setPhotoProgress(init);
      // Simulate progress animation while uploading
      let pct = 0;
      const ticker = setInterval(() => {
        pct = Math.min(pct + 12, 90);
        setPhotoProgress(Object.fromEntries(files.map((_, i) => [i, pct])));
      }, 250);
      setTimeout(() => clearInterval(ticker), 3500);
    }

    const { data, error } = await createListing(
      {
        seller_id: profile.id,
        title: draft.title.trim(),
        description:
          draft.description.trim() +
          (draft.location.trim() ? '\n\nMeetup: ' + draft.location.trim() : ''),
        category: draft.category,
        condition: draft.condition,
        price: Number(draft.price),
        college: profile.college,
      },
      files
    );

    // Mark all uploads done
    if (files.length > 0) {
      setPhotoProgress(Object.fromEntries(files.map((_, i) => [i, 'done'])));
    }

    setIsSubmitting(false);

    if (error) {
      // Roll back progress UI
      setPhotoProgress({});
      toast.error(getErrorMessage(error, 'Could not publish listing.'));
      return;
    }

    setListings((cur) => (data ? [data, ...cur] : cur));
    setMyListings((cur) => (data ? [data, ...cur] : cur));
    setShowComposer(false);
    setDraft(INITIAL_DRAFT);
    setFiles([]);
    setPhotoProgress({});
    setFormErrors({});
    toast.success('Listing published! 🎉');
  }

  function openComposer() {
    if (!isAllowed('listing_creation')) {
      toast.error('Listing creation is currently restricted for your account.');
      return;
    }
    setShowComposer(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
      <div
        className="mx-auto max-w-7xl space-y-4 px-4 pb-24 pt-6 sm:px-6 lg:px-8"
        style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
      >
        {/* ── Hero tile (light canvas) ───────────────────────────────── */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: 18,
            padding: '40px 32px',
          }}
        >
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
            <div>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: '#0066cc',
                  marginBottom: 12,
                }}
              >
                Campus Blink Marketplace
              </div>
              <h1
                style={{
                  fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
                  fontSize: 'clamp(32px, 5vw, 56px)',
                  fontWeight: 600,
                  lineHeight: 1.07,
                  letterSpacing: '-0.28px',
                  color: '#1d1d1f',
                  margin: 0,
                }}
              >
                Buy smart.<br />Sell fast.
              </h1>
              <p
                style={{
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  fontSize: 17,
                  fontWeight: 400,
                  lineHeight: 1.47,
                  letterSpacing: '-0.374px',
                  color: '#7a7a7a',
                  marginTop: 12,
                  maxWidth: 480,
                }}
              >
                A clean campus marketplace for gadgets, textbooks, furniture, and quick hostel pickups.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {/* Primary CTA — button-primary spec */}
                <button
                  type="button"
                  id="sell-now-btn"
                  onClick={openComposer}
                  className="inline-flex items-center gap-2 transition-transform active:scale-95"
                  style={{
                    padding: '11px 22px',
                    borderRadius: 9999,
                    background: '#0066cc',
                    color: '#ffffff',
                    fontSize: 17,
                    fontWeight: 400,
                    letterSpacing: '-0.374px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.2} />
                  Sell Now
                </button>

                {/* Ghost pill — button-secondary-pill spec */}
                <Link
                  to="/student/campus-exchange/messages"
                  className="inline-flex items-center gap-2 transition-transform active:scale-95"
                  style={{
                    padding: '11px 22px',
                    borderRadius: 9999,
                    background: '#ffffff',
                    color: '#0066cc',
                    fontSize: 17,
                    fontWeight: 400,
                    border: '1px solid #0066cc',
                    letterSpacing: '-0.374px',
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Messages
                </Link>

                <Link
                  to="/student/wishlist"
                  className="inline-flex items-center gap-2 transition-transform active:scale-95"
                  style={{
                    padding: '11px 22px',
                    borderRadius: 9999,
                    background: '#f5f5f7',
                    color: '#333333',
                    fontSize: 17,
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <Heart className="h-4 w-4" />
                  Wishlist
                </Link>

                <Link
                  to="/student/buy-sell/manage"
                  className="inline-flex items-center gap-2 transition-transform active:scale-95"
                  style={{
                    padding: '11px 22px',
                    borderRadius: 9999,
                    background: '#f5f5f7',
                    color: '#333333',
                    fontSize: 17,
                    border: '1px solid #e0e0e0',
                  }}
                >
                  My Listings
                </Link>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div
                style={{
                  borderRadius: 14,
                  background: '#f0f6ff',
                  border: '1px solid #cce0ff',
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0066cc' }}>Active listings</div>
                <div style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', fontSize: 40, fontWeight: 600, color: '#1d1d1f', marginTop: 8, lineHeight: 1 }}>{activeListingsCount}</div>
                <div style={{ fontSize: 13, color: '#7a7a7a', marginTop: 4 }}>Items currently on campus</div>
              </div>
              <div
                style={{
                  borderRadius: 14,
                  background: '#f5f5f7',
                  border: '1px solid #e0e0e0',
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7a7a7a' }}>Sold</div>
                <div style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', fontSize: 40, fontWeight: 600, color: '#1d1d1f', marginTop: 8, lineHeight: 1 }}>{soldListingsCount}</div>
                <div style={{ fontSize: 13, color: '#7a7a7a', marginTop: 4 }}>Listings closed</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Search + filter tile (parchment) ──────────────────────── */}
        <section
          style={{
            background: '#f5f5f7',
            border: '1px solid #e0e0e0',
            borderRadius: 18,
            padding: '20px 24px',
          }}
        >
          {/* Search row */}
          <div className="flex gap-3">
            {/* search-input spec: pill shape, 44px height, 1px rgba(0,0,0,0.08) border */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#7a7a7a' }} />
              <input
                id="marketplace-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search campus listings…"
                aria-label="Search marketplace listings"
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 9999,
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#ffffff',
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  fontSize: 17,
                  letterSpacing: '-0.374px',
                  color: '#1d1d1f',
                  paddingLeft: 44,
                  paddingRight: 16,
                  outline: 'none',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.border = '1px solid #0066cc'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.border = '1px solid rgba(0,0,0,0.08)'; }}
              />
            </div>

            {/* Filter button — button-dark-utility spec */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                id="filter-btn"
                onClick={() => setShowFilterPanel((v) => !v)}
                aria-expanded={showFilterPanel}
                aria-controls="filter-panel"
                className="flex h-11 items-center gap-2 transition-transform active:scale-95"
                style={{
                  padding: '8px 15px',
                  borderRadius: 8,
                  background: hasActiveFilters ? '#0066cc' : '#1d1d1f',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 400,
                  letterSpacing: '-0.224px',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {hasActiveFilters ? 'Filtered' : 'Filter'}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div id="filter-panel">
                <FilterPanel
                  open={showFilterPanel}
                  filters={filters}
                  onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
                  onReset={() => setFilters({ minPrice: '', maxPrice: '', condition: '', sort: 'newest' })}
                  onClose={() => setShowFilterPanel(false)}
                />
              </div>
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
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

        {/* ── Listings grid (white canvas) ───────────────────────────── */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: 18,
            padding: '24px',
          }}
        >
          {/* Section header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0066cc', marginBottom: 4 }}>
                {category === 'all' ? 'All listings' : category}
              </div>
              <div style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', fontSize: 21, fontWeight: 600, color: '#1d1d1f' }}>
                {isLoading ? 'Loading…' : `${displayedListings.length} listing${displayedListings.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>

          {/* Error state */}
          {error && !isLoading && (
            <div
              className="flex flex-col items-center py-12 text-center"
              style={{ border: '1.5px dashed #fca5a5', borderRadius: 14, background: '#fff5f5' }}
            >
              <p style={{ fontSize: 17, color: '#dc2626' }}>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full px-5 py-2.5 text-sm font-medium text-white active:scale-95"
                style={{ background: '#dc2626' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && !error && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <MarketplaceListingCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && displayedListings.length === 0 && (
            <MarketplaceEmptyState
              title="No listings found"
              description={searchTerm || category !== 'all'
                ? 'Try broadening your search or switching categories.'
                : 'Be the first to post something on campus.'}
              action={
                <button
                  type="button"
                  onClick={openComposer}
                  className="inline-flex items-center gap-2 rounded-full text-white transition-transform active:scale-95"
                  style={{ padding: '11px 22px', background: '#0066cc', fontSize: 17, border: 'none', cursor: 'pointer' }}
                >
                  <Plus className="h-4 w-4" />
                  Post a listing
                </button>
              }
            />
          )}

          {/* Cards */}
          {!isLoading && !error && displayedListings.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedListings.map((listing) => (
                <MarketplaceListingCard
                  key={listing.id}
                  listing={listing}
                  wished={wishlistIds.includes(listing.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── FAB — button-dark-utility style, pill ─────────────────────── */}
      <button
        type="button"
        id="fab-sell-now"
        onClick={openComposer}
        className="fixed z-40 flex items-center gap-2 transition-all active:scale-95 md:hidden"
        style={{
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          right: 16,
          padding: '12px 20px',
          borderRadius: 9999,
          background: '#1d1d1f',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
        aria-label="Post a new marketplace listing"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
        Sell
      </button>

      {/* ── Create listing modal ──────────────────────────────────────── */}
      <CreateListingModal
        open={showComposer}
        draft={draft}
        files={files}
        previewUrls={previewUrls}
        isSubmitting={isSubmitting}
        photoProgress={photoProgress}
        errors={formErrors}
        onClose={() => { setShowComposer(false); setFormErrors({}); }}
        onChange={(field, value) => {
          setDraft((cur) => ({ ...cur, [field]: value }));
          if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }}
        onFilesChange={setFiles}
        onSubmit={handleCreateListing}
      />
    </div>
  );
}
