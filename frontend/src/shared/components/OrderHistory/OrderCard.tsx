import React from 'react';
import { format } from 'date-fns';

export interface UnifiedOrder {
  id: string;
  type: 'canteen' | 'print';
  shopName: string;
  createdAt: string;
  shortId: string;
  totalAmount: number;
  status: string;
  itemsSummary: string; // "3 items" or "1 document (5 pages)"
}

interface OrderCardProps {
  order: UnifiedOrder;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing':
      case 'printing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const statusColor = getStatusColor(order.status);
  const formattedDate = format(new Date(order.createdAt), 'MMM d, yyyy • h:mm a');

  return (
    <div className="bg-white shadow-sm rounded-xl p-4 border border-gray-100 transition-all hover:shadow-md flex flex-col gap-3">
      {/* Top Row: Shop Name & Date */}
      <div className="flex justify-between items-start">
        <span className="font-semibold text-gray-800 text-sm">
          {order.shopName}
        </span>
        <span className="text-xs text-gray-400 font-medium">
          {formattedDate}
        </span>
      </div>

      {/* Middle Row: Atomic Order Number */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
          Order Number
        </span>
        <span className="text-3xl font-extrabold text-blue-600 tracking-tight">
          #{order.shortId || '---'}
        </span>
        <span className="text-sm text-gray-500 mt-1">
          {order.itemsSummary}
        </span>
      </div>

      {/* Bottom Row: Total & Status */}
      <div className="flex justify-between items-end mt-2 pt-3 border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-medium">Total Amount</span>
          <span className="font-bold text-gray-900">
            ₹{order.totalAmount?.toFixed(2)}
          </span>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusColor}`}>
          {order.status}
        </div>
      </div>
    </div>
  );
};
