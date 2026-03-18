import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, History, IndianRupee, Landmark, Loader2, Search, TrendingUp } from 'lucide-react';
import { getFinanceStats, getTransactions } from '../../api/admin';

type AdminFinancePageProps = {
  mode?: 'all' | 'credits' | 'revenue';
  title?: string;
};

export const AdminFinancePage: React.FC<AdminFinancePageProps> = ({ mode = 'all', title }) => {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [{ data: statsData }, { data: transactionData }] = await Promise.all([getFinanceStats(), getTransactions()]);
      setStats(statsData || null);
      setTransactions(transactionData || []);
      setIsLoading(false);
    };

    load();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const haystack = `${transaction.id || ''} ${transaction.user_profile?.name || ''} ${transaction.user_profile?.email || ''} ${transaction.reason || ''} ${transaction.action_type || ''}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [transactions, searchTerm]);

  const formatActionType = (actionType?: string) => {
    const value = String(actionType || '').toLowerCase();
    if (value.includes('earned') && value.includes('sold')) return 'Earned - Sold Item';
    if (value.includes('earned') && value.includes('post')) return 'Earned - Posted';
    if (value.includes('spent') && value.includes('canteen')) return 'Spent - Canteen';
    if (value.includes('admin')) return 'Admin Adjusted';
    if (value === 'earned_post') return 'Earned - Posted';
    if (value === 'admin_add' || value === 'admin_deduct') return 'Admin Adjusted';
    return String(actionType || 'transaction').replace(/_/g, ' ');
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FFD600]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {(title || mode !== 'all') && (
        <div className="rounded-lg border border-black/[0.08] bg-white p-4">
          <h2 className="font-syne text-xl font-bold text-[#0D0D0D]">{title || 'Financial Overview'}</h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-[#6B6B6B]">View: {mode}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-black/[0.08] bg-white p-6">
          <div className="mb-3 flex items-center gap-3"><IndianRupee className="h-4 w-4 text-[#FFD600]" /><span className="text-sm font-bold uppercase tracking-wider text-[#6B6B6B]">Total Revenue</span></div>
          <div className="font-syne text-3xl font-bold text-[#0D0D0D]">₹{Number(stats?.totalRevenue || 0).toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#16A34A]"><ArrowUpRight className="h-3 w-3" /> Live aggregate from canteen shops</div>
        </div>
        <div className="rounded-lg border border-black/[0.08] bg-white p-6">
          <div className="mb-3 flex items-center gap-3"><TrendingUp className="h-4 w-4 text-[#16A34A]" /><span className="text-sm font-bold uppercase tracking-wider text-[#6B6B6B]">Reputation Issued</span></div>
          <div className="font-syne text-3xl font-bold text-[#0D0D0D]">{Number(stats?.creditsPurchased || 0).toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#16A34A]"><ArrowUpRight className="h-3 w-3" /> Reputation log sum</div>
        </div>
        <div className="rounded-lg border border-black/[0.08] bg-white p-6">
          <div className="mb-3 flex items-center gap-3"><Landmark className="h-4 w-4 text-[#0057FF]" /><span className="text-sm font-bold uppercase tracking-wider text-[#6B6B6B]">Pending Payouts</span></div>
          <div className="font-syne text-3xl font-bold text-[#0D0D0D]">₹{Number(stats?.pendingPayouts || 0).toLocaleString()}</div>
          <div className="mt-2 text-[10px] font-bold text-[#6B6B6B]">Awaiting payout logic</div>
        </div>
        <div className="rounded-lg border border-black/[0.08] bg-white p-6">
          <div className="mb-3 flex items-center gap-3"><History className="h-4 w-4 text-[#DC2626]" /><span className="text-sm font-bold uppercase tracking-wider text-[#6B6B6B]">Platform Fees</span></div>
          <div className="font-syne text-3xl font-bold text-[#0D0D0D]">₹{Number(stats?.platformFees || 0).toLocaleString()}</div>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#DC2626]"><ArrowDownRight className="h-3 w-3" /> Estimated at 2.5%</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-black/[0.08] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search transaction id, user, or reason..." className="w-full rounded-lg border border-black/10 bg-[#F7F5F0] py-2 pl-9 pr-4 text-sm text-[#0D0D0D] outline-none focus:border-[#FFD600]" />
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-[#F7F5F0] px-4 py-2 text-sm font-bold text-[#0D0D0D]"><Download className="h-4 w-4" /> Export Report</button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">
            <tr className="border-b border-black/[0.08] bg-[#F7F5F0] hover:bg-[#FAFAF8] transition-colors duration-150">
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Transaction</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">User</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Type</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Reputation Change</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {filteredTransactions.length > 0 ? filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-black/[0.03]">
                <td className="p-4 font-mono text-sm text-[#FFD600]">{transaction.id}</td>
                <td className="p-4 text-sm text-[#0D0D0D]">{transaction.user_profile?.name || transaction.user_id || 'Unknown user'}</td>
                <td className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">{formatActionType(transaction.action_type)}</td>
                <td className="p-4 text-sm font-bold text-[#0D0D0D]">{Number(transaction.credits_change || 0) > 0 ? '+' : ''}{transaction.credits_change || 0} ⭐</td>
                <td className="p-4 text-xs text-[#6B6B6B]">{new Date(transaction.created_at).toLocaleString()}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="p-8 text-center text-sm text-[#6B6B6B]">No transactions matched the current filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
