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

function getStatusColor(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'ready' || s === 'completed' || s === 'delivered') return 'bg-[var(--success-light)] text-[var(--success-dark)]';
  if (s === 'preparing' || s === 'in_progress' || s === 'processing') return 'bg-[#FEF9C3] text-[var(--yellow-dark)]';
  if (s === 'cancelled' || s === 'rejected') return 'bg-[#FEE2E2] text-[var(--error-dark)]';
  return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
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
    <div className="max-w-4xl mx-auto">
      {/* Greeting */}
      <h1 className="font-syne font-extrabold text-3xl md:text-4xl text-[var(--text-primary)] mb-8">
        {getGreeting()}, Prof. {firstName} 👋
      </h1>

      {/* Module Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => navigate('/professor/canteen')}
          className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 text-left hover:border-[var(--yellow)] hover:shadow-sm transition-all group"
        >
          <div className="w-12 h-12 rounded-md bg-[#FEF9C3] flex items-center justify-center mb-3">
            <UtensilsCrossed className="w-6 h-6 text-[var(--yellow-dark)]" />
          </div>
          <h3 className="font-syne font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--yellow-dark)] transition-colors">Canteen</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Order food & beverages</p>
        </button>

        <button
          onClick={() => navigate('/professor/print')}
          className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5 text-left hover:border-[var(--yellow)] hover:shadow-sm transition-all group"
        >
          <div className="w-12 h-12 rounded-md bg-[#F0F9FF] flex items-center justify-center mb-3">
            <Printer className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h3 className="font-syne font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">Print Shop</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Print documents & files</p>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate('/professor/payments')}
          className={`bg-[var(--bg)] border rounded-lg p-5 text-left hover:shadow-sm transition-all ${
            pendingTotal > 0 ? 'border-[#DC2626]/30' : 'border-[var(--border)]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Pending Payments</span>
            <CreditCard className={`w-4 h-4 ${pendingTotal > 0 ? 'text-[#DC2626]' : 'text-[var(--text-muted)]'}`} />
          </div>
          <p className={`font-syne font-extrabold text-2xl ${pendingTotal > 0 ? 'text-[#DC2626]' : 'text-[var(--text-primary)]'}`}>
            ₹{pendingTotal.toLocaleString()}
          </p>
          {pendingTotal > 0 && (
            <p className="text-xs text-[#DC2626] font-medium mt-1 flex items-center gap-1">
              View & Pay <ChevronRight className="w-3 h-3" />
            </p>
          )}
        </button>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Today's Orders</span>
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <p className="font-syne font-extrabold text-2xl text-[var(--text-primary)]">{todayCount}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-syne font-bold text-lg text-[var(--text-primary)]">Recent Orders</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <ListSkeleton key={`prof-dashboard-orders-skeleton-${index}`} rows={1} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-[var(--border)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No orders yet. Start by ordering from the canteen or print shop.</p>
          </div>
        ) : (
          <div>
            {orders.map((order) => (
              <div key={order.id} className="px-5 py-4 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-primary)] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {order._type === 'canteen' ? (
                      <UtensilsCrossed className="w-4 h-4 text-[var(--yellow-dark)]" />
                    ) : (
                      <Printer className="w-4 h-4 text-[var(--accent)]" />
                    )}
                    <span className="font-semibold text-sm text-[var(--text-primary)]">{order.shop?.name || 'Shop'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                    {order.status || 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">
                  {order._type === 'canteen'
                    ? (Array.isArray(order.items) ? order.items.map((i: any) => `${i.name || i.item_name} ×${i.quantity || 1}`).join(', ') : 'Order')
                    : (order.file_name || 'Print job')
                  }
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">{formatDate(order.created_at)}</span>
                  <span className="font-bold text-sm text-[var(--text-primary)]">₹{order.total_amount || order.amount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
