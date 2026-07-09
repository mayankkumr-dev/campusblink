import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, FileText, Loader2, Plus, RotateCcw, Shield, Store, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import {
  calculatePrintCost,
  completeReorderRequest,
  createPrintOrder,
  getReorderRequestById,
  uploadPrintFile,
} from '../../api/print';

export const PrintReorderPage: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const profile = useAuthStore(state => state.profile);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, setRequest] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [hasBinding, setHasBinding] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mockedPagesPerFile = 17;

  useEffect(() => {
    async function loadRequest() {
      if (!profile?.id || !orderId) return;
      setIsLoading(true);
      const { data, error } = await getReorderRequestById(orderId, profile.id);

      if (error) {
        toast.error('Unable to load reorder request.');
        navigate('/student/print');
        return;
      }

      if (!data) {
        toast.error('This reorder request is not available anymore.');
        navigate('/student/print');
        return;
      }

      setRequest(data);
      setCopies(data.copies || 1);
      setColorMode(data.is_color ? 'color' : 'bw');
      setIsDoubleSided(Boolean(data.is_double_sided));
      setHasBinding(Boolean(data.has_binding));
      setOrientation(data.special_notes?.toLowerCase().includes('landscape') ? 'landscape' : 'portrait');
      setIsLoading(false);
    }

    loadRequest();
  }, [profile?.id, orderId, navigate]);

  const calculateDisplayTotal = useMemo(() => {
    if (!request) return 0;
    const perPage = colorMode === 'color'
      ? (request?.print_shops?.color_price_per_page || 5)
      : (request?.print_shops?.bw_price_per_page || 1);

    let base = mockedPagesPerFile * copies * perPage;
    if (isDoubleSided) base = base * 0.8;
    if (hasBinding) base += request?.print_shops?.binding_charge || 0;
    return Math.ceil(base);
  }, [request, colorMode, copies, isDoubleSided, hasBinding]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!(picked.type === 'application/pdf' || picked.name.toLowerCase().endsWith('.pdf'))) {
      toast.error('Only PDF files are supported.');
      return;
    }
    setFile(picked);
  };

  const handleSubmitReorder = async () => {
    if (!profile?.id || !request) return;
    if (!file) {
      toast.error('Please upload your PDF to continue.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Uploading PDF and placing free reorder...');

    try {
      const { data: fileUrl, error: uploadErr } = await uploadPrintFile(profile.id, file);
      if (uploadErr && !fileUrl) {
        toast.error('Failed to upload your PDF.', { id: toastId });
        setIsSubmitting(false);
        return;
      }

      const { data: cost, error: costErr } = await calculatePrintCost(
        mockedPagesPerFile,
        copies,
        colorMode === 'color',
        isDoubleSided,
        hasBinding,
        request.shop_id
      );

      if (costErr) {
        toast.error('Unable to calculate print settings.', { id: toastId });
        setIsSubmitting(false);
        return;
      }

      const orderPayload = {
        student_id: profile.id,
        shop_id: request.shop_id,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        pages: mockedPagesPerFile,
        copies,
        is_color: colorMode === 'color',
        is_double_sided: isDoubleSided,
        has_binding: hasBinding,
        total_price: 0,
        special_notes: `FREE REORDER for request #${request.id.slice(0, 6)}. Orientation: ${orientation}. Estimated normal cost: ₹${cost || 0}.`,
      };

      const { error: createErr } = await createPrintOrder(orderPayload, profile.college);
      if (createErr) {
        toast.error(createErr.message || 'Failed to place free reorder.', { id: toastId });
        setIsSubmitting(false);
        return;
      }

      const { error: completeErr } = await completeReorderRequest(request.id);
      if (completeErr) {
        toast.error('Reorder created, but request state update failed.', { id: toastId });
      } else {
        toast.success('Free reorder placed successfully. No payment needed.', { id: toastId });
      }

      navigate('/student/print');
    } catch (_err) {
      toast.error('Unexpected error while reordering.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-8 text-center shadow-soft">
          <h2 className="font-syne font-bold text-2xl mb-3">Login Required</h2>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-md bg-[var(--yellow)] text-[var(--text-primary)] font-bold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">Loading reorder request...</div>;
  }

  if (!request) return null;

  const shop = request?.print_shops || {};
  const bwPrice = shop?.bw_price_per_page || 1;
  const colorPrice = shop?.color_price_per_page || 5;
  const bindingCharge = shop?.binding_charge || 20;

  return (
    <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-full font-sans pb-32">
      <div className="max-w-[1000px] mx-auto">
        <button
          onClick={() => navigate('/student/print')}
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] hover:text-[#10A142] mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Print Page
        </button>

        <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[var(--text-primary)] text-sm">Free Reorder Request #{request.id.slice(0, 6)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Upload your PDF and confirm specs. This reorder is 100% free because your previous order was marked collected by mistake.</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Shop: {shop.name || 'Print Shop'}</p>
          </div>
        </div>

        <div className="bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg p-5 mb-5">
          <h2 className="font-syne font-bold text-xl text-[var(--text-primary)] mb-4">Upload PDF Again</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#10A142] text-white font-bold text-sm"
            >
              <Plus className="w-4 h-4" /> Choose PDF
            </button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" />
            {file ? (
              <div className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] px-3 py-2 rounded-lg">
                <FileText className="w-4 h-4" /> {file.name}
                <button onClick={() => setFile(null)} className="text-[var(--text-secondary)] hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">No PDF selected yet</span>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg)] rounded-lg border border-[var(--text-primary)]/10 shadow-medium p-5 md:p-8">
          <h2 className="font-syne font-bold text-xl text-[var(--text-primary)] mb-1">Print settings</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">You can change these before final free reorder.</p>

          <div className="flex items-center justify-between gap-4 pb-6 border-b border-[var(--text-primary)]/10 mb-6">
            <div>
              <h3 className="font-bold text-[var(--text-primary)]">Copies</h3>
            </div>
            <div className="flex items-center justify-between w-[120px] bg-[var(--bg)] border border-[#10A142]/30 rounded-lg px-2 py-1 shadow-soft text-[#10A142]">
              <button disabled={copies <= 1} onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 flex items-center justify-center text-xl">-</button>
              <span className="font-bold text-[var(--text-primary)]">{copies}</span>
              <button onClick={() => setCopies(copies + 1)} className="w-8 h-8 flex items-center justify-center text-xl">+</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-[var(--text-primary)]/10 mb-8">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] mb-3">Color Mode</h3>
              <div className="flex gap-3">
                <button onClick={() => setColorMode('bw')} className={`px-4 py-2 rounded-lg border font-bold text-sm ${colorMode === 'bw' ? 'border-[#10A142] bg-[#10A142]/5' : 'border-[var(--text-primary)]/10'}`}>
                  B&W (₹{bwPrice}/page)
                </button>
                <button onClick={() => setColorMode('color')} className={`px-4 py-2 rounded-lg border font-bold text-sm ${colorMode === 'color' ? 'border-[#10A142] bg-[#10A142]/5' : 'border-[var(--text-primary)]/10'}`}>
                  Color (₹{colorPrice}/page)
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[var(--text-primary)] mb-3">Orientation</h3>
              <div className="flex gap-3">
                <button onClick={() => setOrientation('portrait')} className={`px-4 py-2 rounded-lg border font-bold text-sm ${orientation === 'portrait' ? 'border-[#10A142] bg-[#10A142]/5' : 'border-[var(--text-primary)]/10'}`}>
                  Portrait
                </button>
                <button onClick={() => setOrientation('landscape')} className={`px-4 py-2 rounded-lg border font-bold text-sm ${orientation === 'landscape' ? 'border-[#10A142] bg-[#10A142]/5' : 'border-[var(--text-primary)]/10'}`}>
                  Landscape
                </button>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isDoubleSided} onChange={() => setIsDoubleSided(!isDoubleSided)} className="w-4 h-4 accent-[#10A142] rounded" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Double Sided (save 20%)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={hasBinding} onChange={() => setHasBinding(!hasBinding)} className="w-4 h-4 accent-[#10A142] rounded" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Add Spiral Binding (+₹{bindingCharge})</span>
              </label>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--text-primary)]/10 p-4 mb-4">
            <p className="text-sm text-[var(--text-primary)] font-bold">Normal estimate: ₹{calculateDisplayTotal}</p>
            <p className="text-sm text-[#10A142] font-bold mt-1">You pay now: ₹0 (Free reorder)</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">You can leave this page and come back later from the Reorder banner until you submit.</p>
          </div>

          <div className="flex items-center justify-center mb-4 bg-[var(--bg)] p-3 rounded-lg border border-black/10">
            <Shield className="w-4 h-4 text-[#10A142] mr-2" />
            <span className="font-sans font-bold text-sm text-[#10A142]">No payment required for this reorder.</span>
          </div>

          <button
            disabled={!file || isSubmitting}
            onClick={handleSubmitReorder}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#10A142] hover:bg-[#0D8736] text-white font-sans font-bold transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><RotateCcw className="w-4 h-4" /> Submit Free Reorder</>}
          </button>
        </div>
      </div>
    </div>
  );
};
