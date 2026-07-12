import React from 'react';
import { RotateCcw, Check, FileText, X, Calendar } from 'lucide-react';

export interface MobilePrintOrderHistoryProps {
  historyOrders: any[];
  onRequestReorder: (order: any) => void;
}

export const MobilePrintOrderHistory: React.FC<MobilePrintOrderHistoryProps> = ({
  historyOrders,
  onRequestReorder,
}) => {
  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA] dark:bg-shop-bg-base text-gray-900 dark:text-shop-text-primary font-sans pb-28 select-none transition-colors">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-shop-bg-surface/95 backdrop-blur-md border-b border-gray-100 dark:border-shop-border-subtle px-4 py-3.5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-none flex items-center justify-between transition-colors">
        <div>
          <h1 className="font-syne text-xl font-extrabold text-gray-900 dark:text-shop-text-primary tracking-tight">
            Print History
          </h1>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-shop-text-secondary mt-0.5">
            Past completed, rejected & reordered print jobs
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-600 dark:text-shop-text-secondary text-xs font-bold font-syne">
          {historyOrders.length}
        </span>
      </header>

      {/* Vertical List of Sleek Shadow-Elevated Cards */}
      <div className="p-4 space-y-3.5">
        {historyOrders.length === 0 ? (
          <div className="bg-white dark:bg-shop-bg-surface rounded-3xl p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-transparent dark:border-shop-border-subtle my-6 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-shop-bg-surface-raised text-gray-400 dark:text-shop-text-secondary flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-shop-text-primary">
              No print history yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-shop-text-secondary font-medium mt-1 max-w-xs mx-auto">
              Completed, collected, or cancelled print jobs will show up here.
            </p>
          </div>
        ) : (
          historyOrders.map((order) => {
            const isCompleted =
              order.status === 'collected' || order.status === 'completed';
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
                className="bg-white dark:bg-shop-bg-surface rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-shop-border-subtle flex flex-col transition-colors"
              >
                {/* Top Micro-Typography: Date & Order ID */}
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-400 dark:text-shop-text-secondary pb-2 border-b border-gray-50 dark:border-shop-border-subtle">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400 dark:text-shop-text-secondary" />
                    {formattedDate} • {formattedTime}
                  </span>
                  <span className="bg-gray-50 dark:bg-shop-bg-surface-raised text-gray-500 dark:text-shop-text-secondary px-2 py-0.5 rounded font-bold">
                    #{order.id.slice(0, 6)}
                  </span>
                </div>

                {/* Prominent Student Name & File Name */}
                <div className="py-3">
                  <p className="font-syne font-extrabold text-base text-gray-900 dark:text-shop-text-primary leading-tight">
                    {order.profiles?.name || 'Student Customer'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-shop-text-secondary font-medium mt-1 truncate">
                    📄 {order.file_name || 'Document.pdf'}
                  </p>
                </div>

                {/* Status Pill & Bolded Revenue */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold font-syne">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Completed
                      </span>
                    ) : isReorderRequested ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 text-xs font-bold font-syne">
                        <RotateCcw className="w-3 h-3 animate-spin" /> Reorder Sent
                      </span>
                    ) : isReordered ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 text-xs font-bold font-syne">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Reordered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 text-xs font-bold font-syne">
                        <X className="w-3.5 h-3.5 stroke-[2.5]" /> Cancelled
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-syne text-lg font-black tracking-tight ${
                        isCompleted
                          ? 'text-gray-900 dark:text-shop-text-primary'
                          : 'text-gray-400 dark:text-shop-text-tertiary line-through'
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
                    className="w-full mt-3.5 py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-shop-bg-surface-raised hover:bg-gray-100 dark:hover:bg-shop-bg-surface-hover active:scale-[0.98] text-gray-700 dark:text-shop-text-secondary font-syne font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-gray-100 dark:border-shop-border-subtle"
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
