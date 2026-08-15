import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export const StudentCanteenHistoryPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      if (!profile?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('canteen_orders')
        .select(`
          id,
          created_at,
          short_id,
          total_amount,
          status,
          payment_status,
          items,
          canteen_shops ( name )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    }
    loadOrders();
  }, [profile?.id]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'preparing': return 'bg-blue-50 dark:bg-blue-950/50 text-[#0066cc] dark:text-[#60A5FA] border-blue-200 dark:border-blue-800';
      case 'ready': return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'cancelled': return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getPaymentStatusText = (status: string) => {
    return status === 'completed' || status === 'paid' ? 'Paid' : 'Pending Payment';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101113] text-[#1d1d1f] dark:text-[#F4F5F7] font-sans">
      {/* Sub-Nav Frosted */}
      <div className="sticky top-0 z-40 h-[52px] px-6 md:px-12 bg-white/80 dark:bg-[#171A21]/80 backdrop-blur-xl border-b border-gray-200 dark:border-[#262A33] flex items-center justify-between">
        <h2 className="text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f] dark:text-[#F4F5F7] font-['SF_Pro_Display',system-ui,-apple-system,sans-serif]">
          Canteen
        </h2>
        <div className="flex items-center gap-4">
          <Link to="/student/canteen" className="text-[14px] font-normal tracking-[-0.224px] text-[#1d1d1f] dark:text-[#9BA1AC] hover:text-[#0066cc] dark:hover:text-[#60A5FA] transition-colors">
            Menu
          </Link>
          <div className="text-[14px] font-semibold tracking-[-0.224px] text-[#1d1d1f] dark:text-[#F4F5F7]">
            Order History
          </div>
          <button 
            onClick={() => navigate('/student/canteen')}
            className="px-[15px] py-[8px] bg-[#1d1d1f] dark:bg-blue-600 text-[#ffffff] text-[14px] font-normal tracking-[-0.224px] rounded-[8px] hover:scale-95 transition-transform"
          >
            New Order
          </button>
        </div>
      </div>

      <main className="max-w-[980px] mx-auto px-6 py-12 md:py-20">
        <div className="mb-12">
          <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#F4F5F7] font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] leading-[1.1]">
            Order History
          </h1>
          <p className="text-[28px] font-normal tracking-[0.196px] text-gray-500 dark:text-[#9BA1AC] mt-4 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] leading-[1.14]">
            Your past canteen orders and payment status.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
             <div className="h-[120px] bg-gray-200 dark:bg-[#171A21] rounded-[18px] animate-pulse" />
             <div className="h-[120px] bg-gray-200 dark:bg-[#171A21] rounded-[18px] animate-pulse" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#171A21] border border-gray-200 dark:border-[#262A33] rounded-[18px]">
            <p className="text-[17px] font-normal text-gray-600 dark:text-[#9BA1AC]">You haven't placed any canteen orders yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
               let itemsSummary = 'Custom Order';
               if (Array.isArray(order.items)) {
                 itemsSummary = order.items.map((i: any) => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ');
               }

               return (
                 <div key={order.id} className="bg-white dark:bg-[#171A21] border border-gray-200 dark:border-[#262A33] rounded-[18px] p-6 hover:border-[#1d1d1f]/20 dark:hover:border-gray-600 transition-colors">
                   <div className="flex flex-col md:flex-row justify-between gap-6">
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                         <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-[#1d1d1f] dark:text-[#F4F5F7]">
                           {order.canteen_shops?.name || 'Canteen'}
                         </h3>
                         <span className="text-[14px] text-gray-500 dark:text-[#9BA1AC]">
                           {format(new Date(order.created_at), 'MMM d, yyyy')}
                         </span>
                       </div>
                       <p className="text-[17px] font-normal tracking-[-0.374px] text-gray-700 dark:text-[#D1D5DB] leading-[1.47] mb-4">
                         {itemsSummary}
                       </p>
                       <div className="flex items-center gap-3">
                         <span className={`px-3 py-1 rounded-full text-[12px] font-semibold border ${getStatusColor(order.status)}`}>
                           {order.status.toUpperCase()}
                         </span>
                         <span className={`px-3 py-1 rounded-full text-[12px] font-semibold border ${order.payment_status === 'completed' || order.payment_status === 'paid' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' : 'bg-[#fff5e6] dark:bg-amber-950/50 text-[#cc7700] dark:text-amber-400 border-[#ffe0b2] dark:border-amber-800'}`}>
                           {getPaymentStatusText(order.payment_status)}
                         </span>
                       </div>
                     </div>
                     
                     <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 border-gray-200 dark:border-[#262A33] pt-4 md:pt-0">
                       <div className="text-left md:text-right">
                         <div className="text-[14px] text-gray-500 dark:text-[#9BA1AC] mb-1">Total</div>
                         <div className="text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f] dark:text-[#F4F5F7]">
                           ₹{order.total_amount?.toFixed(2)}
                         </div>
                       </div>
                       
                       <Link 
                         to={`/student/canteen/reorder/${order.id}`}
                         className="mt-4 md:mt-0 text-[17px] font-normal text-[#0066cc] dark:text-[#60A5FA] hover:underline"
                       >
                         Reorder
                       </Link>
                     </div>
                   </div>
                 </div>
               );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
