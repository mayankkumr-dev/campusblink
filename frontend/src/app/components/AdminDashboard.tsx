import React, { useEffect, useState } from "react";
import { AlertCircle, ShoppingBag, ShoppingCart, Star, TrendingUp, Users } from 'lucide-react';
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
    { label: 'Total Users', value: statsData?.totalUsers || 0, icon: Users, accent: 'text-[#16A34A]' },
    { label: 'Active Orders', value: statsData?.activeOrders || 0, icon: ShoppingBag, accent: 'text-[var(--yellow)]' },
    { label: 'Marketplace Listings', value: statsData?.totalListings || 0, icon: ShoppingCart, accent: 'text-[var(--accent)]' },
    { label: 'Total Reputation in Circulation', value: statsData?.creditsCirculating || 0, icon: Star, accent: 'text-[var(--yellow)]' },
    { label: 'Reports Pending', value: statsData?.pendingReports || 0, icon: AlertCircle, accent: 'text-[#DC2626]' },
    { label: 'Revenue Total', value: `₹${Number(statsData?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, accent: 'text-[#16A34A]' },
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
      <div className="space-y-4">
        <ListSkeleton rows={4} />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.accent}`} />
            </div>
            <div className="font-syne text-3xl font-bold text-[var(--text-primary)]">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6 lg:col-span-4">
          <h3 className="mb-4 font-syne text-lg font-bold text-[var(--text-primary)]">Recent Admin Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((entry: any) => (
              <div key={entry.id} className="rounded-lg border border-black/[0.08] bg-[var(--bg-tertiary)] p-3">
                <div className="text-sm font-bold text-[var(--text-primary)]">{entry.action || 'Activity'}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{entry.target_name || 'System target'}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{new Date(entry.created_at).toLocaleString()}</div>
              </div>
            )) : <div className="text-sm text-[var(--text-secondary)]">No audit activity recorded yet.</div>}
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6 lg:col-span-3">
          <h3 className="mb-4 font-syne text-lg font-bold text-[var(--text-primary)]">Shared Platform Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3"><span className="text-sm text-[var(--text-secondary)]">Community Posts</span><span className="font-bold text-[var(--text-primary)]">{sharedStats.totalCommunityPosts || 0}</span></div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3"><span className="text-sm text-[var(--text-secondary)]">Open Listings</span><span className="font-bold text-[var(--text-primary)]">{sharedStats.totalMarketplaceListings || 0}</span></div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3"><span className="text-sm text-[var(--text-secondary)]">Active Users</span><span className="font-bold text-[var(--text-primary)]">{sharedStats.totalActiveUsers || 0}</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-syne text-lg font-bold text-[var(--text-primary)]">Contact Issues</h3>
            <Link
              to="/admin/contact-issues"
              className="rounded-lg bg-[var(--yellow)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]"
            >
              Open Inbox
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total</p>
              <p className="font-syne text-2xl font-bold text-[var(--text-primary)]">{totalIssuesCount}</p>
            </div>
            <div className="rounded-lg bg-[var(--yellow-light)] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Open</p>
              <p className="font-syne text-2xl font-bold text-[var(--yellow-dark)]">{openIssues}</p>
            </div>
            <div className="rounded-lg bg-[var(--info-light)] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">In Progress</p>
              <p className="font-syne text-2xl font-bold text-[var(--info)]">{inProgressIssues}</p>
            </div>
          </div>

          <div className="space-y-2">
            {recentIssues.length > 0 ? (
              recentIssues.map((issue: any) => (
                <div key={issue.id} className="rounded-lg border border-black/[0.08] bg-[var(--bg-tertiary)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">{issue.subject || 'No subject'}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${issue.status === 'resolved' ? 'bg-[var(--success-light)] text-[var(--success-dark)]' : issue.status === 'in_progress' ? 'bg-[var(--info-light)] text-[var(--info)]' : 'bg-[#FEF9C3] text-[var(--yellow-dark)]'}`}>
                      {String(issue.status || 'open').replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{issue.name || issue.email || 'Unknown user'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No contact issues submitted yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6 lg:col-span-5">
          <h3 className="mb-4 font-syne text-lg font-bold text-[var(--text-primary)]">Per College Snapshot</h3>
          <div className="grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {perCollegeStats.length > 0 ? perCollegeStats.map((collegeStat: any) => (
              <div key={collegeStat.college} className="rounded-lg border border-black/[0.08] bg-[var(--bg-tertiary)] p-4">
                <h4 className="mb-3 font-syne text-base font-bold text-[var(--text-primary)]">{collegeStat.college}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Students</span><span className="font-bold text-[var(--text-primary)]">{collegeStat.activeStudentsCount}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Canteen Orders Today</span><span className="font-bold text-[var(--text-primary)]">{collegeStat.canteenOrdersToday}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Print Orders Today</span><span className="font-bold text-[var(--text-primary)]">{collegeStat.printOrdersToday}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Active Listings</span><span className="font-bold text-[var(--text-primary)]">{collegeStat.activeListingsCount}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Posts Today</span><span className="font-bold text-[var(--text-primary)]">{collegeStat.postsTodayCount}</span></div>
                </div>
              </div>
            )) : <div className="text-sm text-[var(--text-secondary)]">No college stats available.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};