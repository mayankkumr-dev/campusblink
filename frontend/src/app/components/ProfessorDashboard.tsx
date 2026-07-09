import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { UtensilsCrossed, Printer, CreditCard, Clock, ChevronRight, Package } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { getProfessorOrders, getTodayOrdersCount, getPendingPaymentsTotal } from '../../api/professor';
import { ListSkeleton } from './ui/Skeletons';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadgeClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'ready' || s === 'completed' || s === 'delivered') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
  }
  if (s === 'preparing' || s === 'in_progress' || s === 'processing') {
    return 'bg-amber-50 text-amber-700 border border-amber-200/60';
  }
  if (s === 'cancelled' || s === 'rejected') {
    return 'bg-rose-50 text-rose-700 border border-rose-200/60';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200/60';
}

export const ProfessorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const firstName = getFirstName(profile?.name, 'Professor');

  const [orders, setOrders] = useState<any[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const [ordersRes, todayRes, pendingRes] = await Promise.all([
        getProfessorOrders(profile.id, 5),
        getTodayOrdersCount(profile.id),
        getPendingPaymentsTotal(profile.id),
      ]);
      if (!mounted) return;
      setOrders(ordersRes.data || []);
      setTodayCount(todayRes.data || 0);
      setPendingTotal(pendingRes.data || 0);
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [profile?.id]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16 font-sans">
      {/* Modernized Greeting Header */}
      <section className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        <h1 className="font-syne text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {getGreeting()}, Prof. {firstName} 👋
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-xl leading-relaxed">
          Welcome to your faculty dashboard. Order canteen refreshments, send print jobs, and manage your campus account seamlessly.
        </p>
      </section>

      {/* Upgraded Main Action Cards (Canteen & Print Shop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <button
          onClick={() => navigate('/professor/canteen')}
          className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-5 text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="font-syne font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
              Canteen Orders
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Order faculty refreshments & beverages directly to room or pickup.
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/professor/print')}
          className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-5 text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
            <Printer className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="font-syne font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
              Print Shop Jobs
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload documents, syllabus copies, and exam papers for instant printing.
            </p>
          </div>
        </button>
      </div>

      {/* Upgraded Metric Cards with Soft Shadows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <button
          onClick={() => navigate('/professor/payments')}
          className={`group rounded-2xl border p-6 text-left transition-all flex flex-col justify-between ${
            pendingTotal > 0
              ? 'border-rose-100 bg-gradient-to-br from-rose-50/50 to-white shadow-[0_4px_18px_rgba(225,29,72,0.06)]'
              : 'border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_18px_rgba(0,0,0,0.07)]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Faculty Payments
            </span>
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                pendingTotal > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p
              className={`font-syne font-extrabold text-3xl tracking-tight ${
                pendingTotal > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              ₹{pendingTotal.toLocaleString()}
            </p>
            {pendingTotal > 0 ? (
              <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1 group-hover:underline">
                View & Settle Outstanding Dues <ChevronRight className="w-3.5 h-3.5" />
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1.5">All campus accounts clear</p>
            )}
          </div>
        </button>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Orders Activity
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-syne font-extrabold text-3xl tracking-tight text-slate-900">
              {todayCount}
            </p>
            <p className="text-xs text-slate-400 mt-1.5">Total requests placed today</p>
          </div>
        </div>
      </div>

      {/* Highly Legible Premium Recent Orders List */}
      <section className="rounded-3xl border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-syne font-bold text-xl text-slate-900">Recent Faculty Orders</h2>
            <p className="text-xs text-slate-500 mt-0.5">Summary of your latest canteen and print shop requests.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 p-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <ListSkeleton key={`prof-dashboard-orders-skeleton-${index}`} rows={1} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <Package className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="font-syne font-bold text-base text-slate-900">No recent orders found</p>
            <p className="text-xs text-slate-500 mt-1">
              Place your first order from the Canteen or Print Shop cards above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <div
                key={order.id}
                className="px-6 py-4.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                    {order._type === 'canteen' ? (
                      <UtensilsCrossed className="w-4.5 h-4.5 text-amber-600" />
                    ) : (
                      <Printer className="w-4.5 h-4.5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-syne font-bold text-sm text-slate-900 truncate">
                        {order.shop?.name || 'Campus Shop'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {order._type === 'canteen'
                        ? Array.isArray(order.items)
                          ? order.items.map((i: any) => `${i.name || i.item_name} ×${i.quantity || 1}`).join(', ')
                          : 'Refreshment Order'
                        : order.file_name || 'Document Print Job'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="font-syne font-bold text-sm text-slate-900">
                      ₹{order.total_amount || order.amount || 0}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(order.status)}`}
                  >
                    {order.status || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
