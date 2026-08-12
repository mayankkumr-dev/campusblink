import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Link, useNavigate } from 'react-router';
import { format } from 'date-fns';

export const ProfessorPrintHistoryPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      if (!profile?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('print_orders')
        .select(`
          id,
          created_at,
          short_id,
          total_amount,
          status,
          file_name,
          specification,
          professor_pay_later,
          print_shops ( name )
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
      case 'pending': return 'bg-[#f5f5f7] text-[#1d1d1f] border-[#e0e0e0]';
      case 'printing': return 'bg-[#f5f5f7] text-[#0066cc] border-[#0066cc]';
      case 'ready': return 'bg-[#e0e0e0] text-[#1d1d1f] border-[#e0e0e0]';
      case 'cancelled': return 'bg-[#f5f5f7] text-[#1d1d1f] border-[#e0e0e0]';
      default: return 'bg-[#f5f5f7] text-[#1d1d1f] border-[#e0e0e0]';
    }
  };

  const getPaymentStatusText = (order: any) => {
    if (order.status === 'completed' || order.status === 'paid') return 'Paid';
    if (order.professor_pay_later) return 'Added to Dues';
    return 'Pending Payment';
  };

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans">
      {/* Sub-Nav Frosted */}
      <div className="sticky top-0 z-40 h-[52px] px-6 md:px-12 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#e0e0e0] flex items-center justify-between">
        <h2 className="text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f] font-['SF_Pro_Display',system-ui,-apple-system,sans-serif]">
          Faculty Print
        </h2>
        <div className="flex items-center gap-4">
          <Link to="/professor/print" className="text-[14px] font-normal tracking-[-0.224px] text-[#1d1d1f] hover:text-[#0066cc] transition-colors">
            Upload
          </Link>
          <div className="text-[14px] font-semibold tracking-[-0.224px] text-[#1d1d1f]">
            History
          </div>
          <button 
            onClick={() => navigate('/professor/print')}
            className="px-[15px] py-[8px] bg-[#1d1d1f] text-[#ffffff] text-[14px] font-normal tracking-[-0.224px] rounded-[8px] hover:scale-95 transition-transform"
          >
            New Print
          </button>
        </div>
      </div>

      <main className="max-w-[980px] mx-auto px-6 py-12 md:py-20">
        <div className="mb-12">
          <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f] font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] leading-[1.1]">
            Print History
          </h1>
          <p className="text-[28px] font-normal tracking-[0.196px] text-[#1d1d1f] mt-4 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] leading-[1.14]">
            Your past print orders and faculty dues status.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
             <div className="h-[120px] bg-[#f5f5f7] rounded-[18px] animate-pulse" />
             <div className="h-[120px] bg-[#f5f5f7] rounded-[18px] animate-pulse" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center bg-[#f5f5f7] rounded-[18px]">
            <p className="text-[17px] font-normal text-[#1d1d1f]">You haven't placed any print orders yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
               const copies = order.specification?.copies || 1;
               const itemsSummary = `${copies} cop${copies !== 1 ? 'ies' : 'y'}`;

               const isPaid = order.status === 'completed' || order.status === 'paid';
               const isDues = !isPaid && order.professor_pay_later;

               return (
                 <div key={order.id} className="bg-[#ffffff] border border-[#e0e0e0] rounded-[18px] p-6 hover:border-[#1d1d1f]/20 transition-colors">
                   <div className="flex flex-col md:flex-row justify-between gap-6">
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                         <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-[#1d1d1f]">
                           {order.print_shops?.name || 'Print Shop'}
                         </h3>
                         <span className="text-[14px] text-[#7a7a7a]">
                           {format(new Date(order.created_at), 'MMM d, yyyy')}
                         </span>
                       </div>
                       <p className="text-[17px] font-normal tracking-[-0.374px] text-[#1d1d1f] leading-[1.47] mb-2">
                         {order.file_name || 'Document'} ({itemsSummary})
                       </p>
                       <div className="flex items-center gap-3 mt-4">
                         <span className={`px-3 py-1 rounded-full text-[12px] font-semibold border ${getStatusColor(order.status)}`}>
                           {order.status.toUpperCase()}
                         </span>
                         <span className={`px-3 py-1 rounded-full text-[12px] font-semibold border ${
                           isPaid ? 'bg-[#f5f5f7] text-[#1d1d1f] border-[#e0e0e0]' : 
                           isDues ? 'bg-[#f5f5f7] text-[#0066cc] border-[#0066cc]' : 
                           'bg-[#fff5e6] text-[#cc7700] border-[#ffe0b2]'
                         }`}>
                           {getPaymentStatusText(order)}
                         </span>
                       </div>
                     </div>
                     
                     <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 border-[#f0f0f0] pt-4 md:pt-0">
                       <div className="text-left md:text-right">
                         <div className="text-[14px] text-[#7a7a7a] mb-1">Total</div>
                         <div className="text-[21px] font-semibold tracking-[0.231px] text-[#1d1d1f]">
                           ₹{order.total_amount?.toFixed(2)}
                         </div>
                       </div>
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
