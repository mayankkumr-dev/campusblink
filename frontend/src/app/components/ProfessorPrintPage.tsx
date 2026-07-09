import React, { useEffect, useState } from 'react';
import { ArrowLeft, Truck, Upload, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
import { insertPendingPayment } from '../../api/professor';
import { ListSkeleton } from './ui/Skeletons';


type InkComplexity = 'light' | 'dark';
type InkAnalysis = { pageCount: number; pageDarkRatios: number[]; averageDarkRatio: number; inkMultiplier: number; inkRatePerPage: number; complexity: InkComplexity; };

function resolveInkPricing(averageDarkRatio: number): { multiplier: number; complexity: InkComplexity; inkRatePerPage: number } {
  if (averageDarkRatio >= 0.12) return { multiplier: 2.5, complexity: 'dark', inkRatePerPage: 5 };
  return { multiplier: 1.0, complexity: 'light', inkRatePerPage: 2 };
}

async function analyzePdfInk(file: File): Promise<InkAnalysis> {
  const fallback = { pageCount: 1, pageDarkRatios: [0.03], averageDarkRatio: 0.03, inkMultiplier: 1.0, inkRatePerPage: 2, complexity: 'light' as InkComplexity };
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    const pageDarkRatios: number[] = [];
    const pagesToAnalyze = Math.min(pdf.numPages, 20);
    for (let pageNum = 1; pageNum <= pagesToAnalyze; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.65 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) { pageDarkRatios.push(0.03); continue; }
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      await page.render({ canvasContext: context as any, viewport: viewport as any }).promise;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let darkPixels = 0;
      const step = 4 * 16;
      for (let i = 0; i < imageData.length; i += step) {
        const r = imageData[i]; const g = imageData[i + 1]; const b = imageData[i + 2]; const a = imageData[i + 3];
        if (a > 50 && (r < 120 || g < 120 || b < 120)) { darkPixels += 1; }
      }
      const totalSampledPixels = Math.floor(imageData.length / step);
      pageDarkRatios.push(darkPixels / totalSampledPixels);
    }
    const averageDarkRatio = pageDarkRatios.reduce((a, b) => a + b, 0) / pageDarkRatios.length;
    const pricing = resolveInkPricing(averageDarkRatio);
    return { pageCount: pdf.numPages, pageDarkRatios, averageDarkRatio, inkMultiplier: pricing.multiplier, inkRatePerPage: pricing.inkRatePerPage, complexity: pricing.complexity };
  } catch (err) {
    console.error("PDF analysis failed:", err);
    return fallback;
  }
}

