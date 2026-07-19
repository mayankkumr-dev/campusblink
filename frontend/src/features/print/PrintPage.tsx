import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Upload, FileText, X, CheckCircle2, ChevronRight, Plus, ShieldCheck, Printer, File, FileIcon, Shield, Store, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router';
import { getPrintShops, uploadPrintFile, createPrintOrder, calculatePrintCost, getMyReorderRequests, sendReorderInProgressNotification } from '../../api/print';
import toast from 'react-hot-toast';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { AccessDenied } from '../../shared/components/AccessDenied';
import { ListSkeleton } from '../../app/components/ui/Skeletons';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

type InkComplexity = 'light' | 'dark';

type InkAnalysis = {
  pageCount: number;
  pageDarkRatios: number[];
  averageDarkRatio: number;
  inkMultiplier: number;
  inkRatePerPage: number;
  complexity: InkComplexity;
};

function resolveInkPricing(averageDarkRatio: number): { multiplier: number; complexity: InkComplexity; inkRatePerPage: number } {
  if (averageDarkRatio >= 0.12) return { multiplier: 2.5, complexity: 'dark', inkRatePerPage: 5 };
  return { multiplier: 1.0, complexity: 'light', inkRatePerPage: 2 };
}

async function analyzePdfInk(file: File): Promise<InkAnalysis> {
  const fallback = {
    pageCount: 1,
    pageDarkRatios: [0.03],
    averageDarkRatio: 0.03,
    inkMultiplier: 1.0,
    inkRatePerPage: 2,
    complexity: 'light' as InkComplexity,
  };

  try {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    const pageDarkRatios: number[] = [];

    // For speed, analyze up to 20 pages and extrapolate using average.
    const pagesToAnalyze = Math.min(pdf.numPages, 20);

    for (let pageNum = 1; pageNum <= pagesToAnalyze; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.65 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        pageDarkRatios.push(0.03);
        continue;
      }

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      await page.render({ canvasContext: context, viewport }).promise;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;

      let darkPixels = 0;
      const totalPixels = canvas.width * canvas.height;
      for (let i = 0; i < imageData.length; i += 4) {
        const gray = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
        if (gray < 128) darkPixels += 1;
      }

      pageDarkRatios.push(totalPixels > 0 ? darkPixels / totalPixels : 0);
    }

    const sampledAvg = pageDarkRatios.length
      ? pageDarkRatios.reduce((acc, value) => acc + value, 0) / pageDarkRatios.length
      : 0.03;

    // Extend estimated ratio array to full page count for metadata visibility.
    const fullDarkRatios = Array.from({ length: pdf.numPages }, (_, idx) => {
      if (idx < pageDarkRatios.length) return pageDarkRatios[idx];
      return sampledAvg;
    });

    const { multiplier, complexity, inkRatePerPage } = resolveInkPricing(sampledAvg);
    return {
      pageCount: Math.max(1, pdf.numPages || 1),
      pageDarkRatios: fullDarkRatios,
      averageDarkRatio: sampledAvg,
      inkMultiplier: multiplier,
      inkRatePerPage,
      complexity,
    };
  } catch {
    return fallback;
  }
}

