import React from 'react';
import { useOutletContext } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { updatePrintOrderStatus } from '../../api/print';

export const AdminPrintLiveReadyPage: React.FC = () => {
  const { orders } = useOutletContext<{ orders: any[] }>();

  const readyOrders = orders
    .filter((o) => o.status === 'printing' || o.status === 'ready')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const handleMarkReady = async (id: string) => {
    const { error } = await updatePrintOrderStatus(id, 'ready');
    if (error) toast.error('Failed to mark ready');
    else toast.success('Order marked ready for pickup!');
  };

  const handleDismissReady = async (id: string) => {
    const { error } = await updatePrintOrderStatus(id, 'collected');
    if (error) toast.error('Failed to complete order');
    else toast.success('Order marked collected!');
  };

  if (readyOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-[#e0e0e0] dark:border-[#38383a] bg-white dark:bg-[#1c1c1e] px-6 py-20 text-center shadow-sm h-full">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-[#e0e0e0] dark:border-[#38383a] text-[#86868b]">
          <Printer className="h-6 w-6" />
        </div>
        <h3 className="font-syne text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">No orders printing</h3>
        <p className="mt-1 text-xs text-[#86868b] max-w-sm">
          Accepted orders will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {readyOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
            className="p-5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-[#e0e0e0] dark:border-[#38383a] shadow-sm flex flex-col gap-4"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-syne text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    #{order.short_id || order.id.slice(0, 6)}
                  </span>
                </div>
                <p className="font-syne font-bold text-[#0066cc] dark:text-[#3399ff] truncate">{order.file_name}</p>
                <p className="text-xs text-[#86868b] mt-1 truncate">{order.student_profile?.name || 'Unknown Student'}</p>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap flex-shrink-0 ${order.status === 'ready' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>
                {order.status === 'ready' ? 'Ready for Pickup' : 'Printing'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] rounded-md text-xs font-semibold">
                {order.color_mode === 'color' || order.print_color === 'color' ? 'Color' : 'B&W'}
              </span>
              <span className="px-2 py-1 bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] rounded-md text-xs font-semibold">
                {order.copies || order.quantity || 1} Copies
              </span>
            </div>

            <div className="flex gap-3 mt-2">
              {order.status === 'printing' ? (
                <button onClick={() => handleMarkReady(order.id)} className="flex-1 py-2 rounded-xl bg-[#0066cc] text-white font-semibold text-sm shadow-sm">Mark Ready</button>
              ) : (
                <button onClick={() => handleDismissReady(order.id)} className="flex-1 py-2 rounded-xl bg-[#34c759] text-white font-semibold text-sm shadow-sm">Mark Collected</button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
