import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  X,
  Clock,
  Bell,
  UtensilsCrossed,
  ChefHat,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { updateOrderStatus } from '../../../api/canteen';
import { getAvatarDataUrl } from '../../../lib/avatar';

export interface MobileOrdersDashboardProps {
  shop: any;
  onOverride: (nextOverride: string | null) => Promise<void>;
  orders: any[];
  setOrders: React.Dispatch<React.SetStateAction<any[]>>;
}

export const MobileOrdersDashboard: React.FC<MobileOrdersDashboardProps> = ({
  shop,
  onOverride,
  orders,
  setOrders,
}) => {
  const [activeStage, setActiveStage] = useState<'incoming' | 'preparing' | 'ready'>('incoming');
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; order: any | null }>({
    isOpen: false,
    order: null,
  });
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  const rejectReasons = [
    'Item(s) Not Available',
    'Out of Stock',
    'Kitchen is currently too busy',
    'Canteen is closing soon',
    'Price updated, please re-order',
  ];

  const newOrdersList = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'placed')
        .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0)),
    [orders]
  );

  const inProcessOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'preparing')
        .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0)),
    [orders]
  );

  const readyOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'ready')
        .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0)),
    [orders]
  );

  const isOpen = Boolean(shop?.is_open_now);

  const handleToggleShopStatus = async () => {
    const nextState = isOpen ? 'closed' : 'open';
    await onOverride(nextState);
  };

  const handleAccept = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'preparing');
    if (error) {
      toast.error('Failed to accept order: ' + error.message);
    } else {
      toast.success('Order accepted!');
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'preparing' } : o))
      );
    }
  };

  const handleMarkReady = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'ready');
    if (error) {
      toast.error('Failed to mark ready');
    } else {
      toast.success('Order marked ready for pickup!');
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'ready' } : o))
      );
    }
  };

  const handleDismissReady = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'picked_up');
    if (error) {
      toast.error('Failed to complete order');
    } else {
      toast.success('Order marked collected!');
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'picked_up' } : o))
      );
    }
  };

  const handleRejectClick = (order: any) => {
    setRejectModal({ isOpen: true, order });
    setSelectedReason('');
    setCustomReason('');
  };

  const confirmReject = async () => {
    if (rejectModal.order) {
      const reason = selectedReason || customReason;
      const { error } = await updateOrderStatus(rejectModal.order.id, 'cancelled', {
        rejectionReason: reason,
      });
      if (error) {
        toast.error('Failed to reject order: ' + error.message);
      } else {
        toast.success('Order rejected.');
        setOrders((prev) =>
          prev.map((o) =>
            o.id === rejectModal.order.id ? { ...o, status: 'cancelled' } : o
          )
        );
      }
    }
    setRejectModal({ isOpen: false, order: null });
  };

  const formatElapsedTime = (dateStr: string) => {
    try {
      const diffMinutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
      );
      if (diffMinutes === 0) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const hours = Math.floor(diffMinutes / 60);
      return `${hours}h ${diffMinutes % 60}m ago`;
    } catch {
      return 'Recently';
    }
  };

  const stages = [
    {
      id: 'incoming' as const,
      label: 'Incoming',
      count: newOrdersList.length,
      badgeColor: 'bg-blue-600 text-white dark:bg-blue-500',
    },
    {
      id: 'preparing' as const,
      label: 'Preparing',
      count: inProcessOrders.length,
      badgeColor: 'bg-amber-500 text-white dark:bg-amber-600',
    },
    {
      id: 'ready' as const,
      label: 'Ready',
      count: readyOrders.length,
      badgeColor: 'bg-emerald-600 text-white dark:bg-emerald-500',
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#FAFAFA] dark:bg-shop-bg-base text-gray-900 dark:text-shop-text-primary font-sans pb-6 select-none transition-colors">
      {/* ========================================================
          STICKY HEADER & SHOP STATUS PANEL
      ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-shop-bg-surface/95 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.04)] dark:shadow-none border-b border-transparent dark:border-shop-border-subtle transition-colors">
        <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-syne text-xl font-extrabold text-gray-900 dark:text-shop-text-primary tracking-tight leading-none">
                Live Orders
              </h1>
              {newOrdersList.length > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-shop-text-secondary truncate mt-1">
              {shop?.name || 'Campus Canteen'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Sleek Soft-Tinted Status Pill & Toggle Switch */}
            <div
              onClick={handleToggleShopStatus}
              className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                isOpen
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-600 dark:text-shop-text-secondary border border-transparent dark:border-shop-border-subtle'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400 dark:bg-shop-text-tertiary'
                }`}
              />
              <span className="text-xs font-bold font-syne tracking-wide">
                {isOpen ? 'Accepting Orders' : 'Closed'}
              </span>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                  isOpen ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-shop-border-strong'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                    isOpen ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="relative w-9 h-9 rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-transparent dark:border-shop-border-subtle flex items-center justify-center text-gray-600 dark:text-shop-text-secondary active:scale-95 transition-all"
              aria-label="Order Alerts"
            >
              <Bell className="w-4.5 h-4.5 stroke-[1.8]" />
              {newOrdersList.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-shop-bg-surface" />
              )}
            </button>
          </div>
        </div>

        {/* ORDER STATUS NAVIGATION (SWIPEABLE TABS) */}
        <nav className="flex items-center justify-between px-2 border-t border-gray-100 dark:border-shop-border-subtle bg-white dark:bg-shop-bg-surface transition-colors">
          {stages.map((stage) => {
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className="relative flex-1 py-3 px-2 flex items-center justify-center gap-1.5 focus:outline-none"
              >
                <span
                  className={`text-xs transition-colors ${
                    isActive
                      ? 'font-extrabold text-gray-900 dark:text-shop-text-primary font-syne'
                      : 'font-semibold text-gray-400 dark:text-shop-text-secondary'
                  }`}
                >
                  {stage.label}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    isActive
                      ? stage.badgeColor
                      : 'bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-500 dark:text-shop-text-secondary'
                  }`}
                >
                  {stage.count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="canteenOrderTabUnderline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-gray-900 dark:bg-shop-accent rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ACTIVE VIEW: TAB CONTENT CARDS */}
      <div className="px-4 pt-4">
        {/* INCOMING REQUESTS */}
        {activeStage === 'incoming' && (
          <div className="space-y-3.5">
            {newOrdersList.length === 0 ? (
              <div className="bg-white dark:bg-shop-bg-surface rounded-3xl p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-transparent dark:border-shop-border-subtle my-6 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 stroke-[1.8]" />
                </div>
                <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-shop-text-primary">
                  No incoming requests
                </h3>
                <p className="text-xs text-gray-500 dark:text-shop-text-secondary font-medium mt-1 max-w-xs mx-auto">
                  All caught up! New customer orders will pop up right here automatically.
                </p>
              </div>
            ) : (
              newOrdersList.map((order) => {
                const avatarUrl =
                  order.profiles?.avatar_url ||
                  getAvatarDataUrl({
                    name: order.profiles?.name,
                    seed: order.student_id || order.id,
                  });

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-white dark:bg-shop-bg-surface rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-none border border-transparent dark:border-shop-border-subtle flex flex-col transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-shop-bg-surface-raised shrink-0">
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-syne font-bold text-sm text-gray-900 dark:text-shop-text-primary truncate">
                              {order.profiles?.name || 'Student Customer'}
                            </p>
                            <span className="text-[10px] font-bold font-mono text-gray-400 dark:text-shop-text-secondary bg-gray-50 dark:bg-shop-bg-surface-raised px-1.5 py-0.5 rounded">
                              #{order.id.slice(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-400 dark:text-shop-text-secondary shrink-0" />
                            <span className="text-[11px] font-medium text-gray-400 dark:text-shop-text-secondary">
                              {formatElapsedTime(order.created_at)}
                            </span>
                            {order.is_delivery_order && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[9px] font-extrabold">
                                🚀 Delivery: Rm {order.delivery_room_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-shop-text-secondary">
                          Total
                        </p>
                        <p className="font-syne text-lg font-black text-gray-900 dark:text-shop-text-primary leading-tight">
                          ₹{order.total}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-shop-bg-surface-raised rounded-2xl p-3.5 my-3.5 space-y-1.5 border border-transparent dark:border-shop-border-subtle transition-colors">
                      {order.items?.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs font-sans"
                        >
                          <span className="text-gray-800 dark:text-shop-text-primary font-medium truncate pr-2">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 mr-1.5">
                              {item.qty}x
                            </span>
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRejectClick(order)}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-400 dark:text-shop-text-secondary hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAccept(order.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 active:scale-[0.97] text-white font-syne font-bold text-xs py-3 px-5 rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.25)] dark:shadow-none flex items-center justify-center gap-2 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Accept Order</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* PREPARING (IN PROCESS) SECTION */}
        {activeStage === 'preparing' && (
          <div className="space-y-3.5">
            {inProcessOrders.length === 0 ? (
              <div className="bg-white dark:bg-shop-bg-surface rounded-3xl p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-transparent dark:border-shop-border-subtle my-6 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <ChefHat className="w-6 h-6 stroke-[1.8]" />
                </div>
                <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-shop-text-primary">
                  No orders preparing
                </h3>
                <p className="text-xs text-gray-500 dark:text-shop-text-secondary font-medium mt-1 max-w-xs mx-auto">
                  Accepted orders currently in the kitchen will be listed here.
                </p>
              </div>
            ) : (
              inProcessOrders.map((order) => {
                const avatarUrl =
                  order.profiles?.avatar_url ||
                  getAvatarDataUrl({
                    name: order.profiles?.name,
                    seed: order.student_id || order.id,
                  });

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-white dark:bg-shop-bg-surface rounded-2xl p-4 shadow-[0_6px_24px_rgba(0,0,0,0.05)] dark:shadow-none border border-transparent dark:border-shop-border-subtle flex flex-col transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 dark:bg-shop-bg-surface-raised shrink-0">
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-syne font-bold text-sm text-gray-900 dark:text-shop-text-primary truncate">
                              {order.profiles?.name || 'Student'}
                            </p>
                            <span className="text-[10px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                              #{order.id.slice(0, 5)}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-gray-400 dark:text-shop-text-secondary mt-0.5">
                            {order.items?.length || 0} items • Started{' '}
                            {formatElapsedTime(order.created_at)}
                          </p>
                        </div>
                      </div>

                      <span className="font-syne text-base font-black text-gray-900 dark:text-shop-text-primary shrink-0">
                        ₹{order.total}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-shop-bg-surface-raised rounded-xl p-3 my-3 space-y-1 border border-transparent dark:border-shop-border-subtle transition-colors">
                      {order.items?.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs font-sans"
                        >
                          <span className="text-gray-800 dark:text-shop-text-primary font-medium truncate">
                            <span className="font-extrabold text-amber-600 dark:text-amber-400 mr-1.5">
                              {item.qty}x
                            </span>
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMarkReady(order.id)}
                      className="w-full py-3 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 active:scale-[0.98] text-amber-700 dark:text-amber-300 font-syne font-extrabold text-xs flex items-center justify-center gap-2 transition-all border border-amber-200/60 dark:border-amber-800/40"
                    >
                      <ChefHat className="w-4 h-4 stroke-[2.2]" />
                      <span>Mark Ready for Pickup</span>
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* READY FOR PICKUP SECTION */}
        {activeStage === 'ready' && (
          <div className="space-y-3.5">
            {readyOrders.length === 0 ? (
              <div className="bg-white dark:bg-shop-bg-surface rounded-3xl p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-transparent dark:border-shop-border-subtle my-6 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />
                </div>
                <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-shop-text-primary">
                  No orders waiting for pickup
                </h3>
                <p className="text-xs text-gray-500 dark:text-shop-text-secondary font-medium mt-1 max-w-xs mx-auto">
                  Orders marked as ready will appear here until collected by students.
                </p>
              </div>
            ) : (
              readyOrders.map((order) => {
                const avatarUrl =
                  order.profiles?.avatar_url ||
                  getAvatarDataUrl({
                    name: order.profiles?.name,
                    seed: order.student_id || order.id,
                  });

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-white dark:bg-shop-bg-surface rounded-2xl p-4 shadow-[0_6px_24px_rgba(0,0,0,0.05)] dark:shadow-none border border-transparent dark:border-shop-border-subtle flex flex-col transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 dark:bg-shop-bg-surface-raised shrink-0">
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-syne font-bold text-sm text-gray-900 dark:text-shop-text-primary truncate">
                              {order.profiles?.name || 'Student'}
                            </p>
                            <span className="text-[10px] font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              #{order.id.slice(0, 5)}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-gray-400 dark:text-shop-text-secondary mt-0.5">
                            Ready for pickup • {order.items?.length || 0} items
                          </p>
                        </div>
                      </div>

                      <span className="font-syne text-base font-black text-gray-900 dark:text-shop-text-primary shrink-0">
                        ₹{order.total}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-shop-bg-surface-raised rounded-xl p-3 my-3 space-y-1 border border-transparent dark:border-shop-border-subtle transition-colors">
                      {order.items?.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs font-sans"
                        >
                          <span className="text-gray-800 dark:text-shop-text-primary font-medium truncate">
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mr-1.5">
                              {item.qty}x
                            </span>
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDismissReady(order.id)}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.98] text-emerald-700 dark:text-emerald-300 font-syne font-extrabold text-xs flex items-center justify-center gap-2 transition-all border border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Mark Collected</span>
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MOBILE REJECT REASON MODAL */}
      <AnimatePresence>
        {rejectModal.isOpen && rejectModal.order && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectModal({ isOpen: false, order: null })}
              className="absolute inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-shop-bg-surface rounded-t-3xl sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] dark:shadow-none border border-transparent dark:border-shop-border-subtle overflow-hidden transition-colors"
            >
              <div className="p-5 border-b border-gray-100 dark:border-shop-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-shop-text-primary">
                      Reject #{rejectModal.order.id.slice(0, 5)}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-shop-text-secondary font-medium">
                      Student: {rejectModal.order.profiles?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModal({ isOpen: false, order: null })}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-500 dark:text-shop-text-secondary flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 max-h-[60vh] overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-shop-text-secondary">
                  Select Reason
                </p>
                <div className="flex flex-wrap gap-2">
                  {rejectReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedReason(reason);
                        setCustomReason('');
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedReason === reason
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                          : 'bg-gray-50 dark:bg-shop-bg-surface-raised text-gray-700 dark:text-shop-text-secondary hover:bg-gray-100 dark:hover:bg-shop-bg-surface-hover'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-shop-text-secondary mb-1.5 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Custom Note (Optional)
                  </p>
                  <textarea
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value);
                      if (e.target.value) setSelectedReason('');
                    }}
                    placeholder="Type specific reason for student..."
                    className="w-full rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-gray-200 dark:border-shop-border-subtle p-3 text-xs text-gray-900 dark:text-shop-text-primary placeholder:text-gray-400 dark:placeholder:text-shop-text-tertiary focus:outline-none focus:border-rose-500 resize-none min-h-[72px]"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-shop-border-subtle bg-gray-50/60 dark:bg-shop-bg-surface-raised flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModal({ isOpen: false, order: null })}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-500 dark:text-shop-text-secondary hover:bg-gray-100 dark:hover:bg-shop-bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  disabled={!selectedReason && !customReason}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold font-syne shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <X className="w-4 h-4 stroke-[2.5]" /> Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