export const PrintPage: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [hasBinding, setHasBinding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = useAuthStore(state => state.profile);
  const { hasAccess: hasPrintAccess, isChecking: checkingPrintAccess } = useFeatureAccess('print_access');
  const { isAllowed } = useFeatureAccess(profile);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFallbackShopList, setIsFallbackShopList] = useState(false);
  const [hasLoadedShops, setHasLoadedShops] = useState(false);
  const [reorderRequests, setReorderRequests] = useState<any[]>([]);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [inkAnalyses, setInkAnalyses] = useState<InkAnalysis[]>([]);
  const [isAnalyzingInk, setIsAnalyzingInk] = useState(false);

  useEffect(() => {
    async function fetchShops() {
      if (!profile) return;
      setHasLoadedShops(false);
      const { data, error } = await getPrintShops(profile.college);
      if (error) {
        toast.error(error.message || 'Unable to load print shops right now.');
        setShops([]);
        setSelectedShopId('');
        setIsFallbackShopList(false);
        setHasLoadedShops(true);
        return;
      }
      if (data && data.length > 0) {
        setShops(data);
        setSelectedShopId(data[0].id);
        setIsFallbackShopList(Boolean(profile.college && data[0].college !== profile.college));
      } else {
        setShops([]);
        setSelectedShopId('');
        setIsFallbackShopList(false);
      }
      setHasLoadedShops(true);
    }
    fetchShops();
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;
    getMyReorderRequests(profile.id).then(({ data }) => {
      if (data?.length) setReorderRequests(data);
    });
  }, [profile?.id]);

  const handleStartReorder = async (order: any) => {
    if (!profile?.id) return;
    setReorderingId(order.id);

    await sendReorderInProgressNotification(profile.id, order.id);
    toast.success('Opening free reorder page. Upload your PDF and submit there.');
    navigate(`/student/print/reorder/${order.id}`);
    setReorderingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const incoming = Array.from(e.dataTransfer.files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
      if (incoming.length === 0) {
        toast.error('Only PDF files are supported.');
        return;
      }
      setFiles(prev => [...prev, ...incoming]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incoming = Array.from(e.target.files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
      if (incoming.length === 0) {
        toast.error('Only PDF files are supported.');
        return;
      }
      setFiles(prev => [...prev, ...incoming]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const runInkAnalysis = async () => {
      if (!files.length) {
        if (mounted) setInkAnalyses([]);
        return;
      }

      setIsAnalyzingInk(true);
      const results = await Promise.all(files.map((file) => analyzePdfInk(file)));
      if (mounted) {
        setInkAnalyses(results);
        setIsAnalyzingInk(false);
      }
    };

    runInkAnalysis();
    return () => {
      mounted = false;
    };
  }, [files]);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Safe cast shop configs
  const selectedShop = shops.find(s => s.id === selectedShopId);
  const bwPrice = selectedShop?.bw_price_per_page || 1;
  const colorPrice = selectedShop?.color_price_per_page || 5;
  const bindingCharge = selectedShop?.binding_charge || 20;

  const mockedPagesPerFile = 17;
  
  // Custom calculator for UI display
  const calculateDisplayTotal = () => {
      const perFileTotals = files.map((_, idx) => {
       const analysis = inkAnalyses[idx];
       const pages = analysis?.pageCount || mockedPagesPerFile;
       const rate = colorMode === 'color' ? colorPrice : bwPrice;
       let base = pages * copies * rate;
       if (isDoubleSided) base *= 0.8;
       if (hasBinding) base += bindingCharge;
       return base;
      });

      const sum = perFileTotals.reduce((acc, value) => acc + value, 0);
      return Math.ceil(sum);
  }

  const handleCheckout = async () => {
    if (!profile) {
      toast.error("Please login to place an order");
      return;
    }
    if (!selectedShopId) {
      toast.error("Please select a print shop");
      return;
    }
    if (!isAllowed('ordering')) {
      toast.error('Ordering is currently restricted for your account.');
      return;
    }

    if (isAnalyzingInk) {
      toast.error('Please wait, analyzing PDF ink density...');
      return;
    }
    
    setIsSubmitting(true);
    const toastId = toast.loading("Uploading files and placing order...");

    try {
      // Process each file separately as one order (or we could upload all and make one JSON items order, but schema assumes 1 file_url per row)
      let allSuccess = true;
      let usedTestingFallback = false;

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const analysis = inkAnalyses[i] || (await analyzePdfInk(file));
        const pageCount = Math.max(1, analysis.pageCount || mockedPagesPerFile);
        // 1. Upload File
        const { data: filePath, error: uploadErr } = await uploadPrintFile(profile.id, file);
        const isTestingFallback = Boolean(uploadErr);
        const resolvedFileUrl = filePath || null;
        if (uploadErr) {
          usedTestingFallback = true;
          toast(`Upload skipped for testing: ${file.name}`, {
            id: `upload-fallback-${file.name}`,
            icon: '🧪',
          });
        }

        const rate = colorMode === 'color' ? colorPrice : bwPrice;
        let inkAdjustedCost = pageCount * copies * rate;
        if (isDoubleSided) inkAdjustedCost *= 0.8;
        if (hasBinding) inkAdjustedCost += bindingCharge;
        inkAdjustedCost = Math.ceil(inkAdjustedCost);

        // 3. Create Order
        const orderData = {
          student_id: profile.id,
          shop_id: selectedShopId,
          file_url: resolvedFileUrl,
          file_name: file.name,
          file_size: file.size,
          pages: pageCount,
          copies: copies,
          is_color: colorMode === 'color',
          is_double_sided: isDoubleSided,
          has_binding: hasBinding,
          total_price: inkAdjustedCost,
          special_notes: `Orientation: ${orientation} | INK_META:${JSON.stringify({
            average_dark_ratio: Number(analysis.averageDarkRatio.toFixed(4)),
            page_dark_ratios: (analysis.pageDarkRatios || []).map((ratio) => Number(ratio.toFixed(4))),
            ink_multiplier: analysis.inkMultiplier,
            ink_rate_per_page: analysis.inkRatePerPage,
            complexity: analysis.complexity,
            analysis_pages_used: Math.min(pageCount, 20),
          })}${isTestingFallback ? ' | TEST MODE: file upload pending' : ''}`
        };

        const { error: orderErr } = await createPrintOrder(orderData, profile.college);
        if (orderErr) {
          toast.error(`Order failed for ${file.name}: ${orderErr.message}`);
          allSuccess = false;
        }
      }

      if (allSuccess) {
        toast.success(
          usedTestingFallback
            ? "Print job submitted in test mode. File upload can be added later 🖨️"
            : "Print job submitted! Payment can be handled later for testing 🖨️",
          { id: toastId }
        );
        if (!localStorage.getItem('cb_first_order_done')) {
          localStorage.setItem('cb_first_order_done', '1');
          window.dispatchEvent(new CustomEvent('cb-order-placed-first-time'));
        }
        setFiles([]); // Clear queue
      } else {
        toast.error("Some files failed to process.", { id: toastId });
      }

    } catch (err) {
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingPrintAccess) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListSkeleton key={`print-access-skeleton-${index}`} rows={1} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasPrintAccess) {
    return <AccessDenied feature="Print" />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-8 text-center shadow-soft">
          <h2 className="font-syne font-bold text-2xl mb-3">Login Required</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
            Sign in first to send a print order.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-md bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:shadow-[0_0_20px_rgba(255,214,0,0.35)] transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!profile?.college && shops.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-8 text-center shadow-soft">
          <h2 className="font-syne font-bold text-2xl mb-3">College Required</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
            Update your profile to select your college to access print shop ordering.
          </p>
          <button
            onClick={() => navigate('/student/profile?edit=1')}
            className="px-6 py-3 rounded-md bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:shadow-[0_0_20px_rgba(255,214,0,0.35)] transition-all"
          >
            Update Profile
          </button>
        </div>
      </div>
    );
  }

  if (!hasLoadedShops) {
    return (
      <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-full font-sans pb-32">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListSkeleton key={`print-shops-skeleton-${index}`} rows={1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-full font-sans pb-32">
      <div className="max-w-[1000px] mx-auto">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="hidden md:block font-syne font-bold text-2xl md:text-3xl text-[var(--text-primary)]">Printout preview</h1>
          
          <div className="flex items-center gap-4">
             {/* Shop Selector */}
             {shops.length > 0 && (
               <div className="bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm">
                 <Store className="w-4 h-4 text-[var(--yellow-dark)]" />
                 <select 
                   value={selectedShopId}
                   onChange={(e) => setSelectedShopId(e.target.value)}
                   className="print-shop-name bg-transparent border-none text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-0 max-w-[170px]"
                 >
                   {shops.map(shop => (
                     <option key={shop.id} value={shop.id}>{shop.name} {shop.is_open_now ? '(Open)' : '(Closed)'}</option>
                   ))}
                 </select>
               </div>
             )}

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 font-bold text-[var(--yellow-dark)] hover:text-[var(--yellow-dark)] transition-colors"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Add files</span>
            </button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" multiple />
          </div>
        </div>

        {isFallbackShopList && (
          <div className="mb-5 rounded-lg border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-4 py-3">
            <p className="font-sans text-sm font-bold text-[var(--text-primary)]">Test mode: using print shops outside your college so you can place orders.</p>
          </div>
        )}

        {selectedShop ? (
          <div className={`mb-5 rounded-lg border px-4 py-3 ${selectedShop.is_open_now ? 'border-accent-green/20 bg-accent-green/15' : 'border-accent-red/20 bg-accent-red/15'}`}>
            <p className={`font-sans text-sm font-bold ${selectedShop.is_open_now ? 'text-accent-green' : 'text-accent-red'}`}>{selectedShop.is_open_now ? 'Print shop is open' : 'Print shop is closed'}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{selectedShop.shop_status_reason || 'Availability follows the shop schedule.'}</p>
          </div>
        ) : null}

        {/* Reorder Requested Banners */}
        {reorderRequests.map((order) => (
          <div key={order.id} className="mb-4 rounded-lg border border-amber-400/40 bg-accent-amber-soft px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[var(--text-primary)] text-sm">Reprint Required — No Payment Needed</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Your order <span className="font-mono font-bold">#{order.id.slice(0, 6)}</span>
                  {order.print_shops?.name ? ` at ${order.print_shops.name}` : ''} was accidentally collected without printing.
                  Reorder for free — you've already paid.
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{order.file_name}</p>
              </div>
            </div>
            <button
              onClick={() => handleStartReorder(order)}
              disabled={reorderingId === order.id}
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all disabled:opacity-60 whitespace-nowrap shadow-md"
            >
              {reorderingId === order.id ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
              ) : (
                <><RotateCcw className="w-4 h-4" /> Start Reorder</>
              )}
            </button>
          </div>
        ))}

        {hasLoadedShops && shops.length === 0 && (
          <div className="mb-5 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3">
            <p className="font-sans text-sm font-bold text-[#B42318]">No print shops are available right now. Add an active print shop in admin or print-shop setup first.</p>
          </div>
        )}

        {/* File Preview Carousel / Grid */}
        <div className="flex overflow-x-auto gap-4 pb-6 hide-scrollbar">
          {files.map((file, idx) => (
            <div key={idx} className="flex flex-col items-center flex-shrink-0 animate-scale-in">
              <div className="w-[140px] h-[180px] md:w-[180px] md:h-[240px] bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-lg shadow-soft relative flex flex-col items-center justify-center p-4 group">
                <button 
                  onClick={() => removeFile(idx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-full flex items-center justify-center shadow-soft text-[var(--text-secondary)] hover:text-red-500 z-10"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center mb-3 text-[var(--text-primary)]">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="print-file-name text-[11px] md:text-xs font-syne font-bold text-[var(--text-primary)] text-center w-full">{file.name}</p>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-3 font-sans">
                File {idx + 1} ({inkAnalyses[idx]?.pageCount || mockedPagesPerFile} pages)
                {inkAnalyses[idx] ? ` • ${(inkAnalyses[idx].averageDarkRatio * 100).toFixed(1)}% ink` : ''}
              </p>
            </div>
          ))}

          {/* Add More Files Card */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer"
          >
            <div className="w-[140px] h-[180px] md:w-[180px] md:h-[240px] bg-surface border-2 border-border-subtle border-dashed rounded-2xl relative flex flex-col items-center justify-center p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full bg-surface shadow-sm flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform duration-300">
                 <Plus className="w-6 h-6" />
              </div>
              <span className="text-[13px] font-bold text-text-secondary mt-4 group-hover:text-blue-600 transition-colors">Add files</span>
            </div>
          </div>
        </div>

        {/* Privacy Banner */}
        <div className="bg-[var(--bg-secondary)] rounded-t-3xl border-x border-t border-[var(--text-primary)]/10 py-3 px-4 flex items-center justify-center gap-2 mt-4 text-[var(--text-secondary)] text-sm font-sans font-medium">
          <Shield className="w-4 h-4 text-[var(--yellow-dark)]" />
          We will delete your files once delivered
        </div>

        {/* Print Settings Card */}
        <div className="bg-[var(--bg)] rounded-b-3xl border border-[var(--text-primary)]/10 shadow-medium p-5 md:p-8 animate-slide-up">
          <div className="mb-8">
            <h2 className="font-syne font-bold text-xl text-[var(--text-primary)] mb-1">Print settings</h2>
            <p className="text-sm text-[var(--text-secondary)] font-sans">Same print settings apply to all files</p>
          </div>

          {/* Copies Setting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--text-primary)]/10 mb-6">
            <div>
              <h3 className="font-bold text-[var(--text-primary)] font-sans">Choose number of copies</h3>
              <p className="text-xs text-[var(--text-secondary)] font-sans mt-1">Copies of this file you want to print</p>
            </div>
            <div className="flex items-center justify-between w-[120px] bg-[var(--bg)] border border-[var(--yellow-dark)]/30 rounded-lg px-2 py-1 shadow-soft text-[var(--yellow-dark)]">
              <button disabled={copies <= 1} onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 flex items-center justify-center text-xl font-medium hover:bg-[var(--yellow-dark)]/10 rounded disabled:opacity-30 disabled:hover:bg-transparent">-</button>
              <span className="font-bold text-[var(--text-primary)]">{copies}</span>
              <button onClick={() => setCopies(copies + 1)} className="w-8 h-8 flex items-center justify-center text-xl font-medium hover:bg-[var(--yellow-dark)]/10 rounded">+</button>
            </div>
          </div>

          {/* Advanced Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-4 pb-8 border-b border-[var(--text-primary)]/10 mb-8">
            
            {/* Color Setting */}
            <div>
              <h3 className="font-bold text-[var(--text-primary)] font-sans">Choose print colour</h3>
              <p className="text-xs text-[var(--text-secondary)] font-sans mt-1 mb-4">Save money with black & white or get color printouts</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setColorMode('bw')}
                  className={`flex flex-col items-center w-[90px] p-3 rounded-2xl transition-all border-2 ${colorMode === 'bw' ? 'border-accent-blue bg-blue-50/50 shadow-sm' : 'border-border-subtle bg-surface hover:border-slate-300 hover:bg-surface-elevated'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center mb-2 shadow-sm relative">
                    <div className="w-4 h-4 rounded-full border-[3px] border-slate-700 absolute -translate-x-1 mix-blend-multiply" />
                    <div className="w-4 h-4 rounded-full border-[3px] border-slate-400 absolute translate-x-1 mix-blend-multiply" />
                  </div>
                  <span className={`text-[12px] font-bold ${colorMode === 'bw' ? 'text-blue-700' : 'text-text-primary'}`}>B&W</span>
                  <span className={`text-[10px] ${colorMode === 'bw' ? 'text-blue-500/80' : 'text-text-secondary/70'}`}>₹{bwPrice}/page</span>
                </button>
                
                <button 
                  onClick={() => setColorMode('color')}
                  className={`flex flex-col items-center w-[90px] p-3 rounded-2xl transition-all border-2 ${colorMode === 'color' ? 'border-accent-blue bg-blue-50/50 shadow-sm' : 'border-border-subtle bg-surface hover:border-slate-300 hover:bg-surface-elevated'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center mb-2 shadow-sm relative overflow-hidden">
                    <div className="w-4 h-4 rounded-full bg-[#FF4444] absolute -translate-x-1.5 -translate-y-1.5 mix-blend-multiply" />
                    <div className="w-4 h-4 rounded-full bg-[#44FF44] absolute translate-x-1.5 -translate-y-1.5 mix-blend-multiply" />
                    <div className="w-4 h-4 rounded-full bg-[#4444FF] absolute translate-y-1.5 mix-blend-multiply" />
                  </div>
                  <span className={`text-[12px] font-bold ${colorMode === 'color' ? 'text-blue-700' : 'text-text-primary'}`}>Color</span>
                  <span className={`text-[10px] ${colorMode === 'color' ? 'text-blue-500/80' : 'text-text-secondary/70'}`}>₹{colorPrice}/page</span>
                </button>
              </div>
            </div>

            {/* Orientation & Extra Settings */}
            <div>
              <h3 className="font-bold text-[var(--text-primary)] font-sans">Extra Options</h3>
              <p className="text-xs text-[var(--text-secondary)] font-sans mt-1 mb-4">Orientation, double-sided, and bindings</p>
              
              <div className="flex gap-4 mb-5">
                <button 
                  onClick={() => setOrientation('portrait')}
                  className={`flex flex-col items-center w-[90px] p-3 rounded-2xl transition-all border-2 ${orientation === 'portrait' ? 'border-accent-blue bg-blue-50/50 shadow-sm' : 'border-border-subtle bg-surface hover:border-slate-300 hover:bg-surface-elevated'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center mb-2 shadow-sm">
                    <div className="w-4 h-6 border-2 border-slate-400 rounded-sm" />
                  </div>
                  <span className={`text-[12px] font-bold ${orientation === 'portrait' ? 'text-blue-700' : 'text-text-primary'}`}>Portrait</span>
                </button>
                
                <button 
                  onClick={() => setOrientation('landscape')}
                  className={`flex flex-col items-center w-[90px] p-3 rounded-2xl transition-all border-2 ${orientation === 'landscape' ? 'border-accent-blue bg-blue-50/50 shadow-sm' : 'border-border-subtle bg-surface hover:border-slate-300 hover:bg-surface-elevated'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center mb-2 shadow-sm">
                     <div className="w-6 h-4 border-2 border-slate-400 rounded-sm" />
                  </div>
                  <span className={`text-[12px] font-bold ${orientation === 'landscape' ? 'text-blue-700' : 'text-text-primary'}`}>Landscape</span>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isDoubleSided} onChange={() => setIsDoubleSided(!isDoubleSided)} className="w-4 h-4 accent-[var(--yellow-dark)] rounded" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">Double Sided (save 20%)</span>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={hasBinding} onChange={() => setHasBinding(!hasBinding)} className="w-4 h-4 accent-[var(--yellow-dark)] rounded" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">Add Spiral Binding (+₹{bindingCharge})</span>
                 </label>
              </div>

            </div>
          </div>

         {/* Checkout Banner */}
         <div className="flex items-center justify-center mb-4 bg-accent-amber-soft p-3 rounded-lg border border-accent-amber-soft">
           <span className="font-sans font-bold text-sm text-accent-amber">Payment can be settled later while you test the print flow 🖨️</span>
          </div>
{/* Floating Bottom Bar */}
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-full max-w-[800px] bg-surface-elevated rounded-2xl shadow-[0_15px_50px_-12px_rgba(0,0,0,0.15)] border border-border-subtle p-4 md:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 z-40">
   <div className="flex items-center gap-4 w-full sm:w-auto">
     <div className="w-12 h-12 bg-surface border border-border-subtle rounded-xl flex items-center justify-center relative flex-shrink-0 shadow-sm">
        <FileText className="w-6 h-6 text-text-secondary/70" />
     </div>
     <div>
        <p className="font-bold text-text-secondary text-[11px] uppercase tracking-wider mb-0.5">
          {isAnalyzingInk ? 'Analyzing...' : `Total ${files.reduce((acc, _, idx) => acc + ((inkAnalyses[idx]?.pageCount || mockedPagesPerFile) * copies), 0)} pages`}
        </p>
        <p className="font-extrabold text-text-primary text-2xl tracking-tight leading-none">{isAnalyzingInk ? '...' : `₹${calculateDisplayTotal()}`}</p>
     </div>
   </div>
   
   <button 
     disabled={files.length === 0 || isSubmitting || !selectedShopId || isAnalyzingInk} 
     onClick={handleCheckout}
     className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_4px_15px_-3px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_20px_-3px_rgba(37,99,235,0.5)] whitespace-nowrap gap-2 text-[15px]"
   >
     {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : isAnalyzingInk ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : 'Place Print Order'}
   </button>
</div>

        </div>
      </div>
    </div>
  );
};
