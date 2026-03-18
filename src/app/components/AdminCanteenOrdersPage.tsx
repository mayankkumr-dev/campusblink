import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Search } from 'lucide-react';
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

    const header = Object.keys(rows[0] || { order_id: '', student: '', shop: '', total: '', status: '', created_at: '' });
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

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FFD600]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-black/[0.08] bg-white p-4"><div className="text-sm text-[#6B6B6B]">Total Orders Today</div><div className="font-syne text-2xl font-bold text-[#0D0D0D]">{stats.totalOrders}</div></div>
        <div className="rounded-lg border border-black/[0.08] bg-white p-4"><div className="text-sm text-[#6B6B6B]">Revenue Today</div><div className="font-syne text-2xl font-bold text-[#16A34A]">₹{stats.totalRevenue.toLocaleString()}</div></div>
        <div className="rounded-lg border border-black/[0.08] bg-white p-4"><div className="text-sm text-[#6B6B6B]">Cancelled</div><div className="font-syne text-2xl font-bold text-[#0D0D0D]">{stats.cancelled} <span className="text-sm text-[#6B6B6B]">({stats.cancellationRate}%)</span></div></div>
        <div className="rounded-lg border border-black/[0.08] bg-white p-4"><div className="text-sm text-[#6B6B6B]">Avg Completion</div><div className="font-syne text-2xl font-bold text-[#FFD600]">{stats.avgCompletionMins}m</div></div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/[0.08] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search order, student, canteen..."
            className="w-full rounded-lg border border-black/10 bg-[#F7F5F0] py-2 pl-9 pr-3 text-sm text-[#0D0D0D] outline-none focus:border-[#FFD600]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-black/10 bg-[#F7F5F0] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#0D0D0D] outline-none">
            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{prettyStatus(status)}</option>)}
          </select>
          <select value={shopFilter} onChange={(event) => setShopFilter(event.target.value)} className="rounded-lg border border-black/10 bg-[#F7F5F0] px-3 py-2 text-xs font-bold text-[#0D0D0D] outline-none">
            <option value="all">All Canteens</option>
            {uniqueShops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </select>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-[#F7F5F0] px-3 py-2 text-xs font-bold text-[#0D0D0D] hover:bg-[#F7F5F0]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">
            <tr className="border-b border-black/[0.08] bg-[#F7F5F0] hover:bg-[#FAFAF8] transition-colors duration-150">
              <th className="p-4 text-xs uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Order</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Student</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Canteen</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Total</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Status</th>
              <th className="p-4 text-right text-xs uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-black/[0.03]">
                <td className="p-4">
                  <div className="font-syne text-sm font-bold text-[#0D0D0D]">{String(order.id).slice(0, 8)}</div>
                  <div className="text-[10px] text-[#6B6B6B]">{new Date(order.created_at).toLocaleString()}</div>
                </td>
                <td className="p-4 text-sm text-[#0D0D0D]">{order.student?.name || 'Student'}</td>
                <td className="p-4 text-sm text-[#6B6B6B]">{order.shop?.name || 'Unknown'}</td>
                <td className="p-4 text-sm font-bold text-[#0D0D0D]">₹{Number(order.total_amount || 0).toLocaleString()}</td>
                <td className="p-4">
                  <span className="rounded bg-[#F7F5F0] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0D0D0D]">{prettyStatus(order.status)}</span>
                </td>
                <td className="p-4 text-right">
                  <select
                    value={order.status || ''}
                    onChange={(event) => updateStatus(order.id, event.target.value)}
                    className="rounded-md border border-black/10 bg-[#F7F5F0] px-2 py-1 text-xs text-[#0D0D0D] outline-none"
                  >
                    {ORDER_STATUSES.filter((s) => s !== 'all').map((status) => (
                      <option key={status} value={status}>{prettyStatus(status)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-[#6B6B6B]">No canteen orders found for current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
