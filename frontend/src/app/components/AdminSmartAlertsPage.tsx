import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Bell, AlertTriangle, MessageSquare, ShieldAlert, CheckCircle2, Clock, Wrench,
  RefreshCw, Filter
} from 'lucide-react';
import { Link } from 'react-router';

interface AlertItem {
  id: string;
  type: 'feedback' | 'community_report' | 'marketplace_report' | 'contact_issue';
  title: string;
  description: string;
  date: string;
  status: string;
  link: string;
  icon: React.ElementType;
  accentClass: string;
  bgClass: string;
  borderClass: string;
}

const TYPE_FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'community_report', label: 'Community Reports' },
  { id: 'marketplace_report', label: 'Marketplace Reports' },
  { id: 'feedback', label: 'App Feedback' },
  { id: 'contact_issue', label: 'Contact Issues' },
] as const;

export const AdminSmartAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('admin_last_seen_alerts');
    if (seen) setLastSeen(seen);
    fetchAlerts();
    localStorage.setItem('admin_last_seen_alerts', new Date().toISOString());
  }, []);

  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [
        { data: feedback },
        { data: commReports },
        { data: marketReports },
        { data: contactIssues }
      ] = await Promise.all([
        supabase.from('app_feedback').select('*').order('created_at', { ascending: false }).limit(25),
        supabase.from('community_reports').select('*, post:community_posts(title)').order('created_at', { ascending: false }).limit(25),
        supabase.from('marketplace_reports').select('*, listing:marketplace_listings(title)').order('created_at', { ascending: false }).limit(25),
        supabase.from('contact_issues').select('*').order('created_at', { ascending: false }).limit(25),
      ]);

      const compiled: AlertItem[] = [];

      (feedback || []).forEach((f: any) => {
        compiled.push({
          id: `fb_${f.id}`,
          type: 'feedback',
          title: 'New App Feedback',
          description: (f.message || '').substring(0, 120) + ((f.message || '').length > 120 ? '…' : ''),
          date: f.created_at,
          status: f.status || 'pending',
          link: '/admin/feedback',
          icon: MessageSquare,
          accentClass: 'text-blue-600',
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-200',
        });
      });

      (commReports || []).forEach((r: any) => {
        compiled.push({
          id: `cr_${r.id}`,
          type: 'community_report',
          title: 'Community Post Reported',
          description: `Reason: ${r.reason || 'Not specified'}`,
          date: r.created_at,
          status: r.status || 'pending',
          // FIX: was '/admin/community/reported' — correct route is community-hub
          link: '/admin/community-hub?tab=reported',
          icon: ShieldAlert,
          accentClass: 'text-rose-600',
          bgClass: 'bg-rose-50',
          borderClass: 'border-rose-200',
        });
      });

      (marketReports || []).forEach((r: any) => {
        compiled.push({
          id: `mr_${r.id}`,
          type: 'marketplace_report',
          title: 'Marketplace Listing Reported',
          description: `Reason: ${r.reason || 'Not specified'}`,
          date: r.created_at,
          status: r.status || 'pending',
          link: '/admin/marketplace/reported',
          icon: AlertTriangle,
          accentClass: 'text-amber-600',
          bgClass: 'bg-amber-50',
          borderClass: 'border-amber-200',
        });
      });

      (contactIssues || []).forEach((c: any) => {
        compiled.push({
          id: `ci_${c.id}`,
          type: 'contact_issue',
          title: `Contact Issue: ${c.category || 'General'}`,
          description: (c.message || '').substring(0, 120) + ((c.message || '').length > 120 ? '…' : ''),
          date: c.created_at,
          status: c.status || 'open',
          link: '/admin/contact-issues',
          icon: Wrench,
          accentClass: 'text-emerald-600',
          bgClass: 'bg-emerald-50',
          borderClass: 'border-emerald-200',
        });
      });

      compiled.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAlerts(compiled);
    } catch (err) {
      console.error('Error fetching smart alerts:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => fetchAlerts(true);

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
  const newAlerts = filteredAlerts.filter(a => lastSeen ? new Date(a.date) > new Date(lastSeen) : true);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1 transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-admin-accent-soft-bg transition-colors">
              <Bell className="h-4 w-4 text-amber-600 dark:text-admin-accent transition-colors" />
            </div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">
              Smart Alerts
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-admin-text-secondary transition-colors">
            All recent platform activity — feedback, reports, contact issues
            {newAlerts.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 transition-colors">
                {newAlerts.length} NEW
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-4 py-2 text-xs font-bold text-slate-600 dark:text-admin-text-primary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover transition-colors shadow-sm dark:shadow-none disabled:opacity-60"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-slate-400 dark:text-admin-text-secondary shrink-0 transition-colors" />
        {TYPE_FILTER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${
              filter === opt.id
                ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-200 dark:bg-admin-accent dark:border-admin-accent dark:text-admin-bg-surface-elevated dark:shadow-none'
                : 'border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface text-slate-500 dark:text-admin-text-secondary hover:border-amber-300 dark:hover:border-admin-accent hover:text-amber-600 dark:hover:text-admin-accent'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-5 animate-pulse transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-admin-bg-surface-raised shrink-0 transition-colors" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 dark:bg-admin-bg-surface-raised rounded-full w-48 transition-colors" />
                  <div className="h-3 bg-slate-100 dark:bg-admin-bg-surface-raised rounded-full w-80 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface py-20 shadow-sm dark:shadow-none transition-colors">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 dark:text-emerald-500 mb-4 transition-colors" />
          <h3 className="font-syne text-lg font-bold text-slate-900 dark:text-admin-text-primary transition-colors">All Caught Up</h3>
          <p className="mt-1 text-sm text-slate-400 dark:text-admin-text-secondary transition-colors">No alerts to show for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isNew = lastSeen ? new Date(alert.date) > new Date(lastSeen) : true;
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className={`group rounded-2xl border bg-white dark:bg-admin-bg-surface p-5 shadow-sm dark:shadow-none transition-all hover:shadow-md dark:hover:shadow-none hover:-translate-y-0.5 ${
                  isNew ? 'border-amber-200 shadow-amber-50 dark:border-admin-accent/50' : 'border-slate-200 dark:border-admin-border-subtle'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${alert.bgClass} ${alert.borderClass} dark:bg-admin-bg-surface-raised dark:border-admin-border-strong`}>
                    <Icon className={`h-4.5 w-4.5 transition-colors ${alert.accentClass}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {isNew && (
                        <span className="rounded-full bg-amber-500 dark:bg-admin-accent px-2 py-0.5 text-[10px] font-bold text-white dark:text-admin-bg-surface-elevated uppercase tracking-wider shrink-0 transition-colors">
                          New
                        </span>
                      )}
                      <h3 className="font-semibold text-[13px] text-slate-900 dark:text-admin-text-primary transition-colors">{alert.title}</h3>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-admin-text-secondary leading-relaxed transition-colors">{alert.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-admin-text-tertiary transition-colors">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(alert.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                    <Link
                      to={alert.link}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 dark:bg-admin-bg-surface-raised dark:text-admin-text-primary px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-500 dark:hover:bg-admin-accent dark:hover:text-admin-bg-surface-elevated transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
