import React from 'react';
import { useOutletContext } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { OrderCard } from './canteen/OrderCard';
import { updateOrderStatus } from '../../api/canteen';

export const AdminCanteenLiveIncomingPage: React.FC = () => {
  const { orders } = useOutletContext<{ orders: any[] }>();

  const newOrdersList = orders
    .filter((o) => o.status === 'placed')
    .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));

  const handleAccept = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'preparing');
    if (error) toast.error('Failed to accept order: ' + error.message);
    else toast.success('Order accepted!');
  };

  const handleRejectClick = async (order: any) => {
    // Basic auto-reject with predefined reason for simplicity in UI refresh,
    // Can be expanded to modal later.
    const { error } = await updateOrderStatus(order.id, 'cancelled', {
      rejectionReason: 'Item unavailable',
    });
    if (error) toast.error('Failed to reject order');
    else toast.success('Order rejected.');
  };

  if (newOrdersList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200 dark:border-shop-border-subtle bg-white dark:bg-shop-bg-surface px-6 py-20 text-center shadow-sm h-full">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-gray-200 dark:border-shop-border-subtle text-gray-400">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <h3 className="font-syne text-base font-bold text-gray-900 dark:text-shop-text-primary">No incoming orders</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-shop-text-secondary max-w-sm">
          You are caught up! New orders will appear here instantly.
        </p>
      </div>
    );
  }

  return (
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
  );
};
