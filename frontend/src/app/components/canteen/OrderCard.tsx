import React from 'react';
import { Badge } from '../ui/badge';
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
      <div className="flex flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_2px_16px_rgba(16,185,129,0.06)] transition-all hover:shadow-[0_6px_24px_rgba(16,185,129,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100/60 bg-emerald-50/70 px-5 py-4">
          <span className="font-syne text-base font-extrabold text-slate-900">
            #{order.id.slice(0, 6)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1 text-[11px] font-bold text-emerald-700">
            <Check className="h-3 w-3 stroke-[2.5]" /> Ready for Pickup
          </span>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-3.5 px-5 py-4">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-syne text-sm font-bold text-slate-900 truncate">
              {order.profiles?.name || 'Student Customer'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {order.items?.length || 0} items • <span className="font-bold text-slate-800">₹{order.total}</span>
            </p>
            {order.is_delivery_order && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                🚀 Delivery: Room {order.delivery_room_number || ''}
              </span>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
          <ul className="space-y-1.5">
            {order.items?.map((item: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-medium truncate pr-2">
                  <span className="font-bold text-emerald-600">{item.qty}x</span> {item.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={() => onDismissReady?.(order.id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600 bg-white py-3 text-xs font-bold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-600 hover:text-white"
          >
            <Check className="h-4 w-4 stroke-[2.2]" /> Mark Collected
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'preparing') {
    return (
      <div className="flex flex-col overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-[0_2px_16px_rgba(245,158,11,0.06)] transition-all hover:shadow-[0_6px_24px_rgba(245,158,11,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-100/60 bg-amber-50/70 px-5 py-4">
          <span className="font-syne text-base font-extrabold text-slate-900">
            #{order.id.slice(0, 6)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1 text-[11px] font-bold text-amber-700">
            <ChefHat className="h-3 w-3 stroke-[2.2]" /> Preparing
          </span>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-3.5 px-5 py-4">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-syne text-sm font-bold text-slate-900 truncate">
              {order.profiles?.name || 'Student Customer'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {order.items?.length || 0} items • <span className="font-bold text-slate-800">₹{order.total}</span>
            </p>
            {order.is_delivery_order && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                🚀 Delivery: Room {order.delivery_room_number || ''}
              </span>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
          <ul className="space-y-1.5">
            {order.items?.map((item: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-medium truncate pr-2">
                  <span className="font-bold text-amber-600">{item.qty}x</span> {item.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={() => onMarkReady?.(order.id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-600"
          >
            <Check className="h-4 w-4 stroke-[2.2]" /> Mark Ready for Pickup
          </button>
        </div>
      </div>
    );
  }

  // Incoming / New Order
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_6px_22px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <span className="font-syne text-base font-extrabold text-slate-900">
          #{order.id.slice(0, 6)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-2xs">
          <Clock className="h-3 w-3 text-slate-400" />
          {new Date(order.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-3.5 px-5 py-4">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-syne text-sm font-bold text-slate-900 truncate">
            {order.profiles?.name || 'Student Customer'}
          </p>
          <p className="mt-0.5 text-[11px] font-mono text-slate-400">
            ID: {order.student_id?.slice(0, 8)}
          </p>
          {order.is_delivery_order && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
              🚀 Delivery: Room {order.delivery_room_number || ''}
            </span>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="flex-1 border-t border-slate-100 bg-slate-50/40 px-5 py-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Order Items
        </p>
        <ul className="space-y-1.5">
          {order.items?.map((item: any, idx: number) => (
            <li key={idx} className="flex items-start justify-between gap-2 text-xs text-slate-700">
              <span className="font-medium">
                <span className="font-bold text-blue-600 pr-1">{item.qty}x</span>
                {item.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Total & Accessible Actions */}
      <div className="flex flex-col gap-4 border-t border-slate-100 bg-white p-5">
        <div className="flex items-end justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Amount
          </span>
          <span className="font-syne text-xl font-extrabold text-slate-900">
            ₹{order.total}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onReject?.(order)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50/70 py-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
          >
            <X className="h-3.5 w-3.5 stroke-[2.2]" /> Reject
          </button>
          <button
            type="button"
            onClick={() => onAccept?.(order.id)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Accept
          </button>
        </div>
      </div>
    </div>
  );
};
