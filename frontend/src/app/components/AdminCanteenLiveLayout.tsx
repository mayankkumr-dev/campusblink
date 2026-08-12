import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext, useLocation, Link, Navigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { getShopOrders } from '../../api/canteen';
import { useCanteenOrders } from '../../hooks/useRealtime';
import { ListSkeleton } from './ui/Skeletons';

export const AdminCanteenLiveLayout: React.FC = () => {
  const { shop, setShop } = useOutletContext<{ shop: any; setShop: any }>();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function loadOrders() {
      if (!shop?.id) return;
      setIsLoading(true);
      const { data: orderData } = await getShopOrders(shop.id);
      if (orderData) setOrders(orderData);
      setIsLoading(false);
    }
    loadOrders();
  }, [shop?.id]);

  useCanteenOrders(
    shop?.id,
    (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    },
    (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
    }
  );

  const newCount = orders.filter((o) => o.status === 'placed').length;
  const prepCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-shop-bg-base font-sans relative">
      {/* Segmented Control Bar */}
      <div className="sticky top-0 z-30 bg-[#f5f5f7]/80 dark:bg-shop-bg-base/80 backdrop-blur-xl border-b border-gray-200 dark:border-shop-border-subtle pt-4 pb-2 px-4 md:px-8">
        <div className="flex p-1 bg-white dark:bg-[#1c1c1e] rounded-full border border-gray-200 dark:border-[#38383a] shadow-sm max-w-lg">
          <Link
            to="/canteen-dashboard/live/incoming"
            className={`flex-1 text-center py-2 text-sm font-semibold rounded-full transition-all flex justify-center items-center gap-2 ${
              location.pathname.includes('/incoming')
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-shop-text-secondary dark:hover:text-white'
            }`}
          >
            Incoming
            {newCount > 0 && (
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${location.pathname.includes('/incoming') ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>{newCount}</span>
            )}
          </Link>
          <Link
            to="/canteen-dashboard/live/preparing"
            className={`flex-1 text-center py-2 text-sm font-semibold rounded-full transition-all flex justify-center items-center gap-2 ${
              location.pathname.includes('/preparing')
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-shop-text-secondary dark:hover:text-white'
            }`}
          >
            Preparing
            {prepCount > 0 && (
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${location.pathname.includes('/preparing') ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-500'}`}>{prepCount}</span>
            )}
          </Link>
          <Link
            to="/canteen-dashboard/live/ready"
            className={`flex-1 text-center py-2 text-sm font-semibold rounded-full transition-all flex justify-center items-center gap-2 ${
              location.pathname.includes('/ready')
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-shop-text-secondary dark:hover:text-white'
            }`}
          >
            Ready
            {readyCount > 0 && (
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${location.pathname.includes('/ready') ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-500'}`}>{readyCount}</span>
            )}
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
        <Outlet context={{ shop, orders, setOrders }} />
      </div>
    </div>
  );
};
