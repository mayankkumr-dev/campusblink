import React, { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { format } from 'date-fns';

interface ShopOrderHistoryListProps {
  shopId: string;
  type: 'canteen' | 'print';
}

const PAGE_SIZE = 20;

export const ShopOrderHistoryList: React.FC<ShopOrderHistoryListProps> = ({ shopId, type }) => {
  const fetchOrders = useCallback(async (page: number) => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const tableName = type === 'canteen' ? 'canteen_orders' : 'print_orders';
      const shopColumn = type === 'canteen' ? 'canteen_id' : 'print_shop_id';

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          id,
          created_at,
          short_id,
          total_amount,
          status,
          user_id,
          items,
          specification,
          profiles:user_id ( full_name )
        `)
        .eq(shopColumn, shopId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        hasMore: data?.length === PAGE_SIZE
      };
    } catch (error) {
      console.error('Error fetching shop orders:', error);
      return { data: [], hasMore: false };
    }
  }, [shopId, type]);

  const { data, hasMore, isFetching, observerTarget } = useInfiniteScroll<any>({
    fetchData: fetchOrders,
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="p-4 w-1/5">Order Number</th>
              <th className="p-4 w-1/5">Date & Time</th>
              <th className="p-4 w-1/5">Customer</th>
              <th className="p-4 w-1/5">Items</th>
              <th className="p-4 w-1/5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <span className="font-extrabold text-blue-600 text-lg">
                    #{order.short_id || '---'}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600 font-medium">
                  {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
                </td>
                <td className="p-4 text-sm font-semibold text-gray-800">
                  {order.profiles?.full_name || 'Unknown User'}
                </td>
                <td className="p-4 text-sm text-gray-500 max-w-[200px] truncate">
                  {type === 'canteen' ? (
                    order.items?.map((item: any) => `${item.qty || item.quantity}x ${item.name}`).join(', ')
                  ) : (
                    `${order.specification?.copies || 1} copies, ${order.specification?.color || 'B&W'}`
                  )}
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider bg-gray-100 text-gray-800 border-gray-200">
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFetching && (
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
              <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
              <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
              <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Sentinel div for infinite scroll */}
      <div ref={observerTarget} className="h-10 w-full" />

      {!hasMore && data.length > 0 && !isFetching && (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm font-medium">
            You have reached the beginning of time.
          </p>
        </div>
      )}

      {!hasMore && data.length === 0 && !isFetching && (
        <div className="text-center py-10">
          <p className="text-gray-500 font-medium">No order history found.</p>
        </div>
      )}
    </div>
  );
};
