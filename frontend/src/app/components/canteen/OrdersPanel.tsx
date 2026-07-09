import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertCircle, MessageSquare, X, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateOrderStatus } from '../../../api/canteen';
import { useCanteenOrders } from '../../../hooks/useRealtime';
import { OrderCard } from './OrderCard';

export interface OrdersPanelProps {
  shopId: string | undefined;
  orders: any[];
  setOrders: React.Dispatch<React.SetStateAction<any[]>>;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({ shopId, orders, setOrders }) => {
  // Reject Modal State
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

  // Realtime hook for incoming / updated orders
  useCanteenOrders(
    shopId,
    (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    },
    (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
    }
  );

  const handleAccept = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'preparing');
    if (error) toast.error('Failed to accept order: ' + error.message);
    else toast.success('Order accepted!');
  };

  const handleMarkReady = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'ready');
    if (error) toast.error('Failed to mark ready');
    else toast.success('Order marked ready for pickup!');
  };

  const handleDismissReady = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'picked_up');
    if (error) toast.error('Failed to complete order');
    else toast.success('Order marked collected!');
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
      }
    }
    setRejectModal({ isOpen: false, order: null });
  };

  const newOrdersList = orders
    .filter((o) => o.status === 'placed')
    .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const inProcessOrders = orders
    .filter((o) => o.status === 'preparing')
    .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));
  const readyOrders = orders
    .filter((o) => o.status === 'ready')
    .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));

  return (
    <div className="mx-auto max-w-7xl space-y-12 flex flex-col font-sans">
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
              <h2 className="font-syne text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                In Process & Ready for Pickup
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {/* Ready Orders */}
                {readyOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <OrderCard
                      order={order}
                      variant="ready"
                      onDismissReady={handleDismissReady}
                    />
                  </motion.div>
                ))}

                {/* In Process Orders */}
                {inProcessOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <OrderCard
                      order={order}
                      variant="preparing"
                      onMarkReady={handleMarkReady}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Requests Section */}
      <div className="space-y-6 order-1">
        <div className="flex items-center justify-between">
          <h2 className="font-syne text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
            Incoming Requests
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
              <UtensilsCrossed className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h3 className="font-syne text-base font-bold text-slate-900">No incoming orders</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              You are caught up! When students place orders from the campus menu, they will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {newOrdersList.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 15, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <OrderCard
                    order={order}
                    variant="new"
                    onAccept={handleAccept}
                    onReject={handleRejectClick}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

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
                    Reject Order #{rejectModal.order.id.slice(0, 6)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Notify <strong className="text-slate-800">{rejectModal.order.profiles?.name}</strong> about the reason for cancellation.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Select a Quick Reason
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
                    placeholder={`e.g. "Sorry ${
                      rejectModal.order.profiles?.name?.split(' ')[0] || 'Student'
                    }, the kitchen just ran out of this item..."`}
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
    </div>
  );
};
