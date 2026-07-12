import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Download, IndianRupee, Landmark,
  Loader2, Search, TrendingUp, Zap, BarChart3, RefreshCw
} from 'lucide-react';
import { getFinanceStats, getTransactions } from '../../api/admin';
import toast from 'react-hot-toast';

type AdminFinancePageProps = {
  mode?: 'all' | 'credits' | 'revenue';
  title?: string;
};

const MODES = {
  all: { label: 'Full Overview', icon: BarChart3, accent: 'text-slate-600', bg: 'bg-slate-50' },
  revenue: { label: 'Revenue & Payouts', icon: IndianRupee, accent: 'text-teal-600', bg: 'bg-teal-50' },
  credits: { label: 'Reputation Credits', icon: Zap, accent: 'text-violet-600', bg: 'bg-violet-50' },
} as const;

export const AdminFinancePage: React.FC<AdminFinancePageProps> = ({ mode = 'all', title }) => {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const modeConfig = MODES[mode] || MODES['all'];
  const ModeIcon = modeConfig.icon;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [{ data: statsData }, { data: transactionData }] = await Promise.all([
        getFinanceStats(),
        getTransactions(),
      ]);
      setStats(statsData || null);
      setTransactions(transactionData || []);
      setIsLoading(false);
    };
    load();
  }, []);

  const filteredTransactions = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return transactions.filter((t) => {
      const haystack = `${t.id || ''} ${t.user_profile?.name || ''} ${t.user_profile?.email || ''} ${t.reason || ''} ${t.action_type || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, searchTerm]);

  // Filter by mode
  const modeFilteredTransactions = useMemo(() => {
    if (mode === 'revenue') {
      return filteredTransactions.filter(t => (t.action_type || '').toLowerCase().includes('spent'));
    }
    if (mode === 'credits') {
      return filteredTransactions.filter(t => (t.action_type || '').toLowerCase().includes('earned'));
    }
    return filteredTransactions;
  }, [filteredTransactions, mode]);

  const formatActionType = (actionType?: string) => {
    const v = String(actionType || '').toLowerCase();
    if (v.includes('earned') && v.includes('sold')) return 'Earned – Sold Item';
    if (v.includes('earned') && v.includes('post')) return 'Earned – Posted';
    if (v.includes('spent') && v.includes('canteen')) return 'Spent – Canteen';
    if (v.includes('admin')) return 'Admin Adjusted';
    if (v === 'earned_post') return 'Earned – Posted';
    if (v === 'admin_add' || v === 'admin_deduct') return 'Admin Adjusted';
    return String(actionType || 'Transaction').replace(/_/g, ' ');
  };

  const handleExportCSV = () => {
    if (modeFilteredTransactions.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['ID', 'User', 'Email', 'Type', 'Credits Change', 'Date'];
    const rows = modeFilteredTransactions.map(t => [
      t.id,
      t.user_profile?.name || t.user_id || 'Unknown',
      t.user_profile?.email || '',
      formatActionType(t.action_type),
      t.credits_change || 0,
      new Date(t.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-blink-finance-${mode}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: `₹${Number(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: IndianRupee,
      sub: 'Live aggregate from canteen shops',
      accent: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      trend: <><ArrowUpRight className="h-3 w-3" /> Live aggregate</>,
      trendColor: 'text-teal-600',
    },
    {
      label: 'Reputation Issued',
      value: Number(stats?.creditsPurchased || 0).toLocaleString(),
      icon: Zap,
      sub: 'Reputation log sum',
      accent: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      trend: <><ArrowUpRight className="h-3 w-3" /> Credits earned on platform</>,
      trendColor: 'text-violet-600',
    },
    {
      label: 'Pending Payouts',
      value: `₹${Number(stats?.pendingPayouts || 0).toLocaleString()}`,
      icon: Landmark,
      sub: 'Awaiting settlement',
      accent: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      trend: 'Payout logic pending',
      trendColor: 'text-slate-400',
    },
    {
      label: 'Platform Fees',
      value: `₹${Number(stats?.platformFees || 0).toLocaleString()}`,
      icon: TrendingUp,
      sub: 'Estimated at 2.5%',
      accent: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      trend: <><ArrowDownRight className="h-3 w-3" /> 2.5% service fee</>,
      trendColor: 'text-rose-600',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${modeConfig.bg}`}>
            <ModeIcon className={`h-4.5 w-4.5 ${modeConfig.accent}`} />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">
              {title || modeConfig.label}
            </h2>
            <p className="text-xs text-slate-400">Campus Blink financial data · All in INR</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3">
                <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border ${card.bg} ${card.border} mb-2 sm:mb-0`}>
                  <Icon className={`h-4 w-4 ${card.accent}`} />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</span>
              </div>
              <p className="font-syne text-lg sm:text-2xl font-extrabold text-slate-900">{card.value}</p>
              <div className={`mt-1.5 flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold ${card.trendColor}`}>
                {card.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by transaction ID, user name, or email…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none transition-all"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400 shrink-0">
          {modeFilteredTransactions.length.toLocaleString()} transactions
        </span>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {/* Mobile Viewport */}
        <div className="md:hidden space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary mb-2 px-1 transition-colors">
            {mode === 'credits' ? 'Reputation Credit History' : mode === 'revenue' ? 'Revenue Transactions' : 'All Transactions'}
          </h3>
          
          {modeFilteredTransactions.length > 0 ? (
            modeFilteredTransactions.map(t => {
              const change = Number(t.credits_change || 0);
              return (
                <div key={t.id} className="rounded-2xl border border-slate-100 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none flex items-center justify-between transition-colors">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-sans text-sm font-bold text-slate-900 dark:text-admin-text-primary truncate mb-0.5 transition-colors">
                      {t.user_profile?.name || t.user_id || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[10px] text-amber-600 dark:text-admin-accent truncate transition-colors">{t.id}</p>
                      <span className="rounded border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:text-admin-text-secondary truncate transition-colors">
                        {formatActionType(t.action_type)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="shrink-0 text-right">
                    <span className={`font-syne text-xl font-extrabold block ${change > 0 ? 'text-emerald-600 dark:text-emerald-400' : change < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-admin-text-secondary'}`}>
                      {change > 0 ? '+' : ''}{change} ⭐
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-admin-text-tertiary mt-0.5 uppercase tracking-wider block transition-colors">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-10 text-center flex flex-col items-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none mt-4 transition-colors">
              <BarChart3 className="h-8 w-8 text-slate-300 dark:text-admin-text-tertiary mb-3 transition-colors" />
              <p className="text-sm font-bold text-slate-900 dark:text-admin-text-primary transition-colors">No transactions found</p>
            </div>
          )}
        </div>

        {/* Desktop Viewport */}
        <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {mode === 'credits' ? 'Reputation Credit History' : mode === 'revenue' ? 'Revenue Transactions' : 'All Transactions'}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Transaction ID', 'User', 'Type', 'Credit Change', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modeFilteredTransactions.length > 0 ? (
                  modeFilteredTransactions.map(t => {
                    const change = Number(t.credits_change || 0);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[12px] text-amber-600">{t.id}</td>
                        <td className="px-5 py-3.5 text-slate-800 font-medium">
                          {t.user_profile?.name || t.user_id || 'Unknown'}
                          {t.user_profile?.email && (
                            <p className="text-[11px] text-slate-400 font-normal">{t.user_profile.email}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            {formatActionType(t.action_type)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`font-bold ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            {change > 0 ? '+' : ''}{change} ⭐
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-400">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400">
                      <BarChart3 className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                      No transactions match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
