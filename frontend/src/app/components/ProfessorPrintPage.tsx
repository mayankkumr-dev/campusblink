import React, { useEffect, useState } from 'react';
import { ArrowLeft, Truck, Upload, FileText, X, MapPin, Printer, Check, ChevronRight, Loader2 } from 'lucide-react';
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
  
  // Mobile UI
  const [showMobileCart, setShowMobileCart] = useState(false);

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

      toast.success('Print order placed successfully! 🖨️');
      setFiles([]);
      setSelectedShop(null);
      setCopies(1);
      setIsColor(false);
      setIsBinding(false);
      setShowMobileCart(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-20 transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 border border-gray-100 dark:border-prof-border-subtle h-64 shadow-sm dark:shadow-none animate-pulse flex flex-col gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-prof-bg-surface-raised rounded-2xl"></div>
              <div className="h-6 w-3/4 bg-gray-100 dark:bg-prof-bg-surface-raised rounded"></div>
              <div className="h-4 w-1/2 bg-gray-100 dark:bg-prof-bg-surface-raised rounded"></div>
              <div className="mt-auto h-16 w-full bg-gray-100 dark:bg-prof-bg-surface-raised rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Shop Selection View
  if (!selectedShop) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-20 bg-[#FAFAFA] dark:bg-prof-bg-base min-h-[calc(100vh-4rem)] transition-colors duration-200">
        <header className="mb-12">
          <p className="text-xs font-bold tracking-widest text-gray-400 dark:text-prof-text-tertiary uppercase mb-2">Campus Print Services</p>
          <h1 className="font-syne font-extrabold text-4xl sm:text-5xl text-gray-900 dark:text-prof-text-primary tracking-tight leading-tight">
            Select Print Shop
          </h1>
          <p className="text-sm text-gray-500 dark:text-prof-text-secondary mt-4 max-w-xl leading-relaxed">
            Choose a shop to view its specialized rates and upload your academic documents for priority faculty printing.
          </p>
        </header>

        {shops.length === 0 ? (
          <div className="bg-white dark:bg-prof-bg-surface rounded-3xl p-12 text-center border border-gray-100 dark:border-prof-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-none">
             <div className="w-16 h-16 mx-auto bg-gray-50 dark:bg-prof-bg-surface-raised rounded-full flex items-center justify-center mb-4">
               <Printer className="w-6 h-6 text-gray-400 dark:text-prof-text-tertiary" />
             </div>
            <p className="text-lg font-bold text-gray-900 dark:text-prof-text-primary font-syne">No print shops available</p>
            <p className="text-sm text-gray-500 dark:text-prof-text-secondary mt-2">There are currently no active print shops in your college.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map(shop => (
              <button
                key={shop.id}
                onClick={() => setSelectedShop(shop)}
                className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 text-left border border-gray-100 dark:border-prof-border-subtle shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none hover:border-blue-100 dark:hover:border-prof-accent-blue/30 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 dark:from-prof-accent-blue-soft-bg to-transparent rounded-bl-[120px] -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-prof-accent-blue-soft-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Printer className="w-8 h-8 text-blue-600 dark:text-prof-accent-blue" strokeWidth={1.5} />
                </div>
                <h3 className="font-syne font-bold text-xl text-gray-900 dark:text-prof-text-primary mb-1 group-hover:text-blue-600 dark:group-hover:text-prof-accent-blue transition-colors">{shop.name}</h3>
                <p className="text-xs font-semibold text-gray-500 dark:text-prof-text-secondary flex items-center gap-1 uppercase tracking-wider mb-6">
                  <MapPin className="w-3 h-3" /> {shop.college}
                </p>
                <div className="bg-gray-50 dark:bg-prof-bg-surface-raised rounded-2xl p-4 grid grid-cols-3 gap-2 divide-x divide-gray-200 dark:divide-prof-border-subtle border border-gray-100/50 dark:border-prof-border-subtle">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-prof-text-tertiary uppercase tracking-widest">B/W</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-prof-text-primary mt-1">₹{shop.bw_price_per_page}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-prof-text-tertiary uppercase tracking-widest">Color</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-prof-text-primary mt-1">₹{shop.color_price_per_page}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-prof-text-tertiary uppercase tracking-widest">Bind</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-prof-text-primary mt-1">₹{shop.binding_charge}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Print Configuration View
  const CartPanelContent = (
    <>
      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4 hide-scrollbar">
         <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-prof-text-tertiary mb-4 px-1">Upload Summary</h3>
         
         {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 bg-gray-50 dark:bg-prof-bg-surface-raised rounded-3xl border border-dashed border-gray-200 dark:border-prof-border-strong">
               <FileText className="w-10 h-10 text-gray-300 dark:text-prof-text-tertiary mb-3" />
               <p className="text-sm font-bold text-gray-500 dark:text-prof-text-secondary">No files added yet</p>
            </div>
         ) : (
            files.map((file, idx) => {
               const analysis = inkAnalyses[idx];
               const pCount = analysis?.pageCount || 1;
               const rate = isColor && selectedShop ? selectedShop.color_price_per_page : (analysis?.inkRatePerPage || 2);
               const basePrice = pCount * rate;
               const fileTotal = (basePrice + (isBinding && selectedShop ? selectedShop.binding_charge : 0)) * copies;
               
               return (
                  <div key={idx} className="bg-white dark:bg-prof-bg-surface rounded-2xl p-5 border border-gray-100 dark:border-prof-border-subtle shadow-sm dark:shadow-none relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 dark:bg-prof-accent-blue"></div>
                     <h4 className="text-sm font-bold text-gray-900 dark:text-prof-text-primary truncate mb-3 pr-6">{file.name}</h4>
                     <button onClick={() => removeFile(idx)} className="absolute top-4 right-4 p-1.5 text-gray-400 dark:text-prof-text-tertiary hover:text-red-500 dark:hover:text-prof-accent-red hover:bg-red-50 dark:hover:bg-prof-accent-red/20 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                     </button>
                     
                     <div className="bg-gray-50 dark:bg-prof-bg-surface-raised rounded-xl p-3 flex justify-between items-center text-xs text-gray-600 dark:text-prof-text-secondary font-medium">
                        <div className="flex flex-col gap-1">
                           <span>{pCount} pgs × ₹{rate} {isBinding ? `+ ₹${selectedShop?.binding_charge} bind` : ''}</span>
                           <span>× {copies} {copies > 1 ? 'copies' : 'copy'}</span>
                        </div>
                        <span className="text-base font-bold text-blue-600 dark:text-prof-accent-blue">₹{fileTotal}</span>
                     </div>
                     {!isColor && analysis && (
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-prof-text-tertiary">
                           <div className={`w-2 h-2 rounded-full ${analysis.complexity === 'dark' ? 'bg-amber-400 dark:bg-prof-accent-orange' : 'bg-emerald-400 dark:bg-prof-accent-green'}`}></div>
                           {analysis.complexity === 'dark' ? 'Heavy Ink Detected (₹5/pg)' : 'Light Ink Detected (₹2/pg)'}
                        </div>
                     )}
                  </div>
               )
            })
         )}
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-prof-border-subtle shrink-0">
         <div className="flex justify-between items-end mb-6">
            <div>
               <span className="text-xs font-bold text-gray-400 dark:text-prof-text-tertiary uppercase tracking-widest block mb-1">Total Amount</span>
               {isAnalyzingInk && <span className="text-xs text-blue-500 dark:text-prof-accent-blue font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing files...</span>}
            </div>
            <span className="text-4xl font-extrabold text-blue-600 dark:text-prof-accent-blue font-syne tracking-tight">₹{totalAmount}</span>
         </div>
         <button 
            onClick={handlePlaceOrder} 
            disabled={placing || files.length === 0} 
            className="w-full h-14 rounded-full bg-blue-600 dark:bg-prof-accent-blue text-white font-bold text-base hover:bg-blue-700 dark:hover:bg-blue-500 transition-all shadow-[0_8px_20px_rgba(37,99,235,0.2)] dark:shadow-none disabled:opacity-50 disabled:hover:scale-100 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
         >
            {placing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : 'Place Print Order'}
         </button>
      </div>
    </>
  );

  return (
    <div className="max-w-[1400px] mx-auto min-h-screen bg-[#FAFAFA] dark:bg-prof-bg-base font-sans text-gray-900 dark:text-prof-text-primary pb-24 transition-colors duration-200">
      <div className="flex flex-col lg:flex-row gap-8 px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Left Main Configuration Area */}
        <div className="flex-1 lg:max-w-[700px] xl:max-w-[800px]">
           <button onClick={() => { setSelectedShop(null); setFiles([]); }} className="flex items-center gap-2 text-sm font-bold text-gray-400 dark:text-prof-text-tertiary hover:text-gray-900 dark:hover:text-prof-text-primary transition-colors mb-8 group">
             <div className="w-8 h-8 rounded-full bg-white dark:bg-prof-bg-surface border border-gray-200 dark:border-prof-border-strong flex items-center justify-center group-hover:border-gray-400 dark:group-hover:border-prof-text-secondary transition-colors">
               <ArrowLeft className="w-4 h-4" />
             </div>
             Back to Shops
           </button>

           <h1 className="font-syne font-extrabold text-3xl text-gray-900 dark:text-prof-text-primary mb-2">{selectedShop.name}</h1>
           <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium mb-8">Configure your print job settings and upload necessary documents.</p>

           {/* Upload Dropzone */}
           <div className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none border border-gray-100 dark:border-prof-border-subtle mb-6">
              <h3 className="text-xs font-bold text-gray-400 dark:text-prof-text-tertiary uppercase tracking-widest mb-4">Document Upload</h3>
              <label className="flex flex-col items-center justify-center py-12 px-6 bg-blue-50/30 dark:bg-prof-accent-blue/5 border-2 border-dashed border-blue-200 dark:border-prof-accent-blue/30 rounded-3xl cursor-pointer hover:bg-blue-50/80 dark:hover:bg-prof-accent-blue/10 hover:border-blue-400 dark:hover:border-prof-accent-blue/50 transition-all group text-center">
                 <div className="w-16 h-16 bg-white dark:bg-prof-bg-surface-raised rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(59,130,246,0.15)] dark:shadow-none mb-5 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                    <Upload className="w-7 h-7 text-blue-600 dark:text-prof-accent-blue" strokeWidth={2} />
                 </div>
                 <span className="text-lg font-bold text-blue-900 dark:text-prof-accent-blue">Click to upload files</span>
                 <span className="text-sm text-blue-600/70 dark:text-prof-accent-blue/70 mt-2 font-medium">Supports PDF, DOCX, JPG, PNG</span>
                 <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
              </label>
           </div>

           {/* Print Settings (Tactile Controls) */}
           <div className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none border border-gray-100 dark:border-prof-border-subtle mb-6">
             <h3 className="text-xs font-bold text-gray-400 dark:text-prof-text-tertiary uppercase tracking-widest mb-6">Print Configuration</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Copies and Pages - Tactical Inputs */}
                <div className="space-y-6">
                   <div>
                      <label className="text-sm font-bold text-gray-900 dark:text-prof-text-primary mb-3 block">Total Pages (per file)</label>
                      <input type="number" min={1} value={pages} onChange={e => setPages(Math.max(1, parseInt(e.target.value) || 1))} className="w-full h-14 px-5 rounded-2xl border border-gray-200 dark:border-prof-border-strong bg-gray-50 dark:bg-prof-bg-surface-raised text-gray-900 dark:text-prof-text-primary font-bold text-lg focus:bg-white dark:focus:bg-prof-bg-surface focus:border-blue-500 dark:focus:border-prof-accent-blue focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-prof-accent-blue/20 outline-none transition-all" />
                   </div>
                   <div>
                      <label className="text-sm font-bold text-gray-900 dark:text-prof-text-primary mb-3 block">Number of Copies</label>
                      <input type="number" min={1} value={copies} onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))} className="w-full h-14 px-5 rounded-2xl border border-gray-200 dark:border-prof-border-strong bg-gray-50 dark:bg-prof-bg-surface-raised text-gray-900 dark:text-prof-text-primary font-bold text-lg focus:bg-white dark:focus:bg-prof-bg-surface focus:border-blue-500 dark:focus:border-prof-accent-blue focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-prof-accent-blue/20 outline-none transition-all" />
                   </div>
                </div>
                
                {/* Color and Binding - Toggle switches / Cards */}
                <div className="space-y-4">
                   <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${isColor ? 'border-blue-500 dark:border-prof-accent-blue bg-blue-50/50 dark:bg-prof-accent-blue-soft-bg shadow-sm dark:shadow-none' : 'border-gray-100 dark:border-prof-border-subtle hover:border-gray-200 dark:hover:border-prof-border-strong bg-white dark:bg-prof-bg-surface'}`}>
                      <div>
                         <span className={`text-base font-bold ${isColor ? 'text-blue-900 dark:text-prof-accent-blue' : 'text-gray-900 dark:text-prof-text-primary'}`}>Color Print</span>
                         <p className="text-sm font-medium text-gray-500 dark:text-prof-text-secondary mt-1">₹{selectedShop.color_price_per_page} per page</p>
                      </div>
                      <div className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 ${isColor ? 'bg-blue-600 dark:bg-prof-accent-blue' : 'bg-gray-200 dark:bg-prof-border-strong'}`}>
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${isColor ? 'translate-x-7' : 'translate-x-1'}`} />
                      </div>
                   </label>
                   
                   <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${isBinding ? 'border-blue-500 dark:border-prof-accent-blue bg-blue-50/50 dark:bg-prof-accent-blue-soft-bg shadow-sm dark:shadow-none' : 'border-gray-100 dark:border-prof-border-subtle hover:border-gray-200 dark:hover:border-prof-border-strong bg-white dark:bg-prof-bg-surface'}`}>
                      <div>
                         <span className={`text-base font-bold ${isBinding ? 'text-blue-900 dark:text-prof-accent-blue' : 'text-gray-900 dark:text-prof-text-primary'}`}>Spiral Binding</span>
                         <p className="text-sm font-medium text-gray-500 dark:text-prof-text-secondary mt-1">₹{selectedShop.binding_charge} flat fee</p>
                      </div>
                      <div className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 ${isBinding ? 'bg-blue-600 dark:bg-prof-accent-blue' : 'bg-gray-200 dark:bg-prof-border-strong'}`}>
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${isBinding ? 'translate-x-7' : 'translate-x-1'}`} />
                      </div>
                   </label>
                </div>
             </div>
           </div>

           {/* Delivery & Payment Settings */}
           <div className="bg-white dark:bg-prof-bg-surface rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none border border-gray-100 dark:border-prof-border-subtle mb-6">
              <h3 className="text-xs font-bold text-gray-400 dark:text-prof-text-tertiary uppercase tracking-widest mb-6">Fulfillment Details</h3>
              
              {/* Delivery Toggle Card */}
              <div className="bg-gray-50 dark:bg-prof-bg-surface-raised rounded-3xl p-5 mb-8">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${deliverToRoom ? 'bg-blue-600 dark:bg-prof-accent-blue text-white' : 'bg-white dark:bg-prof-bg-surface text-gray-400 dark:text-prof-text-tertiary shadow-sm dark:shadow-none border border-gray-100 dark:border-prof-border-subtle'}`}>
                       <Truck className="w-6 h-6" strokeWidth={1.5} />
                     </div>
                     <div>
                       <span className="text-base font-bold text-gray-900 dark:text-prof-text-primary block">Deliver to Cabin</span>
                       <span className="text-sm text-gray-500 dark:text-prof-text-secondary">We'll bring the printouts to you</span>
                     </div>
                   </div>
                   <button onClick={() => setDeliverToRoom(!deliverToRoom)} className={`relative w-14 h-8 rounded-full transition-colors duration-300 flex-shrink-0 ${deliverToRoom ? 'bg-blue-600 dark:bg-prof-accent-blue' : 'bg-gray-300 dark:bg-prof-border-strong'}`}>
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${deliverToRoom ? 'translate-x-7' : 'translate-x-1'}`} />
                   </button>
                 </div>
                 {deliverToRoom && (
                   <div className="mt-5 pt-5 border-t border-gray-200/60 dark:border-prof-border-subtle animate-in fade-in">
                     <label className="text-xs font-bold text-gray-500 dark:text-prof-text-secondary uppercase tracking-widest mb-2 block">Room Number</label>
                     <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-prof-text-tertiary" />
                        <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. A-201" className="w-full h-14 pl-12 pr-5 rounded-2xl border border-gray-200 dark:border-prof-border-strong bg-white dark:bg-prof-bg-surface text-gray-900 dark:text-prof-text-primary font-bold text-lg focus:outline-none focus:border-blue-500 dark:focus:border-prof-accent-blue focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-prof-accent-blue/20 transition-all placeholder:text-gray-400 dark:placeholder:text-prof-text-tertiary" />
                     </div>
                   </div>
                 )}
              </div>

              {/* Payment Method Cards */}
              <h4 className="text-sm font-bold text-gray-900 dark:text-prof-text-primary mb-4 block">Payment Option</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'now' as const, label: 'Pay Now', desc: 'UPI at shop' },
                  { value: 'counter' as const, label: 'At Counter', desc: 'Cash or Card' },
                  { value: 'later' as const, label: 'Add to Dues', desc: 'Settle later' },
                ].map(opt => (
                  <label key={opt.value} className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-3 group hover:-translate-y-1 ${paymentMethod === opt.value ? 'border-blue-600 dark:border-prof-accent-blue bg-blue-50/50 dark:bg-prof-accent-blue-soft-bg shadow-md dark:shadow-none' : 'border-gray-100 dark:border-prof-border-subtle bg-white dark:bg-prof-bg-surface hover:border-gray-300 dark:hover:border-prof-border-strong shadow-sm dark:shadow-none'}`}>
                    <div className="flex justify-between items-start">
                       <span className={`text-base font-bold ${paymentMethod === opt.value ? 'text-blue-900 dark:text-prof-accent-blue' : 'text-gray-700 dark:text-prof-text-primary'}`}>{opt.label}</span>
                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === opt.value ? 'border-blue-600 dark:border-prof-accent-blue' : 'border-gray-300 dark:border-prof-border-strong'}`}>
                          {paymentMethod === opt.value && <div className="w-2.5 h-2.5 bg-blue-600 dark:bg-prof-accent-blue rounded-full" />}
                       </div>
                    </div>
                    <p className={`text-sm ${paymentMethod === opt.value ? 'text-blue-700/80 dark:text-prof-accent-blue/80 font-medium' : 'text-gray-500 dark:text-prof-text-secondary'}`}>{opt.desc}</p>
                  </label>
                ))}
              </div>
           </div>
        </div>

        {/* Right Fixed Cart Panel (Desktop) */}
        <div className="hidden lg:block w-[400px] xl:w-[450px]">
           <div className="sticky top-8 bg-white dark:bg-prof-bg-surface rounded-[32px] shadow-[0_20px_60px_rgb(0,0,0,0.05)] dark:shadow-none border border-gray-100 dark:border-prof-border-subtle p-8 flex flex-col h-[calc(100vh-4rem)]">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-prof-text-primary font-syne flex items-center gap-3 mb-6 shrink-0">
                 <FileText className="w-6 h-6 text-blue-600 dark:text-prof-accent-blue" /> Order Summary
              </h2>
              {CartPanelContent}
           </div>
        </div>

      </div>

      {/* Mobile Floating View Cart Trigger */}
      {files.length > 0 && !showMobileCart && (
         <div className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-10">
            <button onClick={() => setShowMobileCart(true)} className="flex items-center gap-4 bg-gray-900 dark:bg-prof-bg-surface-raised text-white dark:text-prof-text-primary pl-6 pr-4 py-4 rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] border dark:border-prof-border-subtle hover:scale-105 transition-transform active:scale-95">
               <span className="font-syne font-bold text-xl border-r border-gray-700 dark:border-prof-border-subtle pr-4">₹{totalAmount}</span>
               <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-300 dark:text-prof-accent-blue">
                  View Cart <ChevronRight className="w-5 h-5" />
               </div>
            </button>
         </div>
      )}

      {/* Mobile Cart Slide-out Panel */}
      {showMobileCart && (
         <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowMobileCart(false)} />
            <div className="relative bg-white dark:bg-prof-bg-surface rounded-t-[32px] h-[85vh] flex flex-col p-6 sm:p-8 shadow-2xl dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t dark:border-prof-border-subtle animate-in slide-in-from-bottom duration-500 cubic-bezier(0.4, 0, 0.2, 1)">
               <div className="flex justify-between items-center mb-6 shrink-0">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-prof-text-primary font-syne">Order Summary</h2>
                  <button onClick={() => setShowMobileCart(false)} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-prof-bg-surface-raised rounded-full text-gray-500 dark:text-prof-text-secondary hover:bg-gray-200 dark:hover:bg-prof-border-strong transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               {CartPanelContent}
            </div>
         </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
