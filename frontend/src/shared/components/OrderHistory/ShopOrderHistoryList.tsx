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
    <div className="flex flex-col gap-3">
      {data.map((order) => (
        <div key={order.id} className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-[#38383a]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-syne font-extrabold text-[#0066cc] text-base">
                #{order.short_id || order.id.slice(0, 6)}
              </span>
              <p className="text-xs text-gray-500 dark:text-[#86868b] mt-0.5">
                {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
              order.status === 'completed' || order.status === 'collected' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
              : order.status === 'cancelled' || order.status === 'rejected' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500'
            }`}>
              {order.status}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-[#38383a]/50">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-[#f5f5f7]">
                {order.profiles?.full_name || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-[#86868b] mt-0.5 line-clamp-1">
                {type === 'canteen' ? (
                  order.items?.map((item: any) => `${item.qty || item.quantity}x ${item.name}`).join(', ')
                ) : (
                  `${order.specification?.copies || order.copies || order.quantity || 1} copies, ${order.specification?.color || order.color_mode || 'B&W'}`
                )}
              </p>
            </div>
            {order.total_amount && (
              <span className="font-syne font-bold text-gray-900 dark:text-[#f5f5f7]">
                ₹{order.total_amount}
              </span>
            )}
          </div>
        </div>
      ))}

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
        <div className="text-center py-10 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-100 dark:border-[#38383a]">
          <p className="text-gray-500 dark:text-[#86868b] font-medium">No order history found.</p>
        </div>
      )}
    </div>
  );
};
