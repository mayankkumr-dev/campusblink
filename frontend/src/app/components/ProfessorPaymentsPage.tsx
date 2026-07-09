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
    <div className="mx-auto max-w-4xl space-y-8 pb-28 font-sans transition-colors duration-200">
      {/* Modern Payments Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border-subtle dark:border-prof-border-subtle bg-surface dark:bg-prof-bg-surface p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none">
        <div>
          <h1 className="font-syne text-2xl font-extrabold tracking-tight text-text-primary dark:text-prof-text-primary sm:text-3xl">
            Faculty Payments
          </h1>
          <p className="mt-1 text-xs text-text-secondary dark:text-prof-text-secondary">
            Review and settle pending canteen and print shop account dues.
          </p>
        </div>
        {totalUnpaid > 0 && (
          <div className="rounded-2xl border border-rose-100 dark:border-prof-accent-red/30 bg-rose-50/60 dark:bg-prof-accent-red/10 px-5 py-3.5 text-right sm:min-w-[170px]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-red dark:text-prof-accent-red">
              Total Due Amount
            </p>
            <p className="font-syne text-2xl font-extrabold text-accent-red dark:text-prof-accent-red">
              ₹{totalUnpaid.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Sleek Integrated Segmented Toggle Tabs & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Integrated Segmented Control */}
        <div className="inline-flex rounded-2xl border border-border-subtle dark:border-prof-border-subtle bg-surface-elevated/70 dark:bg-prof-bg-surface-raised/70 p-1.5 shadow-2xs dark:shadow-none">
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
                    ? 'bg-surface dark:bg-prof-bg-surface text-text-primary dark:text-prof-text-primary shadow-xs dark:shadow-none font-syne'
                    : 'text-text-secondary dark:text-prof-text-secondary hover:text-slate-800 dark:hover:text-prof-text-primary'
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
                    ? 'bg-blue-600 dark:bg-prof-accent-blue text-white shadow-xs dark:shadow-none'
                    : 'border border-border-subtle dark:border-prof-border-subtle bg-surface dark:bg-prof-bg-surface text-text-secondary dark:text-prof-text-secondary hover:bg-surface-elevated dark:hover:bg-prof-bg-surface-raised'
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
        <div className="flex items-center justify-between rounded-2xl border border-border-subtle dark:border-prof-border-subtle bg-surface dark:bg-prof-bg-surface px-5 py-3.5 shadow-2xs dark:shadow-none">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
              onChange={toggleSelectAll}
              className="h-4.5 w-4.5 rounded border-slate-300 dark:border-prof-border-strong accent-blue-600 dark:accent-prof-accent-blue"
            />
            <span className="text-xs font-semibold text-text-primary dark:text-prof-text-primary">Select All Unpaid Dues</span>
          </label>
          {selected.size > 0 && (
            <span className="rounded-full bg-accent-blue-soft dark:bg-prof-accent-blue-soft-bg px-3 py-1 text-xs font-bold text-accent-blue dark:text-prof-accent-blue">
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
          <div className="rounded-3xl border border-border-subtle dark:border-prof-border-subtle bg-surface dark:bg-prof-bg-surface p-12 sm:p-16 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-green/15 dark:bg-prof-accent-green-soft-bg border border-emerald-100 dark:border-prof-accent-green/30 text-accent-green dark:text-prof-accent-green shadow-2xs dark:shadow-none">
              <Check className="h-8 w-8 stroke-[2.2]" />
            </div>
            <h3 className="font-syne text-xl font-extrabold text-text-primary dark:text-prof-text-primary">All Caught Up! 🎉</h3>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-prof-text-secondary">
              You have no unpaid faculty dues. All Canteen refreshments and Print Shop document jobs have been fully cleared.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-border-subtle dark:border-prof-border-subtle bg-surface dark:bg-prof-bg-surface p-12 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)] dark:shadow-none">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface dark:bg-prof-bg-surface-raised border border-border-subtle dark:border-prof-border-strong text-text-secondary/70 dark:text-prof-text-tertiary">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="font-syne text-base font-bold text-text-primary dark:text-prof-text-primary">No payment history yet</h3>
            <p className="mt-1 text-xs text-text-secondary dark:text-prof-text-secondary">
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
                className={`rounded-2xl border bg-surface dark:bg-prof-bg-surface p-5 transition-all ${
                  isSelected
                    ? 'border-blue-400 dark:border-prof-accent-blue bg-blue-50/20 dark:bg-prof-accent-blue/10 shadow-[0_4px_16px_rgba(37,99,235,0.08)] dark:shadow-none'
                    : 'border-border-subtle dark:border-prof-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-[0_4px_18px_rgba(0,0,0,0.06)] dark:hover:shadow-none'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {viewTab === 'unpaid' && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(payment.id)}
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 dark:border-prof-border-strong accent-blue-600 dark:accent-prof-accent-blue shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-surface dark:bg-prof-bg-surface border border-border-subtle dark:border-prof-border-subtle flex items-center justify-center shrink-0">
                          {payment.order_type === 'canteen' ? (
                            <UtensilsCrossed className="h-4 w-4 text-accent-amber dark:text-prof-accent-orange" />
                          ) : (
                            <Printer className="h-4 w-4 text-accent-blue dark:text-prof-accent-blue" />
                          )}
                        </div>
                        <span className="font-syne font-bold text-sm text-text-primary dark:text-prof-text-primary truncate">
                          {payment.shop_name || 'Campus Shop'}
                        </span>
                      </div>
                      {isPaidOrPrepaid ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-green/20 dark:border-prof-accent-green/30 bg-accent-green/15 dark:bg-prof-accent-green/10 px-3 py-1 text-[11px] font-bold text-accent-green dark:text-prof-accent-green">
                          <Check className="h-3 w-3" />{' '}
                          {payment.payment_status === 'prepaid' && !payment.is_paid ? 'Prepaid' : 'Paid'}
                        </span>
                      ) : payment.payment_status === 'deferred' ? (
                        <span className="rounded-full border border-accent-amber-soft/20 dark:border-prof-accent-orange/30 bg-accent-amber-soft dark:bg-prof-accent-orange/10 px-3 py-1 text-[11px] font-bold text-accent-amber dark:text-prof-accent-orange">
                          Deferred
                        </span>
                      ) : (
                        <span className="rounded-full border border-accent-red/20 dark:border-prof-accent-red/30 bg-accent-red/15 dark:bg-prof-accent-red/10 px-3 py-1 text-[11px] font-bold text-accent-red dark:text-prof-accent-red">
                          Unpaid
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-text-secondary dark:text-prof-text-secondary line-clamp-2">
                      {Array.isArray(payment.items)
                        ? payment.items.map((i: any) => i.name || i.item_name || i.file_name || 'Item').join(', ')
                        : 'Order charges'}
                    </p>

                    <div className="mt-3.5 pt-3 border-t border-border-subtle dark:border-prof-border-subtle flex items-center justify-between">
                      <span className="text-xs text-text-secondary/70 dark:text-prof-text-tertiary">
                        {payment.is_paid && payment.paid_at
                          ? `Paid ${formatDate(payment.paid_at)}`
                          : formatDate(payment.created_at)}
                      </span>
                      <span className="font-syne font-extrabold text-sm text-text-primary dark:text-prof-text-primary">
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
        <div className="fixed bottom-0 left-0 right-0 md:left-[240px] z-30 border-t border-border-subtle dark:border-prof-border-subtle bg-white/95 dark:bg-prof-bg-surface/95 p-4 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.05)] dark:shadow-none">
          <div className="mx-auto max-w-4xl flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePay(Array.from(selected))}
              disabled={paying || selected.size === 0}
              className="flex-1 rounded-2xl bg-blue-600 dark:bg-prof-accent-blue py-3.5 text-xs sm:text-sm font-bold text-white shadow-xs dark:shadow-none transition-colors hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              {paying ? 'Processing...' : `Pay Selected (₹${selectedTotal.toLocaleString()})`}
            </button>
            <button
              type="button"
              onClick={() => handlePay(unpaid.map((p) => p.id))}
              disabled={paying}
              className="rounded-2xl border border-rose-200 dark:border-prof-accent-red/30 bg-accent-red/15 dark:bg-prof-accent-red/10 px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-bold text-accent-red dark:text-prof-accent-red transition-colors hover:bg-rose-100 dark:hover:bg-prof-accent-red/20 disabled:opacity-50"
            >
              Pay All (₹{totalUnpaid.toLocaleString()})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

