import React, { useEffect, useState } from "react";
import { AlertCircle, ShoppingBag, ShoppingCart, Star, TrendingUp, Users, ArrowUpRight, Clock, MessageSquare, Building2, Activity } from 'lucide-react';
import { Link } from 'react-router';
import { getDashboardStats } from '../../api/admin';
import { getContactStats } from '../../api/contact';
import { ListSkeleton } from './ui/Skeletons';

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

    // Live Dashboard Polling
    const interval = setInterval(fetchStats, 300000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const cards = [
    {
      label: 'Total Users',
      value: statsData?.totalUsers || 0,
      icon: Users,
      badge: '+Active',
      badgeClass: 'bg-accent-green/15 text-accent-green border-emerald-200',
      iconClass: 'text-accent-green bg-accent-green/15 border-emerald-100',
    },
    {
      label: 'Active Orders',
      value: statsData?.activeOrders || 0,
      icon: ShoppingBag,
      badge: 'Live',
      badgeClass: 'bg-accent-amber-soft text-accent-amber border-accent-amber-soft',
      iconClass: 'text-accent-amber bg-accent-amber-soft border-amber-100',
    },
    {
      label: 'Marketplace Listings',
      value: statsData?.totalListings || 0,
      icon: ShoppingCart,
      badge: 'Catalog',
      badgeClass: 'bg-accent-blue-soft text-blue-700 border-accent-blue-soft',
      iconClass: 'text-accent-blue bg-accent-blue-soft border-accent-blue-soft',
    },
    {
      label: 'Reputation Circulation',
      value: statsData?.creditsCirculating || 0,
      icon: Star,
      badge: 'Credits',
      badgeClass: 'bg-accent-amber-soft text-accent-amber border-accent-amber-soft',
      iconClass: 'text-accent-amber bg-accent-amber-soft border-amber-100',
    },
    {
      label: 'Reports Pending',
      value: statsData?.pendingReports || 0,
      icon: AlertCircle,
      badge: 'Attention',
      badgeClass: 'bg-accent-red/15 text-accent-red border-rose-200',
      iconClass: 'text-accent-red bg-accent-red/15 border-rose-100',
    },
    {
      label: 'Total Revenue',
      value: `₹${Number(statsData?.totalRevenue || 0).toLocaleString()}`,
      icon: TrendingUp,
      badge: 'Volume',
      badgeClass: 'bg-accent-green/15 text-accent-green border-emerald-200',
      iconClass: 'text-accent-green bg-accent-green/15 border-emerald-100',
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
      <div className="space-y-6">
        <ListSkeleton rows={3} />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group relative rounded-3xl border border-border-subtle bg-surface p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary/70">
                {card.label}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${card.badgeClass}`}
              >
                {card.badge}
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="font-syne text-3xl font-extrabold tracking-tight text-text-primary">
                {card.value}
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${card.iconClass} shadow-2xs`}
              >
                <card.icon className="h-5 w-5 stroke-[2]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Seamlessly Aligned Widgets Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Admin Activity Card */}
        <div className="rounded-3xl border border-border-subtle bg-surface p-6 sm:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)] lg:col-span-5 flex flex-col">
          <div className="mb-5 flex items-center justify-between border-b border-border-subtle pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border-subtle text-text-secondary">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="font-syne text-lg font-bold text-text-primary">
                Recent Admin Activity
              </h3>
            </div>
            <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-[10px] font-bold text-text-secondary">
              Live Audit Log
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px]">
            {recentActivity.length > 0 ? (
              recentActivity.map((entry: any) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 transition-colors hover:bg-surface-elevated"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-text-primary">
                      {entry.action || 'Activity'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-secondary/70">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-text-secondary">
                    {entry.target_name || 'System record'}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs font-semibold text-text-secondary/70">
                No recent admin activity logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Contact Issues & Shared Platform Stats */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Contact Issues Widget */}
          <div className="rounded-3xl border border-border-subtle bg-surface p-6 sm:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="mb-5 flex items-center justify-between border-b border-border-subtle pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-amber-soft border border-amber-100 text-accent-amber">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="font-syne text-lg font-bold text-text-primary">
                  Contact Issues &amp; Inquiries
                </h3>
              </div>
              <Link
                to="/admin/contact-issues"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-600 transition-colors"
              >
                <span>Inbox</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-3.5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary/70">
                  Total Issues
                </p>
                <p className="mt-1 font-syne text-2xl font-extrabold text-text-primary">
                  {totalIssuesCount}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-amber">
                  Open
                </p>
                <p className="mt-1 font-syne text-2xl font-extrabold text-accent-amber">
                  {openIssues}
                </p>
              </div>
              <div className="rounded-2xl border border-accent-blue-soft bg-blue-50/60 p-3.5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  In Progress
                </p>
                <p className="mt-1 font-syne text-2xl font-extrabold text-accent-blue">
                  {inProgressIssues}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {recentIssues.length > 0 ? (
                recentIssues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-elevated p-3.5 transition-colors hover:bg-surface-elevated"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate text-xs font-bold text-text-primary">
                        {issue.subject || 'No subject'}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-text-secondary font-medium">
                        {issue.name || issue.email || 'Anonymous user'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        issue.status === 'resolved'
                          ? 'border-emerald-200 bg-accent-green/15 text-accent-green'
                          : issue.status === 'in_progress'
                          ? 'border-accent-blue-soft bg-accent-blue-soft text-blue-700'
                          : 'border-accent-amber-soft bg-accent-amber-soft text-accent-amber'
                      }`}
                    >
                      {String(issue.status || 'open').replace('_', ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-text-secondary/70 font-semibold">
                  No contact tickets pending review.
                </p>
              )}
            </div>
          </div>

          {/* Shared Platform Stats */}
          <div className="rounded-3xl border border-border-subtle bg-surface p-6 sm:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <h3 className="mb-4 font-syne text-base font-bold text-text-primary">
              Shared Platform Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-elevated p-4">
                <span className="text-xs font-semibold text-text-secondary">Community Posts</span>
                <span className="font-syne text-lg font-bold text-text-primary">
                  {sharedStats.totalCommunityPosts || 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-elevated p-4">
                <span className="text-xs font-semibold text-text-secondary">Open Listings</span>
                <span className="font-syne text-lg font-bold text-text-primary">
                  {sharedStats.totalMarketplaceListings || 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-elevated p-4">
                <span className="text-xs font-semibold text-text-secondary">Active Users</span>
                <span className="font-syne text-lg font-bold text-text-primary">
                  {sharedStats.totalActiveUsers || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Per College Snapshot */}
        <div className="rounded-3xl border border-border-subtle bg-surface p-6 sm:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)] lg:col-span-12">
          <div className="mb-5 flex items-center justify-between border-b border-border-subtle pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border-subtle text-text-secondary">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-syne text-lg font-bold text-text-primary">
                  Per College Snapshot
                </h3>
                <p className="text-xs text-text-secondary">
                  Real-time operational activity across campus networks
                </p>
              </div>
            </div>
            <span className="rounded-full bg-surface border border-border-subtle px-3 py-1 text-xs font-bold text-text-secondary">
              {perCollegeStats.length} Campuses Active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {perCollegeStats.length > 0 ? (
              perCollegeStats.map((collegeStat: any) => (
                <div
                  key={collegeStat.college}
                  className="rounded-2xl border border-border-subtle bg-slate-50/60 p-5 transition-all hover:border-slate-200 hover:bg-white hover:shadow-2xs"
                >
                  <h4 className="mb-3 font-syne text-base font-extrabold text-text-primary">
                    {collegeStat.college}
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="font-medium text-text-secondary">Active Students</span>
                      <span className="font-bold text-text-primary">
                        {collegeStat.activeStudentsCount}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="font-medium text-text-secondary">Canteen Orders Today</span>
                      <span className="font-bold text-text-primary">
                        {collegeStat.canteenOrdersToday}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="font-medium text-text-secondary">Print Orders Today</span>
                      <span className="font-bold text-text-primary">
                        {collegeStat.printOrdersToday}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle pb-1.5">
                      <span className="font-medium text-text-secondary">Marketplace Listings</span>
                      <span className="font-bold text-text-primary">
                        {collegeStat.activeListingsCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-text-secondary">Posts Today</span>
                      <span className="font-bold text-text-primary">
                        {collegeStat.postsTodayCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-xs font-semibold text-text-secondary/70">
                No college campus snapshots available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};