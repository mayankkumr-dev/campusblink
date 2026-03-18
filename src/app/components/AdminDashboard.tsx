import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, ShoppingBag, ShoppingCart, Star, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router';
import { getDashboardStats } from '../../api/admin';
import { getContactIssues } from '../../api/contact';

export const AdminDashboard: React.FC = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [contactIssues, setContactIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const [{ data }, { data: issuesData }] = await Promise.all([
        getDashboardStats(),
        getContactIssues('all'),
      ]);

      setStatsData(data || null);
      setContactIssues(issuesData || []);
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FFD600]" /></div>;
  }

  const cards = [
    { label: 'Total Users', value: statsData?.totalUsers || 0, icon: Users, accent: 'text-[#16A34A]' },
    { label: 'Active Orders', value: statsData?.activeOrders || 0, icon: ShoppingBag, accent: 'text-[#FFD600]' },
    { label: 'Marketplace Listings', value: statsData?.totalListings || 0, icon: ShoppingCart, accent: 'text-[#0057FF]' },
    { label: 'Total Reputation in Circulation', value: statsData?.creditsCirculating || 0, icon: Star, accent: 'text-[#FFD600]' },
    { label: 'Reports Pending', value: statsData?.pendingReports || 0, icon: AlertCircle, accent: 'text-[#DC2626]' },
    { label: 'Revenue Total', value: `₹${Number(statsData?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, accent: 'text-[#16A34A]' },
  ];

  const sharedStats = statsData?.sharedStats || {};
  const recentActivity = statsData?.recentActivity || [];
  const perCollegeStats = statsData?.perCollegeStats || [];
  const openIssues = contactIssues.filter((issue: any) => issue.status === 'open').length;
  const inProgressIssues = contactIssues.filter((issue: any) => issue.status === 'in_progress').length;
  const recentIssues = contactIssues.slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-black/[0.08] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-[#6B6B6B]">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.accent}`} />
            </div>
            <div className="font-syne text-3xl font-bold text-[#0D0D0D]">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg border border-black/[0.08] bg-white p-6 lg:col-span-4">
          <h3 className="mb-4 font-syne text-lg font-bold text-[#0D0D0D]">Recent Admin Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((entry: any) => (
              <div key={entry.id} className="rounded-lg border border-black/[0.08] bg-[#F7F5F0] p-3">
                <div className="text-sm font-bold text-[#0D0D0D]">{entry.action || 'Activity'}</div>
                <div className="mt-1 text-xs text-[#6B6B6B]">{entry.target_name || 'System target'}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-[#AAAAAA]">{new Date(entry.created_at).toLocaleString()}</div>
              </div>
            )) : <div className="text-sm text-[#6B6B6B]">No audit activity recorded yet.</div>}
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-white p-6 lg:col-span-3">
          <h3 className="mb-4 font-syne text-lg font-bold text-[#0D0D0D]">Shared Platform Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-[#F7F5F0] p-3"><span className="text-sm text-[#6B6B6B]">Community Posts</span><span className="font-bold text-[#0D0D0D]">{sharedStats.totalCommunityPosts || 0}</span></div>
            <div className="flex items-center justify-between rounded-lg bg-[#F7F5F0] p-3"><span className="text-sm text-[#6B6B6B]">Open Listings</span><span className="font-bold text-[#0D0D0D]">{sharedStats.totalMarketplaceListings || 0}</span></div>
            <div className="flex items-center justify-between rounded-lg bg-[#F7F5F0] p-3"><span className="text-sm text-[#6B6B6B]">Active Users</span><span className="font-bold text-[#0D0D0D]">{sharedStats.totalActiveUsers || 0}</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-white p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-syne text-lg font-bold text-[#0D0D0D]">Contact Issues</h3>
            <Link
              to="/admin/contact-issues"
              className="rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0D0D0D]"
            >
              Open Inbox
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[#F7F5F0] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Total</p>
              <p className="font-syne text-2xl font-bold text-[#0D0D0D]">{contactIssues.length}</p>
            </div>
            <div className="rounded-lg bg-[#FFF7D6] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Open</p>
              <p className="font-syne text-2xl font-bold text-[#92400E]">{openIssues}</p>
            </div>
            <div className="rounded-lg bg-[#DBEAFE] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">In Progress</p>
              <p className="font-syne text-2xl font-bold text-[#1D4ED8]">{inProgressIssues}</p>
            </div>
          </div>

          <div className="space-y-2">
            {recentIssues.length > 0 ? (
              recentIssues.map((issue: any) => (
                <div key={issue.id} className="rounded-lg border border-black/[0.08] bg-[#F7F5F0] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-[#0D0D0D]">{issue.subject || 'No subject'}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${issue.status === 'resolved' ? 'bg-[#DCFCE7] text-[#166534]' : issue.status === 'in_progress' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-[#FEF9C3] text-[#92400E]'}`}>
                      {String(issue.status || 'open').replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[#6B6B6B]">{issue.name || issue.email || 'Unknown user'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#6B6B6B]">No contact issues submitted yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-white p-6 lg:col-span-5">
          <h3 className="mb-4 font-syne text-lg font-bold text-[#0D0D0D]">Per College Snapshot</h3>
          <div className="grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {perCollegeStats.length > 0 ? perCollegeStats.map((collegeStat: any) => (
              <div key={collegeStat.college} className="rounded-lg border border-black/[0.08] bg-[#F7F5F0] p-4">
                <h4 className="mb-3 font-syne text-base font-bold text-[#0D0D0D]">{collegeStat.college}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">Students</span><span className="font-bold text-[#0D0D0D]">{collegeStat.activeStudentsCount}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">Canteen Orders Today</span><span className="font-bold text-[#0D0D0D]">{collegeStat.canteenOrdersToday}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">Print Orders Today</span><span className="font-bold text-[#0D0D0D]">{collegeStat.printOrdersToday}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">Active Listings</span><span className="font-bold text-[#0D0D0D]">{collegeStat.activeListingsCount}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">Posts Today</span><span className="font-bold text-[#0D0D0D]">{collegeStat.postsTodayCount}</span></div>
                </div>
              </div>
            )) : <div className="text-sm text-[#6B6B6B]">No college stats available.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};