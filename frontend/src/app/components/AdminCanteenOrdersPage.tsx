import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Search, ShoppingBag, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllCanteenOrders } from '../../api/admin';
import { updateOrderStatus } from '../../api/canteen';

const getErrorMessage = (error: any, fallback: string) => error?.message || fallback;

const ORDER_STATUSES = ['all', 'placed', 'preparing', 'ready', 'picked_up', 'completed', 'cancelled'];

const prettyStatus = (status?: string) => {
  if (!status) return 'Unknown';
  return status.replace('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
};

export const AdminCanteenOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await getAllCanteenOrders();
    if (error) {
      toast.error(getErrorMessage(error, 'Failed to load canteen orders'));
      setOrders([]);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const uniqueShops = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((order) => {
      if (order.shop?.id && order.shop?.name) {
        map.set(order.shop.id, order.shop.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesShop = shopFilter === 'all' || order.shop_id === shopFilter;
      const matchesSearch =
        !q ||
        String(order.id).toLowerCase().includes(q) ||
        (order.student?.name || '').toLowerCase().includes(q) ||
        (order.shop?.name || '').toLowerCase().includes(q);
      return matchesStatus && matchesShop && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter, shopFilter]);

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }, []);

  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => new Date(o.created_at).getTime() >= today);
    const totalRevenue = todayOrders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
    const cancelled = todayOrders.filter((o) => o.status === 'cancelled').length;
    const cancellationRate = todayOrders.length ? ((cancelled / todayOrders.length) * 100).toFixed(1) : '0.0';

    const fulfilled = todayOrders.filter((o) => ['picked_up', 'completed'].includes(o.status));
    const avgCompletionMins = fulfilled.length
      ? Math.round(
          fulfilled.reduce((acc, order) => {
            const created = new Date(order.created_at).getTime();
            const updated = new Date(order.updated_at || order.created_at).getTime();
            return acc + Math.max(0, Math.round((updated - created) / 60000));
          }, 0) / fulfilled.length
        )
      : 0;

    return {
      totalOrders: todayOrders.length,
      totalRevenue,
      cancelled,
      cancellationRate,
      avgCompletionMins,
    };
  }, [orders, today]);

  const updateStatus = async (orderId: string, nextStatus: string) => {
    const { error } = await updateOrderStatus(orderId, nextStatus);
    if (error) {
      toast.error(getErrorMessage(error, 'Failed to update order status'));
      return;
    }
    toast.success(`Order marked ${prettyStatus(nextStatus)}`);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus, updated_at: new Date().toISOString() } : order
      )
    );
  };

  const exportCsv = () => {
    const rows = filteredOrders.map((order) => ({
      order_id: order.id,
      student: order.student?.name || 'Student',
      shop: order.shop?.name || 'Unknown',
      total: order.total_amount || 0,
      status: order.status,
      created_at: order.created_at,
    }));

    const header = Object.keys(
      rows[0] || { order_id: '', student: '', shop: '', total: '', status: '', created_at: '' }
    );
    const csv = [
      header.join(','),
      ...rows.map((row) => {
        const rowRecord = row as Record<string, any>;
        return header.map((key) => `"${String(rowRecord[key] ?? '').replace(/"/g, '""')}"`).join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'canteen-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusPill = (status: string) => {
    const s = status.toLowerCase();
    let pillStyle = 'bg-surface-elevated text-text-primary border-border-subtle';
    if (s === 'placed' || s === 'preparing') pillStyle = 'bg-accent-amber-soft text-accent-amber border-accent-amber-soft';
    if (s === 'ready') pillStyle = 'bg-accent-blue-soft text-blue-700 border-accent-blue-soft';
    if (s === 'picked_up' || s === 'completed') pillStyle = 'bg-accent-green/15 text-accent-green border-emerald-200';
    if (s === 'cancelled') pillStyle = 'bg-accent-red/15 text-accent-red border-rose-200';

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pillStyle}`}
      >
        {prettyStatus(status)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-amber" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Contextual Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary/70 uppercase tracking-wider">
            <span>Orders Today</span>
            <ShoppingBag className="h-4 w-4 text-accent-amber" />
          </div>
          <div className="mt-3 font-syne text-2xl font-extrabold text-text-primary">
            {stats.totalOrders}
          </div>
        </div>

        <div className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary/70 uppercase tracking-wider">
            <span>Revenue Today</span>
            <TrendingUp className="h-4 w-4 text-accent-green" />
          </div>
          <div className="mt-3 font-syne text-2xl font-extrabold text-accent-green">
            ₹{stats.totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary/70 uppercase tracking-wider">
            <span>Cancelled</span>
            <AlertCircle className="h-4 w-4 text-accent-red" />
          </div>
          <div className="mt-3 font-syne text-2xl font-extrabold text-text-primary">
            {stats.cancelled}{' '}
            <span className="text-xs text-text-secondary/70 font-medium">({stats.cancellationRate}%)</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary/70 uppercase tracking-wider">
            <span>Avg Completion</span>
            <Clock className="h-4 w-4 text-accent-blue" />
          </div>
          <div className="mt-3 font-syne text-2xl font-extrabold text-accent-blue">
            {stats.avgCompletionMins} min
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border-subtle bg-surface p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80 group">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/70 group-focus-within:text-amber-500 transition-colors" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search order ID, student, canteen..."
            className="w-full rounded-2xl border border-border-subtle bg-surface py-2.5 pl-10 pr-4 text-xs font-semibold text-text-primary placeholder:text-text-placeholder outline-none focus:border-amber-400 focus:bg-surface transition-all shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-border-subtle bg-surface px-3.5 py-2 text-xs font-bold text-text-primary outline-none focus:border-amber-400 focus:bg-surface"
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {prettyStatus(status)}
              </option>
            ))}
          </select>
          <select
            value={shopFilter}
            onChange={(event) => setShopFilter(event.target.value)}
            className="rounded-xl border border-border-subtle bg-surface px-3.5 py-2 text-xs font-bold text-text-primary outline-none focus:border-amber-400 focus:bg-surface"
          >
            <option value="all">All Canteens</option>
            {uniqueShops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3.5 py-2 text-xs font-bold text-text-primary hover:bg-surface-elevated transition-colors shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-elevated">
                <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-secondary/70 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-secondary/70 uppercase tracking-wider">
                  Student
                </th>
                <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-secondary/70 uppercase tracking-wider">
                  Canteen
                </th>
                <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-secondary/70 uppercase tracking-wider">
                  Total
                </th>
                <th className="py-3.5 px-5 text-[11px] font-extrabold text-text-secondary/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3.5 px-5 text-right text-[11px] font-extrabold text-text-secondary/70 uppercase tracking-wider">
                  Action Control
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-syne text-xs font-bold text-text-primary">
                      #{String(order.id).slice(0, 8)}
                    </div>
                    <div className="text-[10px] text-text-secondary/70 mt-0.5">
                      {new Date(order.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-xs font-semibold text-text-primary">
                    {order.student?.name || 'Student'}
                  </td>
                  <td className="py-4 px-5 text-xs text-text-secondary font-medium">
                    {order.shop?.name || 'Unknown'}
                  </td>
                  <td className="py-4 px-5 font-syne text-xs font-extrabold text-text-primary">
                    ₹{Number(order.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-5">
                    {renderStatusPill(order.status || 'placed')}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <select
                      value={order.status || ''}
                      onChange={(event) => updateStatus(order.id, event.target.value)}
                      className="rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-amber-400 focus:bg-surface transition-all shadow-2xs"
                    >
                      {ORDER_STATUSES.filter((s) => s !== 'all').map((status) => (
                        <option key={status} value={status}>
                          Mark {prettyStatus(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs font-semibold text-text-secondary/70">
                    No canteen orders found matching your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
