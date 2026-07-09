import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Loader2, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllPrintOrders } from '../../api/admin';
import { updatePrintOrderStatus } from '../../api/print';
import { useLocation } from 'react-router';

const getErrorMessage = (error: any, fallback: string) => error?.message || fallback;

const PRINT_STATUSES = ['all', 'pending', 'printing', 'ready', 'collected', 'cancelled'];

const prettyStatus = (status?: string) => {
  if (!status) return 'Unknown';
  return status.replace('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
};

export const AdminPrintOrdersPage: React.FC = () => {
  const location = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('printing');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await getAllPrintOrders();
    if (error) {
      toast.error(getErrorMessage(error, 'Failed to load print orders'));
      setOrders([]);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const nextShop = new URLSearchParams(location.search).get('shop');
    if (nextShop) {
      setShopFilter(nextShop);
    }
  }, [location.search]);

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
        (order.student?.email || '').toLowerCase().includes(q) ||
        (order.file_name || '').toLowerCase().includes(q) ||
        (order.shop?.name || '').toLowerCase().includes(q);
      return matchesStatus && matchesShop && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter, shopFilter]);

  const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every((order) => selectedOrderIds.includes(order.id));

  const selectedCount = selectedOrderIds.length;

  const selectedShopName = useMemo(() => {
    if (shopFilter === 'all') return null;
    return uniqueShops.find((shop) => shop.id === shopFilter)?.name || 'Selected Shop';
  }, [shopFilter, uniqueShops]);

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }, []);

  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => new Date(o.created_at).getTime() >= today);
    const totalRevenue = todayOrders.reduce((acc, order) => acc + Number(order.total_price || 0), 0);
    const totalPages = todayOrders.reduce((acc, order) => acc + Number(order.pages || 0), 0);
    const avgPages = todayOrders.length ? Math.round(totalPages / todayOrders.length) : 0;
    const cancelled = todayOrders.filter((o) => o.status === 'cancelled').length;
    const cancelledRate = todayOrders.length ? ((cancelled / todayOrders.length) * 100).toFixed(1) : '0.0';

    return {
      jobsToday: todayOrders.length,
      totalRevenue,
      avgPages,
      cancelledRate,
    };
  }, [orders, today]);

  const updateStatus = async (orderId: string, nextStatus: string) => {
    const { error } = await updatePrintOrderStatus(orderId, nextStatus);
    if (error) {
      toast.error(getErrorMessage(error, 'Failed to update print order'));
      return;
    }
    toast.success(`Order marked ${prettyStatus(nextStatus)}`);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus, updated_at: new Date().toISOString() } : order
      )
    );
    setSelectedOrderIds((prev) => prev.filter((id) => id !== orderId));
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]);
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredOrders.some((order) => order.id === id)));
      return;
    }

    setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...filteredOrders.map((order) => order.id)])));
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Select at least one order first.');
      return;
    }

    setIsBulkUpdating(true);
    const loadingToast = toast.loading(`Updating ${selectedOrderIds.length} print orders...`);

    const results = await Promise.all(selectedOrderIds.map(async (orderId) => {
      const { error } = await updatePrintOrderStatus(orderId, bulkStatus);
      return { orderId, error };
    }));

    const failed = results.filter((result) => result.error);

    if (failed.length > 0) {
      toast.error(`${failed.length} orders failed to update.`, { id: loadingToast });
    } else {
      toast.success(`${selectedOrderIds.length} orders marked ${prettyStatus(bulkStatus)}.`, { id: loadingToast });
    }

    const successfulIds = results.filter((result) => !result.error).map((result) => result.orderId);
    if (successfulIds.length > 0) {
      setOrders((prev) => prev.map((order) => successfulIds.includes(order.id)
        ? { ...order, status: bulkStatus, updated_at: new Date().toISOString() }
        : order));
    }

    setSelectedOrderIds((prev) => prev.filter((id) => !successfulIds.includes(id)));
    setIsBulkUpdating(false);
  };

  const exportCsv = () => {
    const rows = filteredOrders.map((order) => ({
      order_id: order.id,
      student: order.student?.name || 'Student',
      shop: order.shop?.name || 'Unknown',
      file_name: order.file_name || '',
      pages: order.pages || 0,
      total_price: order.total_price || 0,
      status: order.status,
      created_at: order.created_at,
    }));

    const header = Object.keys(rows[0] || { order_id: '', student: '', shop: '', file_name: '', pages: '', total_price: '', status: '', created_at: '' });
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
    link.download = 'print-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--yellow)]" /></div>;
  }

  const statusTone = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[#FEF9C3] text-[var(--yellow-dark)]';
      case 'printing':
        return 'bg-[var(--info-light)] text-[var(--info)]';
      case 'ready':
        return 'bg-[var(--success-light)] text-[#16A34A]';
      case 'collected':
        return 'bg-[#EDE9FE] text-[#7C3AED]';
      case 'cancelled':
        return 'bg-[#FEE2E2] text-[#DC2626]';
      default:
        return 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4"><div className="text-sm text-[var(--text-secondary)]">Print Jobs Today</div><div className="font-syne text-2xl font-bold text-[var(--text-primary)]">{stats.jobsToday}</div></div>
        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4"><div className="text-sm text-[var(--text-secondary)]">Print Revenue</div><div className="font-syne text-2xl font-bold text-[#16A34A]">₹{stats.totalRevenue.toLocaleString()}</div></div>
        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4"><div className="text-sm text-[var(--text-secondary)]">Avg Pages/Order</div><div className="font-syne text-2xl font-bold text-[var(--text-primary)]">{stats.avgPages}</div></div>
        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4"><div className="text-sm text-[var(--text-secondary)]">Cancelled Rate</div><div className="font-syne text-2xl font-bold text-[var(--text-primary)]">{stats.cancelledRate}%</div></div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search order, student, file..."
            className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedShopName ? (
            <div className="rounded-lg bg-[var(--yellow)]/10 px-3 py-2 text-xs font-bold text-[var(--text-primary)]">
              Viewing: {selectedShopName}
            </div>
          ) : null}
          {selectedCount > 0 ? (
            <div className="rounded-lg bg-[var(--text-primary)] px-3 py-2 text-xs font-bold text-white">
              {selectedCount} selected
            </div>
          ) : null}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)] outline-none">
            {PRINT_STATUSES.map((status) => <option key={status} value={status}>{prettyStatus(status)}</option>)}
          </select>
          <select value={shopFilter} onChange={(event) => setShopFilter(event.target.value)} className="rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none">
            <option value="all">All Shops</option>
            {uniqueShops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </select>
          <button onClick={loadOrders} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[#ECE8DD]">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none">
            {PRINT_STATUSES.filter((status) => status !== 'all').map((status) => <option key={status} value={status}>{prettyStatus(status)}</option>)}
          </select>
          <button onClick={handleBulkStatusUpdate} disabled={selectedCount === 0 || isBulkUpdating} className="inline-flex items-center gap-2 rounded-lg bg-[var(--yellow)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-yellow-400 disabled:opacity-60">
            {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Apply To Selected
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-[var(--bg)]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[var(--bg-secondary)] h-[40px] border-b border-[var(--border)]">
            <tr className="border-b border-black/[0.08] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors duration-150">
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]"><input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} className="h-4 w-4 accent-[var(--yellow)]" /></th>
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Order</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Student</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Shop</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">File</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Specs</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Cost</th>
              <th className="p-4 text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Status</th>
              <th className="p-4 text-right text-xs uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-black/[0.03]">
                <td className="p-4 align-top"><input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => toggleOrderSelection(order.id)} className="h-4 w-4 accent-[var(--yellow)]" /></td>
                <td className="p-4">
                  <div className="font-syne text-sm font-bold text-[var(--text-primary)]">{String(order.id).slice(0, 8)}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{new Date(order.created_at).toLocaleString()}</div>
                </td>
                <td className="p-4 text-sm text-[var(--text-primary)]">{order.student?.name || 'Student'}</td>
                <td className="p-4 text-sm text-[var(--text-secondary)]">{order.shop?.name || 'Unknown'}</td>
                <td className="p-4 text-sm text-[var(--text-primary)]">
                  <div className="font-bold text-[var(--text-primary)]">{order.file_name || 'File'}</div>
                  {order.file_url ? (
                    <a href={order.file_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#16A34A] hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> Open file
                    </a>
                  ) : (
                    <div className="mt-1 text-xs font-bold text-[#B45309]">Upload pending / test mode</div>
                  )}
                </td>
                <td className="p-4 text-xs text-[var(--text-secondary)]">
                  <div>{order.pages || 0} pages • {order.copies || 1} copies</div>
                  <div>{order.is_color ? 'Color' : 'B/W'} • {order.is_double_sided ? 'Double-sided' : 'Single-sided'}</div>
                  <div>{order.has_binding ? 'Binding added' : 'No binding'}</div>
                </td>
                <td className="p-4 text-sm font-bold text-[#16A34A]">₹{Number(order.total_price || 0).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(order.status)}`}>{prettyStatus(order.status)}</span>
                </td>
                <td className="p-4 text-right">
                  <select
                    value={order.status || ''}
                    onChange={(event) => updateStatus(order.id, event.target.value)}
                    className="rounded-md border border-black/10 bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                  >
                    {PRINT_STATUSES.filter((s) => s !== 'all').map((status) => (
                      <option key={status} value={status}>{prettyStatus(status)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center text-sm text-[var(--text-secondary)]">No print orders found for current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
