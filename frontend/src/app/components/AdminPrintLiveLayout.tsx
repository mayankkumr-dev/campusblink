import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext, useLocation, Link } from 'react-router';
import { supabase } from '../../lib/supabase';
import { getShopPrintOrders } from '../../api/print';
import { usePrintOrders } from '../../hooks/useRealtime';
import { ListSkeleton } from './ui/Skeletons';

export const AdminPrintLiveLayout: React.FC = () => {
  const { shop, setShop } = useOutletContext<{ shop: any; setShop: any }>();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const enrichOrderWithStudent = async (order: any) => {
    if (!order?.student_id) return order;
    if (order?.profiles?.name || order?.student_profile?.name) return order;
    const { data: studentProfile } = await supabase.from('profiles').select('name, avatar_url, username').eq('id', order.student_id).maybeSingle();
    if (!studentProfile) return order;
    return { ...order, profiles: studentProfile, student_profile: studentProfile };
  };

  useEffect(() => {
    async function loadOrders() {
      if (!shop?.id) return;
      setIsLoading(true);
      const { data: orderData } = await getShopPrintOrders(shop.id);
      if (orderData) {
        const enriched = await Promise.all(orderData.map((order: any) => enrichOrderWithStudent(order)));
        setOrders(enriched);
      }
      setIsLoading(false);
    }
    loadOrders();
  }, [shop?.id]);

  usePrintOrders(shop?.id, async (newOrder) => {
    const enrichedOrder = await enrichOrderWithStudent(newOrder);
    setOrders(prev => [enrichedOrder, ...prev.filter((o) => o.id !== enrichedOrder.id)]);
  }, async (updatedOrder) => {
    const enrichedOrder = await enrichOrderWithStudent(updatedOrder);
    setOrders(prev => prev.map(o => o.id === enrichedOrder.id ? { ...o, ...enrichedOrder } : o));
  });

  const newCount = orders.filter((o) => o.status === 'placed').length;
  const readyCount = orders.filter((o) => o.status === 'printing' || o.status === 'ready').length;

  if (isLoading) {
    return <div className="p-4 md:p-8 space-y-4"><ListSkeleton rows={3} /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#000000] font-sans relative">
      {/* Segmented Control Bar */}
      <div className="sticky top-0 z-30 bg-[#f5f5f7]/80 dark:bg-[#000000]/80 backdrop-blur-xl border-b border-[#e0e0e0] dark:border-[#38383a] pt-4 pb-2 px-4 md:px-8">
        <div className="flex p-1 bg-white dark:bg-[#1c1c1e] rounded-full border border-[#e0e0e0] dark:border-[#38383a] shadow-sm max-w-sm">
          <Link
            to="/print-dashboard/live/new"
            className={`flex-1 text-center py-2 text-sm font-semibold rounded-full transition-all flex justify-center items-center gap-2 ${
              location.pathname.includes('/new')
                ? 'bg-[#0066cc] text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
            }`}
          >
            New Requests
            {newCount > 0 && (
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${location.pathname.includes('/new') ? 'bg-white/20 text-white' : 'bg-[#0066cc]/10 text-[#0066cc]'}`}>{newCount}</span>
            )}
          </Link>
          <Link
            to="/print-dashboard/live/ready"
            className={`flex-1 text-center py-2 text-sm font-semibold rounded-full transition-all flex justify-center items-center gap-2 ${
              location.pathname.includes('/ready')
                ? 'bg-[#0066cc] text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
            }`}
          >
            Printing & Ready
            {readyCount > 0 && (
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${location.pathname.includes('/ready') ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-[#2c2c2e] text-[#86868b]'}`}>{readyCount}</span>
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
