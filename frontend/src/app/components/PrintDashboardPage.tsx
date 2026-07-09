import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { LayoutGrid, Printer, Settings, LogOut, Bell, Search, Clock, Check, X, AlertCircle, MessageSquare, Loader2, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { cleanupOldPrintFiles, getShopPrintOrders, requestReorder, updatePrintOrderStatus, updatePrintShopAvailability } from '../../api/print';
import { usePrintOrders, useShopStatus } from '../../hooks/useRealtime';
import { getAvatarDataUrl } from '../../lib/avatar';
import { extractCloudinaryPublicId } from '../../lib/cloudinary';
import toast from 'react-hot-toast';
import { decorateShopStatus } from '../../lib/shopStatus';
import { ThemeAwareLogo } from './ThemeAwareLogo';
import { ListSkeleton } from './ui/Skeletons';
import { FeatureErrorBoundary } from './FeatureErrorBoundary';
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

    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('name, avatar_url, username')
      .eq('id', order.student_id)
      .maybeSingle();

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
      const { data } = await supabase.from('print_shops').select('*').eq('owner_id', profile.id).single();
      if (data) {
        setShop(decorateShopStatus(data));
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
    if (error) toast.error("Failed to accept order: " + error.message);
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

    const projectUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const signedPrefix = `${projectUrl}/storage/v1/object/sign/`;
    if (projectUrl && url.startsWith(signedPrefix)) {
      const rest = url.slice(signedPrefix.length);
      const [bucketAndPath] = rest.split('?');
      const splitIndex = bucketAndPath.indexOf('/');

      if (splitIndex > 0) {
        const bucket = bucketAndPath.slice(0, splitIndex);
        const objectPath = decodeURIComponent(bucketAndPath.slice(splitIndex + 1));
        const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60 * 6);
        if (!error && signed?.signedUrl) {
          return signed.signedUrl;
        }
      }
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
        toast.error("Failed to reject order: " + error.message);
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

  const newOrdersList = orders.filter(o => o.status === 'pending').sort((a,b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const inProcessOrders = orders.filter(o => o.status === 'printing').sort((a,b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const readyOrders = orders.filter(o => o.status === 'ready').sort((a,b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const historyOrders = orders.filter(o => ['collected', 'cancelled', 'reorder_requested', 'reorder_completed'].includes(o.status));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 font-sans">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <ListSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sleek Light-Mode Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <Link
            to={user ? '/student/home' : '/'}
            className="no-underline cursor-pointer flex items-center transition-transform hover:scale-105"
          >
            <ThemeAwareLogo
              alt="Campus Blink"
              loading="eager"
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item, i) => {
            const isActive = activeView === item.label;
            return (
              <button
                type="button"
                key={i}
                onClick={() => setActiveView(item.label)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3.5 mb-5">
            {shop?.logo_url ? (
              <img
                src={shop.logo_url}
                alt="Shop Logo"
                className="w-11 h-11 rounded-2xl border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-syne font-bold text-base">
                {shop?.name?.charAt(0) || 'P'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-syne font-bold text-sm text-slate-900 leading-tight truncate">
                {shop?.name || 'My Print Shop'}
              </p>
              <p
                className={`text-[11px] flex items-center gap-1.5 mt-1 font-semibold ${
                  shop?.is_active ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    shop?.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {shop?.is_active ? 'Accepting Jobs' : 'Closed'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition-colors font-bold text-xs shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full w-full relative z-10 bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-100 bg-white/90 px-6 backdrop-blur-md lg:px-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <h1 className="font-syne text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              {activeView}
            </h1>
            {activeView === 'Live Orders' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-2xs">
                {newOrdersList.length} New
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Search print jobs or students..."
                className="w-72 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <button
              type="button"
              className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5 stroke-[2]" />
              {newOrdersList.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile View Selector */}
        <div className="md:hidden px-4 py-3 border-b border-slate-100 bg-white">
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800"
          >
            {navItems.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 pb-24 md:pb-10">
          <FeatureErrorBoundary featureName="Print Shop Dashboard">
            {/* Global Status Banner */}
            <div className="mx-auto mb-8 max-w-7xl rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Live Shop Status
                  </span>
                  <h2 className="mt-2.5 font-syne text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {shop?.is_open_now ? 'Accepting print jobs' : 'Currently closed'}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    {shop?.shop_status_reason ||
                      'Automated shop schedule controls availability unless manually overridden.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOverride('open')}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-2xs transition-all hover:bg-emerald-100"
                  >
                    Force open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOverride('closed')}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-2xs transition-all hover:bg-rose-100"
                  >
                    Force closed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOverride(null)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
                  >
                    Use schedule
                  </button>
                </div>
              </div>
            </div>

            {activeView === 'Live Orders' && (
              <div className="mx-auto max-w-7xl space-y-12 flex flex-col">
                {/* Printing & Ready Section */}
                <AnimatePresence>
                  {(inProcessOrders.length > 0 || readyOrders.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-6 order-2"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="font-syne text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                          Printing & Ready for Pickup
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                          {/* Ready Orders */}
                          {readyOrders.map((order) => {
                            const inkMeta = getOrderInkMeta(order);
                            return (
                              <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                              >
                                <div className="rounded-3xl border border-slate-100 bg-white flex flex-col overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                                  <div className="p-4 border-b border-slate-100 bg-amber-50/60 flex justify-between items-center">
                                    <span className="font-syne font-extrabold text-base text-slate-900">
                                      #{order.id.slice(0, 6)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                                      Ready for Pickup
                                    </span>
                                  </div>

                                  <div className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl border border-slate-200 overflow-hidden shrink-0">
                                      <img
                                        src={
                                          getStudentProfile(order).avatar_url ||
                                          getAvatarDataUrl({
                                            name: getStudentProfile(order).name,
                                            seed: order.student_id || order.id,
                                          })
                                        }
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs text-slate-900 truncate">
                                        {getStudentProfile(order).name || 'Student'}
                                      </p>
                                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        {order.pages} Pages • ₹{order.total_price}
                                        {inkMeta?.ink_multiplier
                                          ? ` • Ink x${Number(inkMeta.ink_multiplier).toFixed(2)}`
                                          : ''}
                                      </p>
                                      {order.is_delivery_order && (
                                        <span className="inline-flex mt-1 items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                          🚀 Room: {order.delivery_room_number || 'Delivery'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-4 pt-0 space-y-2">
                                    {order.file_url && (
                                      <button
                                        type="button"
                                        onClick={() => openPreview(order)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                      >
                                        Preview & Print
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDismissReady(order.id)}
                                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Mark Collected
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}

                          {/* In Process Orders */}
                          {inProcessOrders.map((order) => {
                            const inkMeta = getOrderInkMeta(order);
                            return (
                              <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                              >
                                <div className="rounded-3xl border border-slate-100 bg-white flex flex-col overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <span className="font-syne font-extrabold text-base text-slate-900">
                                      #{order.id.slice(0, 6)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                                      <Printer className="w-3 h-3" /> Printing
                                    </span>
                                  </div>

                                  <div className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl border border-slate-200 overflow-hidden shrink-0">
                                      <img
                                        src={
                                          getStudentProfile(order).avatar_url ||
                                          getAvatarDataUrl({
                                            name: getStudentProfile(order).name,
                                            seed: order.student_id || order.id,
                                          })
                                        }
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs text-slate-900 truncate">
                                        {getStudentProfile(order).name || 'Student'}
                                      </p>
                                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        {order.file_name?.slice(0, 16)}... • ₹{order.total_price}
                                        {inkMeta?.ink_multiplier
                                          ? ` • Ink x${Number(inkMeta.ink_multiplier).toFixed(2)}`
                                          : ''}
                                      </p>
                                      {order.is_delivery_order && (
                                        <span className="inline-flex mt-1 items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                          🚀 Room: {order.delivery_room_number || 'Delivery'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-4 pt-0 space-y-2">
                                    {order.file_url && (
                                      <button
                                        type="button"
                                        onClick={() => openPreview(order)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                      >
                                        Preview & Print
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleMarkReady(order.id)}
                                      className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Mark Ready
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* New Print Requests Section */}
                <div className="space-y-6 order-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-syne text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                      New Print Requests
                    </h2>
                    {newOrdersList.length > 0 && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                        {newOrdersList.length} Pending
                      </span>
                    )}
                  </div>

                  {newOrdersList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white px-6 py-20 text-center shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 border border-slate-100 text-slate-400 shadow-2xs">
                        <Printer className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <h3 className="font-syne text-base font-bold text-slate-900">
                        No incoming print jobs
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 max-w-sm">
                        You are caught up! When students submit print requests, documents will arrive here instantly.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      <AnimatePresence>
                        {newOrdersList.map((order) => {
                          const orderOrientation = getOrderOrientation(order);
                          const inkMeta = getOrderInkMeta(order);
                          const averageDarkPercent =
                            inkMeta?.average_dark_ratio != null
                              ? Math.round(Number(inkMeta.average_dark_ratio) * 100)
                              : null;

                          return (
                            <motion.div
                              key={order.id}
                              initial={{ opacity: 0, y: 15, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              layout
                            >
                              <div className="rounded-3xl border border-slate-100 bg-white flex flex-col overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                                {/* Card Header */}
                                <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                                  <span className="font-syne font-extrabold text-lg text-slate-900">
                                    #{order.id.slice(0, 6)}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-2xs">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {new Date(order.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>

                                {/* Student Info */}
                                <div className="p-5 pb-4 border-b border-slate-100 flex items-center gap-3.5">
                                  <div className="w-12 h-12 rounded-2xl border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                                    <img
                                      src={
                                        getStudentProfile(order).avatar_url ||
                                        getAvatarDataUrl({
                                          name: getStudentProfile(order).name,
                                          seed: order.student_id || order.id,
                                        })
                                      }
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm text-slate-900 truncate">
                                      {getStudentProfile(order).name || 'Student'}
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                      {order.student_id?.slice(0, 8)}
                                    </p>
                                    {order.is_delivery_order && (
                                      <span className="inline-flex mt-1.5 items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                        🚀 Delivery: {order.delivery_room_number || 'Room'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Print Specifications Breathable Grid */}
                                <div className="p-5 flex-1 space-y-4">
                                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                      Document File
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 break-all mt-1">
                                      {order.file_name}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Quantity */}
                                    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Quantity
                                      </p>
                                      <p className="mt-1 text-xs font-extrabold text-slate-900">
                                        {order.copies}x{' '}
                                        <span className="font-medium text-slate-500">
                                          ({order.pages} pages)
                                        </span>
                                      </p>
                                    </div>

                                    {/* Color Mode */}
                                    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Color Mode
                                      </p>
                                      <div className="mt-1 flex items-center gap-1.5">
                                        {order.is_color ? (
                                          <>
                                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            <span className="text-xs font-bold text-slate-900 ml-1">
                                              Full Color
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                                            <span className="text-xs font-bold text-slate-900">
                                              B&amp;W
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Orientation */}
                                    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Orientation
                                      </p>
                                      <p className="mt-1 text-xs font-bold capitalize text-slate-900">
                                        {orderOrientation}
                                      </p>
                                    </div>

                                    {/* Add-ons */}
                                    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Add-ons
                                      </p>
                                      <p className="mt-1 text-xs font-bold text-slate-900">
                                        {order.is_double_sided ? 'Double Sided' : 'Single Sided'}
                                        {order.has_binding ? ' + Binding' : ''}
                                      </p>
                                    </div>
                                  </div>

                                  {inkMeta && (
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1.5">
                                        Ink Analysis
                                      </p>
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                          <p className="text-slate-500 text-[10px]">Coverage</p>
                                          <p className="font-bold text-slate-900">
                                            {averageDarkPercent != null
                                              ? `${averageDarkPercent}%`
                                              : 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 text-[10px]">Complexity</p>
                                          <p className="font-bold text-slate-900 capitalize">
                                            {inkMeta.complexity || 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 text-[10px]">Multiplier</p>
                                          <p className="font-bold text-slate-900">
                                            x{Number(inkMeta.ink_multiplier || 1).toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Download / Preview Links */}
                                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                    {order.file_url ? (
                                      <>
                                        <a
                                          href={normalizeRemoteFileUrl(order.file_url)}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-bold text-amber-600 hover:text-amber-700 underline underline-offset-4"
                                        >
                                          Download File
                                        </a>
                                        {isPdfOrder(order) && (
                                          <button
                                            type="button"
                                            onClick={() => openPreview(order)}
                                            className="text-xs font-bold text-slate-700 hover:text-slate-900 underline underline-offset-4"
                                          >
                                            Preview Document
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-xs font-semibold text-amber-600">
                                        File upload pending
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Card Footer & Action Buttons */}
                                <div className="p-5 bg-slate-50/70 border-t border-slate-100 flex flex-col gap-3.5">
                                  <div className="flex justify-between items-end">
                                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                      Total Amount
                                    </span>
                                    <span className="font-syne font-extrabold text-2xl text-slate-900">
                                      ₹{order.total_price}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => handleRejectClick(order)}
                                      className="rounded-xl border border-rose-200 bg-white py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                      <X className="w-4 h-4 stroke-[2.2]" /> Reject
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAccept(order.id)}
                                      className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                      <Check className="w-4 h-4 stroke-[2.5]" /> Accept
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'Order History' && (
              <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
                  {historyOrders.length === 0 ? (
                    <div className="px-6 py-24 text-center">
                      <p className="font-syne text-base font-bold text-slate-800">
                        No print order history available yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Past completed, reordered, and cancelled print jobs will be recorded here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">File Name</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Revenue</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {historyOrders.map((order, i) => (
                            <tr
                              key={i}
                              className="transition-colors hover:bg-slate-50/60"
                            >
                              <td className="whitespace-nowrap px-6 py-4.5 text-xs font-semibold text-slate-700">
                                {new Date(order.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4.5 text-xs font-bold text-slate-900">
                                {getStudentProfile(order).name || 'Student'}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4.5 text-xs font-mono text-slate-500">
                                #{order.id.slice(0, 6)}
                              </td>
                              <td className="px-6 py-4.5 text-xs font-semibold text-slate-800 max-w-xs truncate">
                                {order.file_name}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4.5">
                                {order.status === 'collected' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                                    Completed
                                  </span>
                                ) : order.status === 'reorder_requested' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                                    Reorder Sent
                                  </span>
                                ) : order.status === 'reorder_completed' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                                    Reordered
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
                                    Cancelled
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4.5 text-right font-syne text-sm font-extrabold text-slate-900">
                                {order.status === 'collected' ||
                                order.status === 'reorder_requested' ||
                                order.status === 'reorder_completed' ? (
                                  `₹${order.total_price}`
                                ) : (
                                  <span className="text-slate-400 line-through">
                                    ₹{order.total_price}
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4.5 text-center">
                                {order.status === 'collected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRequestReorder(order)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
                                  >
                                    <RotateCcw className="h-3 w-3" /> Request Reorder
                                  </button>
                                )}
                                {order.status === 'reorder_requested' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                                    <RotateCcw className="h-3 w-3 animate-spin" /> Awaiting student
                                  </span>
                                )}
                                {order.status === 'reorder_completed' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                                    <Check className="h-3.5 w-3.5" /> Reordered
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'Settings' && (
              <div className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-12 sm:p-16 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 border border-amber-100 text-amber-600 shadow-2xs">
                  <Settings className="h-9 w-9 stroke-[1.8]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-3">
                  Under Active Development
                </span>
                <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Print Shop Preferences &amp; Hardware Configuration
                </h2>
                <p className="mx-auto mt-2.5 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Advanced automated color profiling, ink usage metrics, default print pricing tiers, and direct printer queue integrations are currently being refined. Use the Live Shop Status controls above to manage immediate shop availability.
                </p>
              </div>
            )}
          </FeatureErrorBoundary>
        </div>
      </main>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectModal.isOpen && rejectModal.order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectModal({ isOpen: false, order: null })}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
            >
              <div className="border-b border-slate-100 bg-slate-50/70 p-6 flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
                  <AlertCircle className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-syne text-xl font-bold text-slate-900">
                    Reject Print Job #{rejectModal.order.id.slice(0, 6)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select or enter a reason for cancelling this print request.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Rejection Reasons
                </p>
                <div className="flex flex-wrap gap-2">
                  {rejectReasons.map((reason, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setSelectedReason(reason);
                        setCustomReason('');
                      }}
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        selectedReason === reason
                          ? 'bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs'
                          : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="pt-2">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <MessageSquare className="h-3.5 w-3.5" /> Or write a custom message
                  </p>
                  <textarea
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value);
                      if (e.target.value) setSelectedReason('');
                    }}
                    placeholder='e.g. "Sorry, our color printer is undergoing maintenance..."'
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 min-h-[90px] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 p-5">
                <button
                  type="button"
                  onClick={() => setRejectModal({ isOpen: false, order: null })}
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  disabled={!selectedReason && !customReason}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  <X className="h-4 w-4 stroke-[2.5]" /> Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {previewModal.isOpen && previewModal.order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewModal({ isOpen: false, order: null })}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="relative z-10 w-full max-w-6xl h-[88vh] bg-white rounded-3xl border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-syne font-bold text-base text-slate-900 truncate">
                    {previewModal.order.file_name || 'Document Preview'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Order #{previewModal.order.id?.slice(0, 6)} •{' '}
                    {getStudentProfile(previewModal.order).name || 'Student'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isPdfOrder(previewModal.order) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMode((prev) => (prev === 'direct' ? 'gview' : 'direct'));
                        setPreviewLoadError(false);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      {previewMode === 'direct' ? 'Use Alternate Viewer' : 'Use Direct Viewer'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePrintFromPreview}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModal({ isOpen: false, order: null })}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Close
                  </button>
                </div>
              </div>

              {isPdfOrder(previewModal.order) ? (
                <div className="w-full h-full relative bg-slate-100">
                  {previewResolving && (
                    <div className="absolute inset-0 z-20 bg-white/90 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> Preparing secure file link...
                      </div>
                    </div>
                  )}

                  {previewMode === 'direct' ? (
                    <iframe
                      id="pdf-preview-frame"
                      title="PDF Preview"
                      src={getPdfPreviewSrc(previewFileUrl, 'direct')}
                      className="w-full h-full border-0"
                      onLoad={() => setPreviewLoadError(false)}
                      onError={() => setPreviewLoadError(true)}
                    />
                  ) : (
                    <iframe
                      id="pdf-preview-frame"
                      title="PDF Preview"
                      src={getPdfPreviewSrc(previewFileUrl)}
                      className="w-full h-full border-0"
                      onLoad={() => setPreviewLoadError(false)}
                      onError={() => setPreviewLoadError(true)}
                    />
                  )}

                  {previewLoadError && !previewResolving && (
                    <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <p className="text-slate-900 font-bold text-sm">
                        Failed to load PDF document in inline viewer.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewMode('gview');
                            setPreviewLoadError(false);
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Try Alternate Viewer
                        </button>
                        <a
                          href={normalizeRemoteFileUrl(previewFileUrl || '')}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600"
                        >
                          Open In New Tab
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-50">
                  <p className="text-slate-900 font-bold text-sm">
                    This file cannot be previewed inline.
                  </p>
                  <a
                    href={normalizeRemoteFileUrl(previewFileUrl || previewModal.order.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
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
