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

  const unpaid = payments.filter(p => !p.is_paid && p.payment_status !== 'prepaid');
  const paid = payments.filter(p => p.is_paid || p.payment_status === 'prepaid');

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
    <div className="mx-auto max-w-4xl space-y-8 pb-28 font-sans">
      {/* Modern Payments Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        <div>
          <h1 className="font-syne text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Faculty Payments
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Review and settle pending canteen and print shop account dues.
          </p>
        </div>
        {totalUnpaid > 0 && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-5 py-3.5 text-right sm:min-w-[170px]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              Total Due Amount
            </p>
            <p className="font-syne text-2xl font-extrabold text-rose-600">
              ₹{totalUnpaid.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Sleek Integrated Segmented Toggle Tabs & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Integrated Segmented Control */}
        <div className="inline-flex rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1.5 shadow-2xs">
          {(['unpaid', 'history'] as const).map((tab) => {
            const isActive = viewTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setViewTab(tab);
                  setSelected(new Set());
                }}
                className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs font-syne'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'unpaid' ? `Unpaid (${unpaid.length})` : `History (${paid.length})`}
              </button>
            );
          })}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'canteen', 'print'] as const).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? 'All Shops' : f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Select All Row (Unpaid Only) */}
      {viewTab === 'unpaid' && filtered.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-2xs">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
              onChange={toggleSelectAll}
              className="h-4.5 w-4.5 rounded border-slate-300 accent-blue-600"
            />
            <span className="text-xs font-semibold text-slate-700">Select All Unpaid Dues</span>
          </label>
          {selected.size > 0 && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              {selected.size} selected — ₹{selectedTotal.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Payment List & Beautiful Caught-Up Empty State */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <ListSkeleton key={`prof-payments-skeleton-${index}`} rows={1} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        viewTab === 'unpaid' ? (
          /* Beautifully Polished Caught-Up Empty State Layout */
          <div className="rounded-3xl border border-slate-100 bg-white p-12 sm:p-16 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-2xs">
              <Check className="h-8 w-8 stroke-[2.2]" />
            </div>
            <h3 className="font-syne text-xl font-extrabold text-slate-900">All Caught Up! 🎉</h3>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-slate-500">
              You have no unpaid faculty dues. All Canteen refreshments and Print Shop document jobs have been fully cleared.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="font-syne text-base font-bold text-slate-900">No payment history yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Your settled orders and receipts will appear here automatically.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3.5">
          {filtered.map((payment) => {
            const isSelected = selected.has(payment.id);
            const isPaidOrPrepaid = payment.is_paid || payment.payment_status === 'prepaid';
            return (
              <div
                key={payment.id}
                className={`rounded-2xl border bg-white p-5 transition-all ${
                  isSelected
                    ? 'border-blue-400 bg-blue-50/20 shadow-[0_4px_16px_rgba(37,99,235,0.08)]'
                    : 'border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_18px_rgba(0,0,0,0.06)]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {viewTab === 'unpaid' && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(payment.id)}
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 accent-blue-600 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {payment.order_type === 'canteen' ? (
                            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Printer className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <span className="font-syne font-bold text-sm text-slate-900 truncate">
                          {payment.shop_name || 'Campus Shop'}
                        </span>
                      </div>
                      {isPaidOrPrepaid ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                          <Check className="h-3 w-3" />{' '}
                          {payment.payment_status === 'prepaid' && !payment.is_paid ? 'Prepaid' : 'Paid'}
                        </span>
                      ) : payment.payment_status === 'deferred' ? (
                        <span className="rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                          Deferred
                        </span>
                      ) : (
                        <span className="rounded-full border border-rose-200/60 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
                          Unpaid
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                      {Array.isArray(payment.items)
                        ? payment.items.map((i: any) => i.name || i.item_name || i.file_name || 'Item').join(', ')
                        : 'Order charges'}
                    </p>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {payment.is_paid && payment.paid_at
                          ? `Paid ${formatDate(payment.paid_at)}`
                          : formatDate(payment.created_at)}
                      </span>
                      <span className="font-syne font-extrabold text-sm text-slate-900">
                        ₹{Number(payment.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Buttons for Unpaid Dues */}
      {viewTab === 'unpaid' && unpaid.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[240px] z-30 border-t border-slate-100 bg-white/95 p-4 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
          <div className="mx-auto max-w-4xl flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePay(Array.from(selected))}
              disabled={paying || selected.size === 0}
              className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {paying ? 'Processing...' : `Pay Selected (₹${selectedTotal.toLocaleString()})`}
            </button>
            <button
              type="button"
              onClick={() => handlePay(unpaid.map((p) => p.id))}
              disabled={paying}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50"
            >
              Pay All (₹{totalUnpaid.toLocaleString()})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

