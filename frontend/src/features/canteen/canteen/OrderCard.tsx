import React from 'react';
import { Badge } from '../../../app/components/ui/badge';
import { Check, ChefHat, Clock, X, ShoppingBag } from 'lucide-react';
import { getAvatarDataUrl } from '../../../lib/avatar';

export interface OrderCardProps {
  order: any;
  variant: 'ready' | 'preparing' | 'new';
  onAccept?: (id: string) => void;
  onReject?: (order: any) => void;
  onMarkReady?: (id: string) => void;
  onDismissReady?: (id: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  variant,
  onAccept,
  onReject,
  onMarkReady,
  onDismissReady,
}) => {
  const avatarUrl =
    order.profiles?.avatar_url ||
    getAvatarDataUrl({ name: order.profiles?.name, seed: order.student_id || order.id });

  if (variant === 'ready') {
    return (
      <div className="flex flex-col overflow-hidden rounded-[20px] bg-white dark:bg-[#1c1c1e] shadow-[0_4px_24px_rgba(16,185,129,0.06)] dark:shadow-none border border-emerald-100 dark:border-emerald-900/30 transition-all hover:border-emerald-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-50 dark:border-emerald-900/20">
          <span className="font-syne text-sm font-bold text-gray-900 dark:text-[#f5f5f7]">
            #{order.short_id || order.id.slice(0, 6)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Check className="h-3 w-3 stroke-[2.5]" /> Ready
          </span>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-emerald-50 dark:bg-[#2c2c2e]">
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-syne text-sm font-bold text-gray-900 dark:text-[#f5f5f7] truncate">
              {order.profiles?.name || 'Student'}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-[#86868b]">
              {order.items?.length || 0} items
            </p>
            {order.is_delivery_order && (
              <span className="mt-1 inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                🚀 Delivery: Room {order.delivery_room_number || ''}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="block font-syne text-lg font-black text-gray-900 dark:text-[#f5f5f7]">
              ₹{order.total}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div className="px-4 py-3 bg-emerald-50/30 dark:bg-[#2c2c2e]/50 border-t border-emerald-50 dark:border-emerald-900/20">
          <ul className="space-y-1.5">
            {order.items?.map((item: any, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-[#f5f5f7]">
                <span className="font-bold text-emerald-600">{item.qty}x</span>
                <span className="font-medium truncate">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <div className="p-3 bg-white dark:bg-[#1c1c1e] border-t border-emerald-50 dark:border-emerald-900/20">
          <button
            type="button"
            onClick={() => onDismissReady?.(order.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-600 dark:border-emerald-800 bg-white dark:bg-[#1c1c1e] py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-500 shadow-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/30 active:scale-95"
          >
            <Check className="h-4 w-4 stroke-[2.5]" /> Mark Collected
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'preparing') {
    return (
      <div className="flex flex-col overflow-hidden rounded-[20px] bg-white dark:bg-[#1c1c1e] shadow-[0_4px_24px_rgba(245,158,11,0.06)] dark:shadow-none border border-amber-100 dark:border-amber-900/30 transition-all hover:border-amber-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50 dark:border-amber-900/20">
          <span className="font-syne text-sm font-bold text-gray-900 dark:text-[#f5f5f7]">
            #{order.short_id || order.id.slice(0, 6)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
            <ChefHat className="h-3 w-3 stroke-[2.2]" /> Preparing
          </span>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-amber-50 dark:bg-[#2c2c2e]">
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-syne text-sm font-bold text-gray-900 dark:text-[#f5f5f7] truncate">
              {order.profiles?.name || 'Student'}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-[#86868b]">
              {order.items?.length || 0} items
            </p>
            {order.is_delivery_order && (
              <span className="mt-1 inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                🚀 Delivery: Room {order.delivery_room_number || ''}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="block font-syne text-lg font-black text-gray-900 dark:text-[#f5f5f7]">
              ₹{order.total}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div className="px-4 py-3 bg-amber-50/30 dark:bg-[#2c2c2e]/50 border-t border-amber-50 dark:border-amber-900/20">
          <ul className="space-y-1.5">
            {order.items?.map((item: any, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-[#f5f5f7]">
                <span className="font-bold text-amber-500">{item.qty}x</span>
                <span className="font-medium truncate">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <div className="p-3 bg-white dark:bg-[#1c1c1e] border-t border-amber-50 dark:border-amber-900/20">
          <button
            type="button"
            onClick={() => onMarkReady?.(order.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-600 active:scale-95"
          >
            <Check className="h-4 w-4 stroke-[2.5]" /> Mark Ready
          </button>
        </div>
      </div>
    );
  }

  // Incoming / New Order
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] bg-white dark:bg-[#1c1c1e] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-[#38383a] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-[#38383a]/50">
        <span className="font-syne text-sm font-bold text-gray-900 dark:text-[#f5f5f7]">
          #{order.short_id || order.id.slice(0, 6)}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-[#86868b]">
          <Clock className="h-3 w-3" />
          {new Date(order.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-50 dark:bg-[#2c2c2e]">
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-syne text-sm font-bold text-gray-900 dark:text-[#f5f5f7] truncate">
            {order.profiles?.name || 'Student'}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-[#86868b] truncate">
            ID: {order.student_id?.slice(0, 8)}
          </p>
          {order.is_delivery_order && (
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              🚀 Delivery: Room {order.delivery_room_number || ''}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="block font-syne text-lg font-black text-gray-900 dark:text-[#f5f5f7]">
            ₹{order.total}
          </span>
        </div>
      </div>

      {/* Order Details */}
      <div className="px-4 py-3 bg-gray-50/50 dark:bg-[#2c2c2e]/50 border-t border-gray-50 dark:border-[#38383a]/50">
        <ul className="space-y-1.5">
          {order.items?.map((item: any, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-[#f5f5f7]">
              <span className="font-bold text-amber-500">{item.qty}x</span>
              <span className="font-medium truncate">{item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Total & Accessible Actions */}
      <div className="p-3 bg-white dark:bg-[#1c1c1e] border-t border-gray-50 dark:border-[#38383a]/50">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onReject?.(order)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/20 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 transition-colors active:scale-95"
          >
            <X className="h-4 w-4 stroke-[2]" /> Reject
          </button>
          <button
            type="button"
            onClick={() => onAccept?.(order.id)}
            className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition-colors active:scale-95"
          >
            <Check className="h-4 w-4 stroke-[2.5]" /> Accept
          </button>
        </div>
      </div>
    </div>
  );
};