export const ProfessorPrintPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Print config
  const [files, setFiles] = useState<File[]>([]);
  const [copies, setCopies] = useState(1);
  const [isColor, setIsColor] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [deliverToRoom, setDeliverToRoom] = useState(false);
  const [roomNumber, setRoomNumber] = useState(profile?.staff_room_number || '');
  const [paymentMethod, setPaymentMethod] = useState<'now' | 'counter' | 'later'>('now');
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const loadShops = async () => {
      setLoading(true);
      const college = profile?.college;
      let query = supabase.from('print_shops').select('*').eq('is_active', true);
      if (college) query = query.eq('college', college);
      const { data } = await query.order('name');
      setShops(data || []);
      setLoading(false);
    };
    loadShops();
  }, [profile?.college]);

  
  const [inkAnalyses, setInkAnalyses] = useState<InkAnalysis[]>([]);
  const [isAnalyzingInk, setIsAnalyzingInk] = useState(false);

  useEffect(() => {
    let mounted = true;
    const runInkAnalysis = async () => {
      if (!files.length) {
        if (mounted) setInkAnalyses([]);
        return;
      }
      setIsAnalyzingInk(true);
      const results = await Promise.all(files.map(async (file) => {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          return analyzePdfInk(file);
        } else {
          return { pageCount: 1, pageDarkRatios: [0.3], averageDarkRatio: 0.3, inkMultiplier: 1.0, inkRatePerPage: 2, complexity: 'light' as InkComplexity };
        }
      }));
      if (mounted) {
        setInkAnalyses(results);
        setIsAnalyzingInk(false);
      }
    };
    runInkAnalysis();
    return () => { mounted = false; };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
  };

  const calculateDisplayTotal = () => {
    const perFileTotals = files.map((_, idx) => {
      const analysis = inkAnalyses[idx];
      const pCount = analysis?.pageCount || 1;
      const inkRatePerPage = analysis?.inkRatePerPage || 2;
      let base = pCount * copies * inkRatePerPage;
      if (isColor && selectedShop) {
        base = pCount * copies * selectedShop.color_price_per_page;
      }
      if (isBinding) base += (selectedShop?.binding_charge || 20);
      return base;
    });
    return Math.ceil(perFileTotals.reduce((a, b) => a + b, 0));
  };
  
  const totalAmount = calculateDisplayTotal();


  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePlaceOrder = async () => {
    if (!profile?.id || !selectedShop || files.length === 0) {
      toast.error('Please select files to print.');
      return;
    }
    setPlacing(true);

    try {
      // Upload files to Supabase Storage
      const fileUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'pdf';
        const path = `print-orders/${profile.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('print-files')
          .upload(path, file);
        if (uploadError) {
          console.warn('File upload failed:', uploadError.message);
          fileUrls.push(file.name);
        } else {
          const { data: urlData } = supabase.storage.from('print-files').getPublicUrl(path);
          fileUrls.push(urlData?.publicUrl || file.name);
        }
      }

      const orderPayload: any = {
        student_id: profile.id,
        shop_id: selectedShop.id,
        file_name: files.map(f => f.name).join(', '),
        file_url: fileUrls[0] || null,
                pages,
        copies,
        is_color: isColor,
        has_binding: isBinding,
        total_price: totalAmount,
        status: 'pending',
        is_professor_order: true,
        is_delivery_order: deliverToRoom,
        delivery_room_number: deliverToRoom ? roomNumber : null,
        professor_pay_later: paymentMethod === 'later',
        
      };

      const { data: order, error } = await supabase
        .from('print_orders')
        .insert([orderPayload])
        .select()
        .single();

      if (error) throw error;

      if (paymentMethod === 'later' && order) {
        await insertPendingPayment({
          professor_id: profile.id,
          order_id: order.id,
          order_type: 'print',
          amount: totalAmount,
          shop_name: selectedShop.name,
          items: [{ file_name: files.map(f => f.name).join(', '), pages, copies, color: isColor, binding: isBinding }],
        });
      }

      toast.success('Print order placed! 🖨️');
      setFiles([]);
      setSelectedShop(null);
      setCopies(1);
      
      setIsColor(false);
      setIsBinding(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListSkeleton key={`prof-print-skeleton-${index}`} rows={1} />
          ))}
        </div>
      </div>
    );
  }

  if (!selectedShop) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="font-syne font-extrabold text-2xl text-[var(--text-primary)] mb-6">Print Shop</h1>
        {shops.length === 0 ? (
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No print shops available at your college.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shops.map(shop => (
              <button
                key={shop.id}
                onClick={() => setSelectedShop(shop)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 text-left hover:border-[var(--yellow)] hover:shadow-sm transition-all"
              >
                <h3 className="font-syne font-bold text-lg text-[var(--text-primary)]">{shop.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{shop.college}</p>
                <div className="flex gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                  <span>B/W: ₹{shop.bw_price_per_page}/page</span>
                  <span>Color: ₹{shop.color_price_per_page}/page</span>
                  <span>Binding: ₹{shop.binding_charge}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => { setSelectedShop(null); setFiles([]); }} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to shops
      </button>

      <h1 className="font-syne font-extrabold text-2xl text-[var(--text-primary)] mb-2">{selectedShop.name}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">Upload files and configure your print job</p>

      {/* File Upload */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-4">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Upload Files</h3>
        <label className="flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)] border-2 border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--yellow-dark)] transition-colors">
          <Upload className="w-8 h-8 text-[var(--text-muted)] mb-2" />
          <span className="text-sm font-bold text-[var(--text-secondary)]">Click to upload files</span>
          <span className="text-xs text-[var(--text-muted)] mt-1">PDF, DOC, JPG, PNG</span>
          <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
        </label>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--bg-primary)] rounded-md p-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-primary)] truncate max-w-[200px]">{f.name}</span>
                </div>
                <button onClick={() => removeFile(i)} className="p-1 hover:bg-[var(--border)] rounded-sm">
                  <X className="w-3 h-3 text-[var(--text-secondary)]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print Options */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-4">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Print Options</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Pages</label>
            <input type="number" min={1} value={pages} onChange={e => setPages(Math.max(1, parseInt(e.target.value) || 1))} className="w-full mt-1 h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Copies</label>
            <input type="number" min={1} value={copies} onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))} className="w-full mt-1 h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm" />
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${isColor ? 'border-[var(--yellow-dark)] bg-[#FEF9C3]/30' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={isColor} onChange={() => setIsColor(!isColor)} className="accent-[var(--yellow-dark)]" />
            <span className="text-sm font-medium">Color</span>
          </label>
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${isBinding ? 'border-[var(--yellow-dark)] bg-[#FEF9C3]/30' : 'border-[var(--border)]'}`}>
            <input type="checkbox" checked={isBinding} onChange={() => setIsBinding(!isBinding)} className="accent-[var(--yellow-dark)]" />
            <span className="text-sm font-medium">Binding</span>
          </label>
        </div>
      </div>

      {/* Delivery Toggle */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <span className="text-sm font-bold text-[var(--text-primary)]">Deliver to my room?</span>
              <p className="text-xs text-[var(--text-secondary)]">We'll deliver your printout</p>
            </div>
          </div>
          <button
            onClick={() => setDeliverToRoom(!deliverToRoom)}
            className={`relative w-12 h-6 rounded-md transition-colors ${deliverToRoom ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-[var(--bg)] rounded-sm shadow transition-transform ${deliverToRoom ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {deliverToRoom && (
          <div className="mt-3">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Room Number</label>
            <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. A-201" className="w-full mt-1 h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:border-[var(--accent)]" />
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-4">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Payment Method</h3>
        {[
          { value: 'now' as const, label: 'Pay Now via UPI', desc: 'Scan QR code to pay' },
          { value: 'counter' as const, label: 'Pay at Counter', desc: 'Pay when picking up' },
          { value: 'later' as const, label: 'Pay Later', desc: 'Added to your pending payments' },
        ].map(opt => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer mb-2 last:mb-0 transition-colors ${
              paymentMethod === opt.value ? 'border-[var(--accent)] bg-[#F0F9FF]' : 'border-[var(--border)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            <input type="radio" name="payment" checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} className="accent-[var(--accent)]" />
            <div>
              <span className="text-sm font-bold text-[var(--text-primary)]">{opt.label}</span>
              <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Price Summary */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 mb-6">
        <h3 className="font-bold mb-3">Cost Breakdown</h3>
        {files.map((file, idx) => {
          const analysis = inkAnalyses[idx];
          const pCount = analysis?.pageCount || 1;
          const rate = isColor && selectedShop ? selectedShop.color_price_per_page : (analysis?.inkRatePerPage || 2);
          const basePrice = pCount * rate;
          const fileTotal = (basePrice + (isBinding && selectedShop ? selectedShop.binding_charge : 0)) * copies;
          
          return (
            <div key={idx} className="flex justify-between text-sm mb-2 pb-2 border-b border-[var(--border)] last:border-0 last:pb-0">
              <div className="flex flex-col">
                <span className="text-[var(--text-primary)] truncate max-w-[200px]">{file.name}</span>
                <span className="text-[var(--text-secondary)] text-xs mt-1">
                  {pCount} pgs × ₹{rate}/pg {isBinding ? `+ ₹${selectedShop?.binding_charge || 20} bind` : ''} × {copies} {copies > 1 ? 'copies' : 'copy'}
                </span>
                {!isColor && (
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Ink Analysis: {analysis?.complexity === 'dark' ? 'Heavy Ink (₹5/page)' : 'Light Ink (₹2/page)'}
                  </span>
                )}
              </div>
              <span className="text-[var(--text-primary)] font-medium pt-2">₹{fileTotal}</span>
            </div>
          );
        })}
        
        <div className="flex justify-between pt-3 mt-2 border-t-2 border-[var(--border)]">
          <span className="font-bold text-[var(--text-primary)]">Total Amount</span>
          <span className="font-syne font-extrabold text-xl text-[var(--text-primary)]">{isAnalyzingInk ? "Analyzing..." : `₹${totalAmount}`}</span>
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={placing || files.length === 0}
        className="w-full h-12 rounded-md bg-[var(--text-primary)] text-white font-bold text-sm hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
      >
        {placing ? 'Placing Order...' : `Place Print Order — ₹${totalAmount}`}
      </button>
    </div>
  );
};
