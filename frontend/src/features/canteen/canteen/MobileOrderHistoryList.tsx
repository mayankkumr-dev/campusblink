import React from 'react';
import { RotateCcw, Check, ShoppingBag, X, Calendar } from 'lucide-react';

export interface MobileOrderHistoryListProps {
  historyOrders: any[];
  onRequestReorder: (order: any) => void;
}

export const MobileOrderHistoryList: React.FC<MobileOrderHistoryListProps> = ({
  historyOrders,
  onRequestReorder,
}) => {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 text-gray-900 font-sans pb-28 select-none">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between">
        <div>
          <h1 className="font-syne text-xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif', letterSpacing: '-0.374px' }}>
            Order History
          </h1>
          <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
            Past completed, rejected & reordered items
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold font-syne">
          {historyOrders.length}
        </span>
      </header>

      {/* Vertical List of Sleek Shadow-Elevated Cards */}
      <div className="p-4 space-y-3.5">
        {historyOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 my-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="font-syne text-base font-extrabold text-gray-900">
              No order history yet
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-1 max-w-xs mx-auto">
              Completed, cancelled, or collected canteen orders will show up here.
            </p>
          </div>
        ) : (
          historyOrders.map((order) => {
            const isCompleted = order.status === 'completed' || order.status === 'picked_up';
            const isReorderRequested = order.status === 'reorder_requested';
            const isReordered = order.status === 'reorder_completed';

            const formattedDate = new Date(order.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = new Date(order.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col"
              >
                {/* Top Micro-Typography: Date & Order ID */}
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-400 dark:text-shop-text-secondary pb-2 border-b border-gray-50 dark:border-shop-border-subtle">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {formattedDate} • {formattedTime}
                  </span>
                  <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-bold">
                    #{order.id.slice(0, 6)}
                  </span>
                </div>

                {/* Prominent Student Name & Items Ordered */}
                <div className="py-3">
                  <p className="font-syne font-extrabold text-base text-gray-900 leading-tight">
                    {order.profiles?.name || 'Student Customer'}
                  </p>
                  <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                    {order.items
                      ?.map((item: any) => `${item.qty}x ${item.name}`)
                      .join(', ') || 'No items listed'}
                  </p>
                </div>

                {/* Status Pill & Bolded Revenue */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold font-syne">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Completed
                      </span>
                    ) : isReorderRequested ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold font-syne">
                        <RotateCcw className="w-3 h-3 animate-spin" /> Reorder Sent
                      </span>
                    ) : isReordered ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold font-syne">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Reordered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold font-syne">
                        <X className="w-3.5 h-3.5 stroke-[2.5]" /> Rejected
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-syne text-lg font-black tracking-tight ${
                        isCompleted
                          ? 'text-gray-900'
                          : 'text-gray-400 line-through'
                      }`}
                    >
                      ₹{order.total}
                    </span>
                  </div>
                </div>

                {/* Full-Width Sleek Ghost Action Button */}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={() => onRequestReorder(order)}
                    className="w-full mt-3.5 py-2.5 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-700 font-syne font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-gray-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Request Reorder</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
