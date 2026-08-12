import React from 'react';
import { useOutletContext } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import { OrderCard } from './canteen/OrderCard';
import { updateOrderStatus } from '../../api/canteen';

export const AdminCanteenLivePreparingPage: React.FC = () => {
  const { orders } = useOutletContext<{ orders: any[] }>();

  const inProcessOrders = orders
    .filter((o) => o.status === 'preparing')
    .sort((a, b) => (b.is_delivery_order ? 1 : 0) - (a.is_delivery_order ? 1 : 0));

  const handleMarkReady = async (id: string) => {
    const { error } = await updateOrderStatus(id, 'ready');
    if (error) toast.error('Failed to mark ready');
    else toast.success('Order marked ready for pickup!');
  };

  if (inProcessOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200 dark:border-shop-border-subtle bg-white dark:bg-shop-bg-surface px-6 py-20 text-center shadow-sm h-full">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gray-50 dark:bg-shop-bg-surface-raised border border-gray-200 dark:border-shop-border-subtle text-gray-400">
          <ChefHat className="h-6 w-6" />
        </div>
        <h3 className="font-syne text-base font-bold text-gray-900 dark:text-shop-text-primary">No orders preparing</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-shop-text-secondary max-w-sm">
          Orders you accept will move here while they are being prepared.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {inProcessOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
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
  );
};
