import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { LayoutGrid, Printer, Settings, LogOut, Bell, Search, Clock, Check, X, AlertCircle, MessageSquare, Loader2, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { cleanupOldPrintFiles, getShopPrintOrders, requestReorder, updatePrintOrderStatus, updatePrintShopAvailability, getPrintShopByOwnerId, getStudentProfileSummary, refreshSignedStorageUrl } from '../../api/print';
import { usePrintOrders, useShopStatus } from '../../hooks/useRealtime';
import { getAvatarDataUrl } from '../../lib/avatar';
import { extractCloudinaryPublicId } from '../../lib/cloudinary';
import toast from 'react-hot-toast';
import { decorateShopStatus } from '../../lib/shopStatus';

const onlyLogoTransparent = '/logo/only_logo_transparent.png';
const textTransparent = '/logo/text_transparent.png';
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

type InkMeta = {
  average_dark_ratio?: number;
  page_dark_ratios?: number[];
  ink_multiplier?: number;
  complexity?: string;
  analysis_pages_used?: number;
};

export const PrintDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('Live Orders');
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);

  const [shop, setShop] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean, order: any | null }>({ isOpen: false, order: null });
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean, order: any | null }>({ isOpen: false, order: null });
  const [previewMode, setPreviewMode] = useState<'direct' | 'gview'>('direct');
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState('');
  const [previewResolving, setPreviewResolving] = useState(false);

  const rejectReasons = [
    "Printer is out of ink/paper",
    "File format is not supported",
    "Shop is closing soon",
    "Too many pending orders"
  ];

  const enrichOrderWithStudent = async (order: any) => {
    if (!order?.student_id) return order;

    if (order?.profiles?.name || order?.student_profile?.name) {
      return order;
    }

    const { data: studentProfile } = await getStudentProfileSummary(order.student_id);

    if (!studentProfile) return order;
    return {
      ...order,
      profiles: studentProfile,
      student_profile: studentProfile,
    };
  };

  const getStudentProfile = (order: any) => order?.student_profile || order?.profiles || {};

  // Load Shop Details
  useEffect(() => {
    async function loadShop() {
      if (!profile?.id) return;
      const { data } = await getPrintShopByOwnerId(profile.id);
      if (data) {
        setShop(data);
        cleanupOldPrintFiles(data.id).catch(() => {});
        const { data: orderData } = await getShopPrintOrders(data.id);
        if (orderData) {
          const enriched = await Promise.all(orderData.map((order: any) => enrichOrderWithStudent(order)));
          setOrders(enriched);
        }
      }
      setIsLoading(false);
    }
    loadShop();
  }, [profile?.id]);

  // Realtime hook for incoming / updated orders
  usePrintOrders(shop?.id, async (newOrder) => {
    const enrichedOrder = await enrichOrderWithStudent(newOrder);
    setOrders(prev => [enrichedOrder, ...prev.filter((o) => o.id !== enrichedOrder.id)]);
  }, async (updatedOrder) => {
    const enrichedOrder = await enrichOrderWithStudent(updatedOrder);
    setOrders(prev => prev.map(o => o.id === enrichedOrder.id ? { ...o, ...enrichedOrder } : o));
  });

  useShopStatus('print_shops', shop?.id, (updatedShop) => {
    setShop((current: any) => ({ ...current, ...decorateShopStatus(updatedShop) }));
  });

  const handleOverride = async (nextOverride: string | null) => {
    if (!shop?.id) return;
    const { data, error } = await updatePrintShopAvailability(shop.id, nextOverride);
    if (error) {
      toast.error(error.message || 'Failed to update shop status');
      return;
    }
    setShop(data);
    toast.success(nextOverride === 'open' ? 'Shop forced open.' : nextOverride === 'closed' ? 'Shop forced closed.' : 'Shop back on schedule.');
  };

  const handleAccept = async (id: string) => {
    const { error } = await updatePrintOrderStatus(id, 'printing');
    if (error) toast.error("Failed to accept order");
    else toast.success("Order accepted!");
  };

  const handleMarkReady = async (id: string) => {
    const { error } = await updatePrintOrderStatus(id, 'ready');
    if (error) toast.error("Failed to mark ready");
    else toast.success("Order marked ready for pickup!");
  };

  const handleDismissReady = async (id: string) => {
    const { error } = await updatePrintOrderStatus(id, 'collected');
    if (error) {
      toast.error("Failed to mark order as collected");
      return;
    }
    // Move order to history in local state immediately
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'collected' } : o));
    toast.success("Order marked as collected.");
  };

  const handleRequestReorder = async (order: any) => {
    const { error } = await requestReorder(order.id, order.student_id, order.shop_id);
    if (error) {
      toast.error("Failed to send reorder request");
      return;
    }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'reorder_requested' } : o));
    toast.success("Reorder request sent to student!");
  };

  const handleRejectClick = (order: any) => {
    setRejectModal({ isOpen: true, order });
    setSelectedReason('');
    setCustomReason('');
  };

  const isPdfOrder = (order: any) => {
    const fromName = typeof order?.file_name === 'string' ? order.file_name.toLowerCase().endsWith('.pdf') : false;
    const fromUrl = typeof order?.file_url === 'string' ? /\.pdf($|[?#])/i.test(order.file_url) : false;
    return fromName || fromUrl;
  };

  const getOrderOrientation = (order: any): 'portrait' | 'landscape' => {
    const notes = String(order?.special_notes || '');
    const match = notes.match(/orientation\s*:\s*(portrait|landscape)/i);
    return match?.[1]?.toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
  };

  const getOrderInkMeta = (order: any): InkMeta | null => {
    const notes = String(order?.special_notes || '');
    const token = 'INK_META:';
    const tokenIndex = notes.indexOf(token);
    if (tokenIndex < 0) return null;

    const jsonStart = notes.indexOf('{', tokenIndex + token.length);
    if (jsonStart < 0) return null;

    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < notes.length; i += 1) {
      const char = notes[i];
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          jsonEnd = i;
          break;
        }
      }
    }

    if (jsonEnd < 0) return null;

    try {
      const parsed = JSON.parse(notes.slice(jsonStart, jsonEnd + 1));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const normalizeRemoteFileUrl = (value: string) => {
    if (!value) return '';
    // Some uploads include '#' in filename; browsers treat it as URL fragment unless encoded.
    return String(value).trim().replace(/#/g, '%23').replace(/ /g, '%20');
  };

  const resolvePreviewFileUrl = async (rawUrl: string) => {
    let url = normalizeRemoteFileUrl(rawUrl);
    if (!url) return '';

    if (url.includes('res.cloudinary.com')) {
      const publicId = extractCloudinaryPublicId(url);
      if (publicId && cloudinaryCloudName) {
        return `https://res.cloudinary.com/${cloudinaryCloudName}/raw/upload/${publicId}.pdf`;
      }

      url = url.replace('/raw/authenticated/', '/raw/upload/').replace('/raw/private/', '/raw/upload/');
      return url;
    }

    const { data: refreshed } = await refreshSignedStorageUrl(url);
    if (refreshed) {
      return refreshed;
    }

    return url;
  };

  const openPreview = async (order: any) => {
    if (!order?.file_url) {
      toast.error('No file is attached to this order yet.');
      return;
    }

    setPreviewResolving(true);
    setPreviewMode('direct');
    setPreviewLoadError(false);
    setPreviewFileUrl('');
    setPreviewModal({ isOpen: true, order });

    try {
      const resolvedUrl = await resolvePreviewFileUrl(order.file_url);
      setPreviewFileUrl(resolvedUrl || String(order.file_url || '').trim());
    } catch (_) {
      setPreviewFileUrl(String(order.file_url || '').trim());
    } finally {
      setPreviewResolving(false);
    }
  };

  const getPdfPreviewSrc = (url: string, mode: 'direct' | 'gview' = previewMode) => {
    const cleanUrl = normalizeRemoteFileUrl(url);
    if (!cleanUrl) return '';

    if (mode === 'gview') {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(cleanUrl)}`;
    }

    return `${cleanUrl}#toolbar=1&navpanes=0&view=FitH`;
  };

  const handlePrintFromPreview = () => {
    const frame = document.getElementById('pdf-preview-frame') as HTMLIFrameElement | null;
    const url = previewFileUrl ? normalizeRemoteFileUrl(previewFileUrl) : '';

    if (previewMode === 'direct' && frame?.contentWindow) {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        return;
      } catch (_) {
        // Cross-origin frame may block direct print; fallback to new tab.
      }
    }

    if (url) {
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        toast.error('Popup blocked. Please allow popups and try again.');
      }
      return;
    }

    toast.error('Unable to print this file.');
  };

  const confirmReject = async () => {
    if (rejectModal.order) {
      const reason = selectedReason || customReason;
      const { error } = await updatePrintOrderStatus(rejectModal.order.id, 'cancelled', {
        rejectionReason: reason,
      });
      if (error) {
        toast.error("Failed to reject order");
      } else {
        toast.success("Order cancelled.");
      }
    }
    setRejectModal({ isOpen: false, order: null });
  };

  const navItems = [
    { icon: LayoutGrid, label: 'Live Orders' },
    { icon: Printer, label: 'Order History' },
    { icon: Settings, label: 'Settings' },
  ];

  const newOrdersList = orders.filter(o => o.status === 'pending');
  const inProcessOrders = orders.filter(o => o.status === 'printing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const historyOrders = orders.filter(o => ['collected', 'cancelled', 'reorder_requested', 'reorder_completed'].includes(o.status));

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">Loading Dashboard...</div>
  }

  return (
    <div className="flex min-h-dvh bg-[#FAFAF8] text-[#0D0D0D] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#FAFAF8] border-r border-[#0D0D0D]/10 flex-col relative z-20">
        <div className="h-24 flex items-center px-6 border-b border-[#0D0D0D]/10">
          <div className="h-[52px] flex items-center shrink-0 mb-3 ml-3 mt-3">
             <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer flex flex-col items-center justify-center drop-shadow-sm transition-transform hover:scale-105">
               <img src={onlyLogoTransparent} alt="Campus Blink Icon" loading="eager" className="h-[60px] w-auto object-contain shrink-0" />
               <img src={textTransparent} alt="Campus Blink" loading="eager" className="h-[78px] w-auto object-contain -mt-5 shrink-0" />
             </Link>
          </div>
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-3 overflow-y-auto">
          {navItems.map((item, i) => (
            <button 
              key={i} 
              onClick={() => setActiveView(item.label)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all ${
              activeView === item.label 
                ? 'bg-[#FFF8D4] text-[#0D0D0D] border-l-4 border-[#FFD600]' 
                : 'text-[#6B6B6B] hover:text-[#0D0D0D] hover:bg-[#F2F0EB]'
            }`}>
              <item.icon className={`w-5 h-5 ${activeView === item.label ? 'text-[#CA8A04] drop-shadow-sm' : ''}`} />
              <span className="text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[#0D0D0D]/10 bg-[#FAFAF8]/50">
          <div className="flex items-center gap-4 mb-6">
             {shop?.logo_url ? (
               <img src={shop.logo_url} alt="Shop Logo" className="w-12 h-12 rounded-full border-2 border-[#E8E8E8]" />
             ) : (
               <div className="w-12 h-12 rounded-full bg-white border-2 border-[#E8E8E8]">
                 {shop?.name?.charAt(0) || 'P'}
               </div>
             )}
            <div>
              <p className="font-syne font-bold text-base leading-tight truncate w-32">{shop?.name || 'My Print Shop'}</p>
              <p className={`text-xs flex items-center gap-1.5 mt-1 font-medium tracking-wide ${shop?.is_active ? 'text-yellow-400' : 'text-red-400'}`}>
                {shop?.is_active ? (
                  <><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" /> Active</>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-red-500" /> Closed</>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/login')} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors font-bold text-sm">
            <LogOut className="w-4 h-4" /> Logout Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full w-full relative z-10 bg-[#FAFAF8]">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#CA8A04]/10 rounded-md blur-[150px] pointer-events-none" />
        
        {/* Header */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-10 border-b border-[#0D0D0D]/10 bg-white/80  z-10 sticky top-0">
          <div className="flex items-center gap-3 md:gap-5 min-w-0">
            <h1 className="font-syne font-bold text-xl md:text-3xl tracking-tight truncate">{activeView}</h1>
            {activeView === 'Live Orders' && (
              <Badge className="bg-[#CA8A04] text-white font-bold px-3 py-1 text-sm shadow-[0_0_15px_rgba(16,161,66,0.3)]">
                {newOrdersList.length} New
              </Badge>
            )}
          </div>
        </header>

        <div className="md:hidden px-4 py-3 border-b border-[#0D0D0D]/10 bg-white/80 ">
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value)}
            className="w-full bg-white border border-[#0D0D0D]/10 rounded-lg px-3 py-2.5 text-sm font-sans"
          >
            {navItems.map((item) => (
              <option key={item.label} value={item.label}>{item.label}</option>
            ))}
          </select>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-10 pb-24 md:pb-10 safe-area-bottom">
          <div className="mx-auto mb-6 max-w-7xl rounded-[20px] border border-[#E8E8E8] bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#CA8A04]">Live shop status</p>
                <h2 className="mt-2 font-syne text-2xl font-bold text-[#0D0D0D]">{shop?.is_open_now ? 'Accepting print jobs' : 'Currently closed'}</h2>
                <p className="mt-1 text-sm text-[#6B6B6B]">{shop?.shop_status_reason || 'Availability follows your schedule unless manually overridden.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleOverride('open')} className="rounded-md border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-2 text-sm font-bold text-[#166534]">Force open</button>
                <button onClick={() => handleOverride('closed')} className="rounded-md border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-2 text-sm font-bold text-[#991B1B]">Force closed</button>
                <button onClick={() => handleOverride(null)} className="rounded-md border border-black/10 bg-[#FAFAF8] px-4 py-2 text-sm font-bold text-[#0D0D0D]">Use schedule</button>
              </div>
            </div>
          </div>

          {activeView === 'Live Orders' && (
            <div className="max-w-7xl mx-auto space-y-12 flex flex-col">
              
              {/* Ready / In Process Section */}
              <AnimatePresence>
                {(inProcessOrders.length > 0 || readyOrders.length > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 order-2"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-syne font-bold text-2xl flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse" /> 
                        Printing & Ready
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      <AnimatePresence>
                        {/* Ready Orders */}
                        {readyOrders.map((order) => {
                          const inkMeta = getOrderInkMeta(order);

                          return (
                          <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <Card className="bg-yellow-50 border-yellow-500/30 flex flex-col p-0 overflow-hidden shadow-soft group">
                              <div className="p-4 border-b border-yellow-500/20 bg-yellow-100 flex justify-between items-center">
                                <span className="font-syne font-bold text-lg text-[#0D0D0D]">#{order.id.slice(0, 6)}</span>
                                <Badge className="bg-yellow-500 text-white font-bold text-xs">Ready for Pickup</Badge>
                              </div>
                              <div className="p-4 flex items-center gap-3 bg-white">
                                <div className="w-10 h-10 rounded-full border border-yellow-500/30 overflow-hidden">
                                  <img
                                    src={getStudentProfile(order).avatar_url || getAvatarDataUrl({ name: getStudentProfile(order).name, seed: order.student_id || order.id })}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="text-[#0D0D0D] font-bold text-sm">{getStudentProfile(order).name || 'Student'}</p>
                                  <p className="text-xs text-yellow-600">
                                    {order.pages} Pages • ₹{order.total_price}
                                    {inkMeta?.ink_multiplier ? ` • Ink x${Number(inkMeta.ink_multiplier).toFixed(2)}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="p-4 bg-white">
                                <div className="space-y-2">
                                  {order.file_url && (
                                    <button
                                      onClick={() => openPreview(order)}
                                      className="w-full py-2.5 rounded-lg border border-[#0D0D0D]/20 text-[#0D0D0D] hover:bg-[#F2F0EB] transition-all font-bold text-sm tracking-wide uppercase"
                                    >
                                      Preview & Print
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleDismissReady(order.id)}
                                    className="w-full py-2.5 rounded-lg border border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white transition-all font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2"
                                  >
                                    <Check className="w-4 h-4" /> Mark Collected
                                  </button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        )})}

                        {/* In Process Orders */}
                        {inProcessOrders.map((order) => {
                          const inkMeta = getOrderInkMeta(order);

                          return (
                          <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <Card className="bg-white border-amber-500/30 flex flex-col p-0 overflow-hidden shadow-soft group">
                              <div className="p-4 border-b border-amber-500/20 bg-amber-50 flex justify-between items-center">
                                <span className="font-syne font-bold text-lg text-[#0D0D0D]">#{order.id.slice(0, 6)}</span>
                                <Badge className="bg-amber-100 text-amber-600 border border-amber-500/30 font-bold text-xs flex items-center gap-1">
                                  <Printer className="w-3 h-3" /> Printing
                                </Badge>
                              </div>
                              <div className="p-4 flex items-center gap-3 bg-white">
                                <div className="w-10 h-10 rounded-full border border-amber-500/30 overflow-hidden">
                                  <img
                                    src={getStudentProfile(order).avatar_url || getAvatarDataUrl({ name: getStudentProfile(order).name, seed: order.student_id || order.id })}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="text-[#0D0D0D] font-bold text-sm">{getStudentProfile(order).name || 'Student'}</p>
                                  <p className="text-xs text-amber-600">
                                    {order.file_name?.slice(0, 15)}... • ₹{order.total_price}
                                    {inkMeta?.ink_multiplier ? ` • Ink x${Number(inkMeta.ink_multiplier).toFixed(2)}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="p-4 bg-white border-t border-amber-500/10">
                                <div className="space-y-2">
                                  {order.file_url && (
                                    <button
                                      onClick={() => openPreview(order)}
                                      className="w-full py-2.5 rounded-lg border border-[#0D0D0D]/20 text-[#0D0D0D] hover:bg-[#F2F0EB] transition-all font-bold text-sm tracking-wide uppercase"
                                    >
                                      Preview & Print
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleMarkReady(order.id)}
                                    className="w-full py-2.5 rounded-lg bg-amber-500 text-white hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2"
                                  >
                                    <Check className="w-4 h-4" /> Mark Ready
                                  </button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        )})}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Incoming Requests Section */}
              <div className="space-y-6 order-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-syne font-bold text-2xl flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse" /> 
                    New Print Requests
                  </h2>
                </div>

                {newOrdersList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[30vh] text-center bg-[#F2F0EB] rounded-lg border border-black/10 border-dashed">
                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-soft">
                       <Check className="w-10 h-10 text-[#CA8A04]" />
                     </div>
                     <h3 className="font-syne font-bold text-xl text-[#0D0D0D] mb-2">No New Requests</h3>
                     <p className="text-[#6B6B6B] font-sans max-w-sm text-sm">You've cleared the queue! Waiting for students to place new print orders.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {newOrdersList.map((order) => {
                        const orderOrientation = getOrderOrientation(order);
                        const inkMeta = getOrderInkMeta(order);
                        const averageDarkPercent = inkMeta?.average_dark_ratio != null
                          ? Math.round(Number(inkMeta.average_dark_ratio) * 100)
                          : null;

                        return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                          layout
                        >
                          <Card className="bg-white border-[#0D0D0D]/10 hover:border-[#CA8A04] transition-all duration-300 flex flex-col p-0 overflow-hidden group shadow-soft">
                            {/* Card Header */}
                            <div className="p-5 border-b border-[#0D0D0D]/10 flex justify-between items-center bg-[#F2F0EB]">
                              <div className="flex items-center gap-2">
                                <span className="font-syne font-bold text-xl text-[#0D0D0D] tracking-wide">#{order.id.slice(0, 6)}</span>
                              </div>
                              <span className="text-xs font-bold px-3 py-1 rounded-md bg-[#CA8A04]/20 text-[#0D0D0D] flex items-center gap-1.5 border border-[#CA8A04]/30 shadow-sm">
                                <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>

                            {/* Student Info */}
                            <div className="p-5 pb-4 border-b border-[#0D0D0D]/10 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full overflow-hidden border border-[#0D0D0D]/10 shadow-sm">
                                <img
                                  src={getStudentProfile(order).avatar_url || getAvatarDataUrl({ name: getStudentProfile(order).name, seed: order.student_id || order.id })}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-[#0D0D0D] font-bold font-sans text-lg leading-tight">{getStudentProfile(order).name || 'Student'}</p>
                                <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">{order.student_id?.slice(0, 8)}</p>
                              </div>
                            </div>

                            {/* Order Settings / Student Print Settings */}
                            <div className="p-5 flex-1 bg-white">
                              <p className="text-sm text-[#0D0D0D] font-medium break-all mb-4">
                                <span className="font-bold text-[#CA8A04]">File:</span> {order.file_name}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-4">
                                {/* Copies & Pages */}
                                <div>
                                  <p className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider mb-2">Quantity</p>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 border border-[#0D0D0D]/10 text-sm font-bold text-[#0D0D0D] shadow-sm">
                                      {order.copies}x
                                    </div>
                                    <span className="text-sm font-medium text-[#6B6B6B]">({order.pages} pages)</span>
                                  </div>
                                </div>

                                {/* Color Mode */}
                                <div>
                                  <p className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider mb-2">Color Mode</p>
                                  <div className="flex items-center gap-2">
                                    {order.is_color ? (
                                      <div className="flex items-center gap-2 w-max px-3 py-1.5 rounded-lg border border-[#CA8A04] bg-[#CA8A04]/5 shadow-sm">
                                        <div className="w-5 h-5 rounded-full bg-white border border-[#0D0D0D]/10 flex items-center justify-center shadow-sm relative overflow-hidden">
                                          <div className="w-2 h-2 rounded-full bg-[#FF0000] absolute -translate-x-[3px] -translate-y-[3px] mix-blend-multiply" />
                                          <div className="w-2 h-2 rounded-full bg-[#00FF00] absolute translate-x-[3px] -translate-y-[3px] mix-blend-multiply" />
                                          <div className="w-2 h-2 rounded-full bg-[#0000FF] absolute translate-y-[3px] mix-blend-multiply" />
                                        </div>
                                        <span className="text-xs font-bold text-[#0D0D0D]">Color</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 w-max px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 shadow-sm">
                                        <div className="w-5 h-5 rounded-full bg-white border border-[#0D0D0D]/10 flex items-center justify-center relative shadow-sm">
                                          <div className="w-2 h-2 rounded-full border-2 border-black absolute -translate-x-[2px] mix-blend-multiply" />
                                          <div className="w-2 h-2 rounded-full border-2 border-gray-400 absolute translate-x-[2px] mix-blend-multiply" />
                                        </div>
                                        <span className="text-xs font-bold text-[#0D0D0D]">B&W</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Orientation */}
                                <div>
                                  <p className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider mb-2">Orientation</p>
                                  <div className="flex items-center gap-2">
                                    {orderOrientation === 'landscape' ? (
                                      <div className="flex items-center gap-2 w-max px-3 py-1.5 rounded-lg border border-[#CA8A04] bg-[#CA8A04]/5 shadow-sm">
                                        <div className="w-5 h-5 rounded bg-white flex items-center justify-center shadow-sm">
                                          <div className="w-3.5 h-2 border-2 border-[#0D0D0D] rounded-[1px]" />
                                        </div>
                                        <span className="text-xs font-bold text-[#0D0D0D]">Landscape</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 w-max px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 shadow-sm">
                                        <div className="w-5 h-5 rounded bg-white flex items-center justify-center shadow-sm">
                                          <div className="w-2 h-3.5 border-2 border-[#0D0D0D] rounded-[1px]" />
                                        </div>
                                        <span className="text-xs font-bold text-[#0D0D0D]">Portrait</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Extras */}
                                <div>
                                  <p className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider mb-2">Add-ons</p>
                                  <div className="flex flex-col gap-1.5">
                                    {order.is_double_sided ? (
                                      <span className="text-xs font-bold text-[#CA8A04] flex items-center gap-1.5">
                                        <Check className="w-3 h-3" /> Double Sided
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-[#6B6B6B]">Single Sided</span>
                                    )}
                                    {order.has_binding && (
                                      <span className="text-xs font-bold text-[#CA8A04] flex items-center gap-1.5">
                                        <Check className="w-3 h-3" /> Spiral Binding
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {inkMeta && (
                                <div className="mb-4 p-3 rounded-lg border border-[#CA8A04]/25 bg-[#CA8A04]/5">
                                  <p className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider mb-2">Ink Analysis</p>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <p className="text-[#6B6B6B]">Coverage</p>
                                      <p className="font-bold text-[#0D0D0D]">{averageDarkPercent != null ? `${averageDarkPercent}%` : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[#6B6B6B]">Complexity</p>
                                      <p className="font-bold text-[#0D0D0D] capitalize">{inkMeta.complexity || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[#6B6B6B]">Multiplier</p>
                                      <p className="font-bold text-[#0D0D0D]">x{Number(inkMeta.ink_multiplier || 1).toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="mt-2 break-all pt-3 border-t border-[#0D0D0D]/5">
                                {order.file_url ? (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <a href={normalizeRemoteFileUrl(order.file_url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#CA8A04] hover:underline text-sm font-bold w-max">
                                      Download File
                                    </a>
                                    {isPdfOrder(order) && (
                                      <button
                                        onClick={() => openPreview(order)}
                                        className="text-sm font-bold text-[#0D0D0D] underline underline-offset-4 hover:text-[#CA8A04]"
                                      >
                                        Preview & Print
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-[#B45309]">File upload pending in test mode</span>
                                )}
                              </div>
                            </div>

                            {/* Card Footer / Actions */}
                            <div className="p-5 pt-4 bg-[#F2F0EB] flex flex-col gap-4 border-t border-[#0D0D0D]/10">
                              <div className="flex justify-between items-end">
                                <span className="text-xs text-[#6B6B6B] font-bold uppercase tracking-widest">Total Amount</span>
                                <span className="font-syne font-bold text-2xl text-[#0D0D0D] leading-none drop-shadow-sm">₹{order.total_price}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 pt-2">
                                <button 
                                  onClick={() => handleRejectClick(order)}
                                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm tracking-wide"
                                >
                                  <X className="w-4 h-4" /> Reject
                                </button>
                                <button 
                                  onClick={() => handleAccept(order.id)}
                                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#CA8A04] text-white hover:shadow-medium hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-sm tracking-wide uppercase"
                                >
                                  <Check className="w-4 h-4 stroke-[3]" /> Accept
                                </button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )})}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'Order History' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white border border-[#0D0D0D]/10 rounded-lg overflow-hidden shadow-soft">
                {historyOrders.length === 0 ? (
                  <div className="p-10 text-center text-[#6B6B6B] font-medium">No order history available yet.</div>
                ) : (
                  <table className="w-full text-left font-sans">
                    <thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">
                      <tr className="border-b border-[#0D0D0D]/10 text-xs text-[#6B6B6B] uppercase tracking-widest bg-[#F2F0EB] hover:bg-[#FAFAF8] transition-colors duration-150">
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Date</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Student</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Order ID</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">File</th>
                        <th className="px-8 py-5 font-bold px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Status</th>
                        <th className="px-8 py-5 font-bold text-right px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Revenue</th>
                        <th className="px-8 py-5 font-bold text-center px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0D0D0D]/10">
                      {historyOrders.map((order, i) => (
                        <tr key={i} className="hover:bg-[#F2F0EB] transition-colors group cursor-pointer">
                          <td className="px-8 py-5 text-sm text-[#0D0D0D] font-medium">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="px-8 py-5 text-sm text-[#0D0D0D] font-medium flex items-center gap-3">
                            {getStudentProfile(order).name || 'Student'}
                          </td>
                          <td className="px-8 py-5 text-sm font-mono text-[#6B6B6B] group-hover:text-[#0D0D0D] transition-colors">#{order.id.slice(0,6)}</td>
                          <td className="px-8 py-5 text-sm text-[#6B6B6B] break-all max-w-[200px]">
                             {order.file_name}
                          </td>
                          <td className="px-8 py-5">
                            {order.status === 'collected' ? (
                              <Badge className="bg-yellow-100 text-yellow-600 border border-yellow-500/30">Completed</Badge>
                            ) : order.status === 'reorder_requested' ? (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-400/40">Reorder Sent</Badge>
                            ) : order.status === 'reorder_completed' ? (
                              <Badge className="bg-blue-100 text-blue-600 border border-blue-400/30">Reordered</Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-500 border border-red-500/30">Cancelled</Badge>
                            )}
                          </td>
                          <td className="px-8 py-5 text-base font-syne font-bold text-right text-[#0D0D0D]">
                            {order.status === 'collected' || order.status === 'reorder_requested' || order.status === 'reorder_completed' ? `₹${order.total_price}` : <span className="text-[#AAAAAA] line-through">₹{order.total_price}</span>}
                          </td>
                          <td className="px-8 py-5 text-center">
                            {order.status === 'collected' && (
                              <button
                                onClick={() => handleRequestReorder(order)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-400/40 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors whitespace-nowrap"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Request Reorder
                              </button>
                            )}
                            {order.status === 'reorder_requested' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                                <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Waiting for student
                              </span>
                            )}
                            {order.status === 'reorder_completed' && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-blue-500 font-bold">
                                <Check className="w-3.5 h-3.5" /> Student reordered
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeView !== 'Live Orders' && activeView !== 'Order History' && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-20 h-20 bg-[#F2F0EB] border border-[#0D0D0D]/10 rounded-lg flex items-center justify-center mb-6 shadow-soft">
                  <Settings className="w-10 h-10 text-[#6B6B6B]" />
                </div>
                <h2 className="font-syne font-bold text-3xl text-[#0D0D0D] mb-3">{activeView}</h2>
                <p className="text-[#6B6B6B] font-sans max-w-md">This module is currently under development. Please check back later.</p>
             </div>
          )}
        </div>
      </main>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectModal.isOpen && rejectModal.order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRejectModal({ isOpen: false, order: null })}
              className="absolute inset-0 bg-black/80 "
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white border border-[#0D0D0D]/10 rounded-lg shadow-strong w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[#0D0D0D]/10 bg-[#F2F0EB] flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-2xl text-[#0D0D0D] mb-1">Reject Order #{rejectModal.order.id.slice(0,6)}</h3>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto bg-white">
                <p className="text-sm font-bold text-[#6B6B6B] uppercase tracking-wider mb-4">Select a Reason</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {rejectReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedReason(reason); setCustomReason(''); }}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        selectedReason === reason ? 'bg-[#CA8A04]/20 border-[#CA8A04] text-[#0D0D0D] shadow-sm' : 'bg-white border-[#0D0D0D]/10 text-[#6B6B6B] hover:border-[#0D0D0D]/30 hover:text-[#0D0D0D]'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <p className="text-sm font-bold text-[#6B6B6B] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Or write a custom message
                  </p>
                  <textarea 
                    value={customReason}
                    onChange={(e) => { setCustomReason(e.target.value); if (e.target.value) setSelectedReason(''); }}
                    className="w-full bg-white border border-[#0D0D0D]/10 rounded-lg p-4 text-sm text-[#0D0D0D] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#CA8A04] focus:ring-1 focus:ring-[#CA8A04]/50 transition-all min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#0D0D0D]/10 bg-[#F2F0EB] flex justify-end gap-3">
                <button 
                  onClick={() => setRejectModal({ isOpen: false, order: null })}
                  className="px-6 py-3 rounded-lg font-bold font-sans text-sm text-[#6B6B6B] hover:text-[#0D0D0D] hover:bg-white border border-transparent hover:border-[#0D0D0D]/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmReject}
                  disabled={!selectedReason && !customReason}
                  className="px-6 py-3 rounded-lg font-bold font-sans text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-medium"
                >
                  <X className="w-4 h-4" /> Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {previewModal.isOpen && previewModal.order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewModal({ isOpen: false, order: null })}
              className="absolute inset-0 bg-black/70 "
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="relative w-full max-w-6xl h-[88vh] bg-white rounded-lg border border-[#0D0D0D]/10 shadow-strong overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 border-b border-[#0D0D0D]/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-syne font-bold text-lg text-[#0D0D0D] truncate">{previewModal.order.file_name || 'Document Preview'}</p>
                  <p className="text-xs text-[#6B6B6B]">Order #{previewModal.order.id?.slice(0, 6)} • {getStudentProfile(previewModal.order).name || 'Student'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isPdfOrder(previewModal.order) && (
                    <button
                      onClick={() => {
                        setPreviewMode((prev) => (prev === 'direct' ? 'gview' : 'direct'));
                        setPreviewLoadError(false);
                      }}
                      className="px-4 py-2 rounded-lg border border-[#0D0D0D]/20 text-[#0D0D0D] font-bold text-sm hover:bg-[#F2F0EB] transition-colors"
                    >
                      {previewMode === 'direct' ? 'Use Alternate Viewer' : 'Use Direct Viewer'}
                    </button>
                  )}
                  <button
                    onClick={handlePrintFromPreview}
                    className="px-4 py-2 rounded-lg bg-[#CA8A04] text-white font-bold text-sm hover:brightness-110 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button
                    onClick={() => setPreviewModal({ isOpen: false, order: null })}
                    className="px-4 py-2 rounded-lg border border-[#0D0D0D]/20 text-[#0D0D0D] font-bold text-sm hover:bg-[#F2F0EB] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

              {isPdfOrder(previewModal.order) ? (
                <div className="w-full h-full relative">
                  {previewResolving && (
                    <div className="absolute inset-0 z-20 bg-white/90 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-[#0D0D0D] font-bold">
                        <Loader2 className="w-5 h-5 animate-spin" /> Preparing secure file link...
                      </div>
                    </div>
                  )}

                  {previewMode === 'direct' ? (
                    <iframe
                      id="pdf-preview-frame"
                      title="PDF Preview"
                      src={getPdfPreviewSrc(previewFileUrl, 'direct')}
                      className="w-full h-full"
                      onLoad={() => setPreviewLoadError(false)}
                      onError={() => setPreviewLoadError(true)}
                    />
                  ) : (
                    <iframe
                      id="pdf-preview-frame"
                      title="PDF Preview"
                      src={getPdfPreviewSrc(previewFileUrl)}
                      className="w-full h-full"
                      onLoad={() => setPreviewLoadError(false)}
                      onError={() => setPreviewLoadError(true)}
                    />
                  )}

                  {previewLoadError && !previewResolving && (
                    <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <p className="text-[#0D0D0D] font-bold">Failed to load PDF document in inline viewer.</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setPreviewMode('gview');
                            setPreviewLoadError(false);
                          }}
                          className="px-4 py-2 rounded-lg border border-[#0D0D0D]/20 text-[#0D0D0D] font-bold text-sm hover:bg-[#F2F0EB]"
                        >
                          Try Alternate Viewer
                        </button>
                        <a
                          href={normalizeRemoteFileUrl(previewFileUrl || '')}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-lg bg-[#CA8A04] text-white font-bold text-sm hover:brightness-110"
                        >
                          Open In New Tab
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <p className="text-[#0D0D0D] font-bold">This file cannot be previewed inline.</p>
                  <a
                    href={normalizeRemoteFileUrl(previewFileUrl || previewModal.order.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg border border-[#0D0D0D]/20 text-[#0D0D0D] font-bold text-sm hover:bg-[#F2F0EB] transition-colors"
                  >
                    Open In New Tab
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
