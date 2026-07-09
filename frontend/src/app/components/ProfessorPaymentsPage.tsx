import React, { useEffect, useState } from 'react';
import { CreditCard, UtensilsCrossed, Printer, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getPendingPayments, markPaymentsAsPaid } from '../../api/professor';
import { ListSkeleton } from './ui/Skeletons';

type FilterTab = 'all' | 'canteen' | 'print';
type ViewTab = 'unpaid' | 'history';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export const ProfessorPaymentsPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterTab>('all');
  const [viewTab, setViewTab] = useState<ViewTab>('unpaid');
  const [paying, setPaying] = useState(false);

  const loadPayments = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await getPendingPayments(profile.id);
    setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPayments(); }, [profile?.id]);

  const unpaid = payments.filter(p => !p.is_paid);
  const paid = payments.filter(p => p.is_paid);

  const filtered = (viewTab === 'unpaid' ? unpaid : paid).filter(p => {
    if (filter === 'all') return true;
    return p.order_type === filter;
  });

  const selectedTotal = unpaid
    .filter(p => selected.has(p.id))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalUnpaid = unpaid.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filteredUnpaid = filtered.filter(p => !p.is_paid);
    if (filteredUnpaid.every(p => selected.has(p.id))) {
      setSelected(prev => {
        const next = new Set(prev);
        filteredUnpaid.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filteredUnpaid.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handlePay = async (ids: string[]) => {
    if (ids.length === 0) return;
    setPaying(true);
    const { error } = await markPaymentsAsPaid(ids);
    if (error) {
      toast.error('Failed to process payment.');
    } else {
      toast.success(`${ids.length} payment(s) marked as paid! ✅`);
      setSelected(new Set());
      await loadPayments();
    }
    setPaying(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-syne font-extrabold text-2xl text-[var(--text-primary)]">Payments</h1>
        {totalUnpaid > 0 && (
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">Total Due</p>
            <p className="font-syne font-extrabold text-2xl text-[#DC2626]">₹{totalUnpaid.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-1">
        {(['unpaid', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setViewTab(tab); setSelected(new Set()); }}
            className={`flex-1 h-9 rounded-md text-sm font-bold transition-colors ${
              viewTab === tab ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {tab === 'unpaid' ? `Unpaid (${unpaid.length})` : `History (${paid.length})`}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'canteen', 'print'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 px-4 rounded-md text-xs font-bold transition-colors capitalize ${
              filter === f ? 'bg-[#FEF9C3] text-[var(--yellow-dark)] border border-[#F59E0B]/30' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Select All (unpaid only) */}
      {viewTab === 'unpaid' && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every(p => selected.has(p.id))}
              onChange={toggleSelectAll}
              className="accent-[var(--yellow-dark)] w-4 h-4"
            />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Select All</span>
          </label>
          {selected.size > 0 && (
            <span className="text-xs text-[var(--yellow-dark)] font-bold">{selected.size} selected — ₹{selectedTotal}</span>
          )}
        </div>
      )}

      {/* Payment Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListSkeleton key={`prof-payments-skeleton-${index}`} rows={1} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-8 text-center">
          <CreditCard className="w-10 h-10 text-[var(--border)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">
            {viewTab === 'unpaid' ? 'No unpaid payments. You\'re all caught up! 🎉' : 'No payment history yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(payment => (
            <div key={payment.id} className={`bg-[var(--bg)] border rounded-lg p-4 transition-colors ${
              selected.has(payment.id) ? 'border-[var(--yellow-dark)] bg-[#FEF9C3]/10' : 'border-[var(--border)]'
            }`}>
              <div className="flex items-start gap-3">
                {viewTab === 'unpaid' && (
                  <input
                    type="checkbox"
                    checked={selected.has(payment.id)}
                    onChange={() => toggleSelect(payment.id)}
                    className="accent-[var(--yellow-dark)] w-4 h-4 mt-1"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {payment.order_type === 'canteen' ? (
                        <UtensilsCrossed className="w-4 h-4 text-[var(--yellow-dark)]" />
                      ) : (
                        <Printer className="w-4 h-4 text-[var(--accent)]" />
                      )}
                      <span className="font-bold text-sm text-[var(--text-primary)]">{payment.shop_name || 'Shop'}</span>
                    </div>
                    {payment.is_paid ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[var(--success-light)] text-[var(--success-dark)] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#FEE2E2] text-[var(--error-dark)]">Unpaid</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">
                    {Array.isArray(payment.items)
                      ? payment.items.map((i: any) => i.name || i.item_name || i.file_name || 'Item').join(', ')
                      : 'Order items'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {payment.is_paid && payment.paid_at ? `Paid ${formatDate(payment.paid_at)}` : formatDate(payment.created_at)}
                    </span>
                    <span className="font-bold text-sm text-[var(--text-primary)]">₹{Number(payment.amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {viewTab === 'unpaid' && unpaid.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 md:left-[240px] right-0 bg-[var(--bg)] border-t border-[var(--border)] p-4 z-30 safe-area-bottom">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button
              onClick={() => handlePay(Array.from(selected))}
              disabled={paying || selected.size === 0}
              className="flex-1 h-11 rounded-md bg-[var(--text-primary)] text-white text-sm font-bold hover:bg-[var(--yellow-dark)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              {paying ? 'Processing...' : `Pay Selected (₹${selectedTotal.toLocaleString()})`}
            </button>
            <button
              onClick={() => handlePay(unpaid.map(p => p.id))}
              disabled={paying}
              className="h-11 px-6 rounded-md border border-[#DC2626] text-[#DC2626] text-sm font-bold hover:bg-[#DC2626] hover:text-white transition-colors disabled:opacity-50"
            >
              Pay All (₹{totalUnpaid.toLocaleString()})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
