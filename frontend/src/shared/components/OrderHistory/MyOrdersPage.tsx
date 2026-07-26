import React, { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { OrderCard, UnifiedOrder } from './OrderCard';
import { Loader2 } from 'lucide-react';

const PAGE_SIZE = 15;

export const MyOrdersPage: React.FC = () => {
  const { user } = useAuthStore();

  const fetchOrders = useCallback(async (page: number) => {
    if (!user) return { data: [], hasMore: false };

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      // Fetch Canteen Orders
      const { data: canteenData, error: canteenError } = await supabase
        .from('canteen_orders')
        .select(`
          id,
          created_at,
          short_id,
          total_amount,
          status,
          items,
          canteen_shops ( name )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (canteenError) throw canteenError;

      // Fetch Print Orders
      const { data: printData, error: printError } = await supabase
        .from('print_orders')
        .select(`
          id,
          created_at,
          short_id,
          total_amount,
          status,
          specification,
          print_shops ( name )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (printError) throw printError;

      const unifiedOrders: UnifiedOrder[] = [];

      (canteenData || []).forEach((order: any) => {
        let itemsSummary = 'Items';
        try {
          if (Array.isArray(order.items)) {
            const count = order.items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
            itemsSummary = `${count} item${count !== 1 ? 's' : ''}`;
          }
        } catch (e) {}

        unifiedOrders.push({
          id: order.id,
          type: 'canteen',
          shopName: order.canteen_shops?.name || 'Canteen',
          createdAt: order.created_at,
          shortId: order.short_id,
          totalAmount: order.total_amount,
          status: order.status,
          itemsSummary,
        });
      });

      (printData || []).forEach((order: any) => {
        let itemsSummary = 'Document';
        try {
          if (order.specification) {
            const copies = order.specification.copies || 1;
            itemsSummary = `${copies} cop${copies !== 1 ? 'ies' : 'y'}`;
          }
        } catch (e) {}

        unifiedOrders.push({
          id: order.id,
          type: 'print',
          shopName: order.print_shops?.name || 'Print Shop',
          createdAt: order.created_at,
          shortId: order.short_id,
          totalAmount: order.total_amount,
          status: order.status,
          itemsSummary,
        });
      });

      // Sort combined array descending by date
      unifiedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // If both return PAGE_SIZE, we might have more. But since we slice locally,
      // it's a bit naive pagination (it fetches 15 of each, sorts, returns up to 15, ignores rest).
      // For true pagination across 2 tables, an RPC view is better, but this is a simple approximation.
      const sliced = unifiedOrders.slice(0, PAGE_SIZE);

      return {
        data: sliced,
        hasMore: (canteenData?.length === PAGE_SIZE || printData?.length === PAGE_SIZE)
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { data: [], hasMore: false };
    }
  }, [user]);

  const { data, hasMore, isFetching, observerTarget } = useInfiniteScroll<UnifiedOrder>({
    fetchData: fetchOrders,
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        <div className="flex flex-col gap-4">
          {data.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>

        {isFetching && (
          <div className="flex flex-col gap-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded mt-2"></div>
                <div className="flex justify-between items-end mt-2">
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sentinel div for intersection observer */}
        <div ref={observerTarget} className="h-10 w-full" />

        {!hasMore && data.length > 0 && !isFetching && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm font-medium">
              You have reached the beginning of time.
            </p>
          </div>
        )}

        {!hasMore && data.length === 0 && !isFetching && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
