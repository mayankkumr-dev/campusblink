import React, { useEffect, useState } from "react";
import {
  AlertCircle, ShoppingBag, ShoppingCart, Star, TrendingUp, Users,
  ArrowUpRight, Clock, MessageSquare, Building2, Activity, Zap,
  ChevronRight, BarChart3
} from 'lucide-react';
import { Link } from 'react-router';
import { getDashboardStats } from '../../api/admin';
import { getContactStats } from '../../api/contact';

/* ── Skeleton loader ─────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-6 animate-pulse transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div className="h-3 bg-slate-100 dark:bg-admin-bg-surface-raised rounded-full w-24 transition-colors" />
      <div className="h-5 bg-slate-100 dark:bg-admin-bg-surface-raised rounded-full w-16 transition-colors" />
    </div>
    <div className="h-8 bg-slate-100 dark:bg-admin-bg-surface-raised rounded-lg w-20 mt-4 transition-colors" />
  </div>
);

/* ── Stat card ───────────────────────────────────────────── */
const StatCard = ({
  label, value, icon: Icon, badge, accent, trend
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  badge: string;
  accent: { icon: string; bg: string; badge: string; text: string; border: string };
  trend?: string;
}) => (
  <div className="group relative rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-6 shadow-[0_1px_4px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:shadow-none dark:hover:bg-admin-bg-surface-hover hover:-translate-y-0.5 transition-all duration-200">
    <div className="flex items-start justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accent.bg} ${accent.border}`}>
        <Icon className={`h-4.5 w-4.5 stroke-[2] ${accent.icon}`} />
      </div>
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${accent.badge} ${accent.text} ${accent.border}`}>
        {badge}
      </span>
    </div>
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-admin-text-tertiary transition-colors">{label}</p>
      <p className="mt-1 font-syne text-3xl font-extrabold tracking-tight text-slate-900 dark:text-admin-text-primary transition-colors">{value}</p>
      {trend && (
        <p className="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-admin-text-secondary transition-colors">{trend}</p>
      )}
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [contactStats, setContactStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const [{ data }, contactData] = await Promise.all([
          getDashboardStats(),
          getContactStats(),
        ]);
        if (mounted) {
          setStatsData(data || null);
          setContactStats(contactData || null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
        if (mounted) setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 300000); // re-poll every 5 min
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: statsData?.totalUsers?.toLocaleString() || 0,
      icon: Users,
      badge: 'Active',
      accent: {
        icon: 'text-emerald-600',
        bg: 'bg-emerald-50',
        badge: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
      },
      trend: 'All registered platform accounts',
    },
    {
      label: 'Active Orders',
      value: statsData?.activeOrders?.toLocaleString() || 0,
      icon: ShoppingBag,
      badge: 'Live',
      accent: {
        icon: 'text-amber-600',
        bg: 'bg-amber-50',
        badge: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      },
      trend: 'Canteen + print in progress',
    },
    {
      label: 'Marketplace Listings',
      value: statsData?.totalListings?.toLocaleString() || 0,
      icon: ShoppingCart,
      badge: 'Catalog',
      accent: {
        icon: 'text-blue-600',
        bg: 'bg-blue-50',
        badge: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      },
      trend: 'Active buy & sell listings',
    },
    {
      label: 'Reputation Circulating',
      value: (statsData?.creditsCirculating || 0).toLocaleString(),
      icon: Zap,
      badge: 'Credits',
      accent: {
        icon: 'text-violet-600',
        bg: 'bg-violet-50',
        badge: 'bg-violet-50',
        text: 'text-violet-700',
        border: 'border-violet-200',
      },
      trend: 'Total campus credit balance',
    },
    {
      label: 'Reports Pending',
      value: statsData?.pendingReports?.toLocaleString() || 0,
      icon: AlertCircle,
      badge: 'Attention',
      accent: {
        icon: 'text-rose-600',
        bg: 'bg-rose-50',
        badge: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      },
      trend: 'Community + marketplace reports',
    },
    {
      label: 'Total Revenue',
      value: `₹${Number(statsData?.totalRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      badge: 'Volume',
      accent: {
        icon: 'text-teal-600',
        bg: 'bg-teal-50',
        badge: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200',
      },
      trend: 'Aggregate from canteen shops',
    },
  ];

  const sharedStats = statsData?.sharedStats || {};
  const recentActivity = statsData?.recentActivity || [];
  const perCollegeStats = statsData?.perCollegeStats || [];
  const openIssues = contactStats?.open || 0;
  const inProgressIssues = contactStats?.inProgress || 0;
  const totalIssuesCount = contactStats?.total || 0;
  const recentIssues = contactStats?.recent || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface h-80 transition-colors" />
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface h-80 transition-colors" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-in fade-in duration-500">

      {/* ── Greeting row ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-syne font-extrabold text-2xl text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">
            Platform Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-admin-text-secondary mt-0.5 transition-colors">
            Real-time metrics across all campus networks · Auto-refreshes every 5 min
          </p>
        </div>
        <Link
          to="/admin/alerts"
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 dark:bg-admin-accent px-4 py-2 text-xs font-bold text-white dark:text-admin-bg-surface-elevated shadow-sm shadow-amber-200 dark:shadow-none hover:bg-amber-600 transition-colors shrink-0"
        >
          <Activity className="h-3.5 w-3.5" />
          Smart Alerts
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Stat Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Shared Platform quick-stats ──────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Community Posts', value: sharedStats.totalCommunityPosts || 0 },
          { label: 'Open Listings', value: sharedStats.totalMarketplaceListings || 0 },
          { label: 'Active Users', value: sharedStats.totalActiveUsers || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-5 py-4 flex items-center justify-between shadow-[0_1px_4px_rgba(15,23,42,0.04)] dark:shadow-none transition-colors">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">{label}</p>
            <p className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary transition-colors">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* ── 2-column widget row ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Recent Admin Activity */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-[0_1px_4px_rgba(15,23,42,0.04)] dark:shadow-none flex flex-col transition-colors">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-admin-bg-surface-raised transition-colors">
                <Activity className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary transition-colors" />
              </div>
              <h3 className="font-syne text-base font-bold text-slate-900 dark:text-admin-text-primary transition-colors">Recent Activity</h3>
            </div>
            <Link
              to="/admin/audit"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-admin-accent hover:text-amber-700 transition-colors"
            >
              View all <ChevronRight size={12} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[360px] p-4 space-y-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised px-4 py-3 hover:bg-white dark:hover:bg-admin-bg-surface-hover transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-admin-text-primary leading-snug transition-colors">
                      {entry.action || 'System Action'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-admin-text-tertiary truncate transition-colors">
                      {entry.target_name || 'System record'}
                    </p>
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-admin-text-tertiary transition-colors">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <BarChart3 className="h-8 w-8 text-slate-200 dark:text-admin-text-tertiary mx-auto mb-3 transition-colors" />
                <p className="text-sm font-semibold text-slate-400 dark:text-admin-text-secondary transition-colors">No recent admin activity logged.</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Issues + Support */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-[0_1px_4px_rgba(15,23,42,0.04)] dark:shadow-none transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-admin-accent-soft-bg transition-colors">
                  <MessageSquare className="h-4 w-4 text-amber-600 dark:text-admin-accent transition-colors" />
                </div>
                <h3 className="font-syne text-base font-bold text-slate-900 dark:text-admin-text-primary transition-colors">Contact Issues</h3>
              </div>
              <Link
                to="/admin/contact-issues"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 dark:bg-admin-accent px-3 py-1.5 text-xs font-bold text-white dark:text-admin-bg-surface-elevated shadow-sm shadow-amber-200 dark:shadow-none hover:bg-amber-600 transition-colors"
              >
                Open Inbox <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Issue stats strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-admin-border-subtle border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
              {[
                { label: 'Total', value: totalIssuesCount, colorClass: 'text-slate-900 dark:text-admin-text-primary' },
                { label: 'Open', value: openIssues, colorClass: 'text-amber-600 dark:text-amber-400' },
                { label: 'In Progress', value: inProgressIssues, colorClass: 'text-blue-600 dark:text-blue-400' },
              ].map(({ label, value, colorClass }) => (
                <div key={label} className="py-3.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-admin-text-tertiary transition-colors">{label}</p>
                  <p className={`mt-1 font-syne text-2xl font-extrabold transition-colors ${colorClass}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Recent tickets */}
            <div className="p-4 space-y-2">
              {recentIssues.length > 0 ? (
                recentIssues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised px-4 py-2.5 hover:bg-white dark:hover:bg-admin-bg-surface-hover transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-admin-text-primary transition-colors">
                        {issue.subject || 'No subject'}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-admin-text-tertiary transition-colors">
                        {issue.name || issue.email || 'Anonymous'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      issue.status === 'resolved'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : issue.status === 'in_progress'
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}>
                      {String(issue.status || 'open').replace('_', ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-xs font-semibold text-slate-400 dark:text-admin-text-tertiary transition-colors">
                  No contact tickets pending review.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Per College Snapshot ─────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-[0_1px_4px_rgba(15,23,42,0.04)] dark:shadow-none transition-colors">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-admin-bg-surface-raised transition-colors">
              <Building2 className="h-4 w-4 text-slate-500 dark:text-admin-text-secondary transition-colors" />
            </div>
            <div>
              <h3 className="font-syne text-base font-bold text-slate-900 dark:text-admin-text-primary transition-colors">Per-College Snapshot</h3>
              <p className="text-[11px] text-slate-400 dark:text-admin-text-tertiary transition-colors">Real-time activity across campus networks</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 dark:border-admin-border-subtle px-3 py-1 text-xs font-semibold text-slate-500 dark:text-admin-text-secondary bg-slate-50 dark:bg-admin-bg-surface-raised transition-colors">
            {perCollegeStats.length} campuses
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perCollegeStats.length > 0 ? (
            perCollegeStats.map((c: any) => (
              <div
                key={c.college}
                className="rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised p-4 hover:bg-white dark:hover:bg-admin-bg-surface-hover hover:shadow-sm dark:hover:shadow-none transition-all"
              >
                <h4 className="font-syne text-sm font-extrabold text-slate-900 dark:text-admin-text-primary mb-3 truncate transition-colors">{c.college}</h4>
                <div className="space-y-1.5 text-[12px]">
                  {[
                    { label: 'Active Students', value: c.activeStudentsCount },
                    { label: 'Canteen Orders Today', value: c.canteenOrdersToday },
                    { label: 'Print Orders Today', value: c.printOrdersToday },
                    { label: 'Marketplace Listings', value: c.activeListingsCount },
                    { label: 'Community Posts Today', value: c.postsTodayCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-admin-border-subtle last:border-0 transition-colors">
                      <span className="text-slate-500 dark:text-admin-text-secondary transition-colors">{label}</span>
                      <span className="font-bold text-slate-800 dark:text-admin-text-primary transition-colors">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-14 text-center">
              <Building2 className="h-10 w-10 text-slate-200 dark:text-admin-text-tertiary mx-auto mb-3 transition-colors" />
              <p className="text-sm font-semibold text-slate-400 dark:text-admin-text-secondary transition-colors">No campus snapshots available.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};