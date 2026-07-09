import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { supabase } from '../../lib/supabase';
import { Bell, AlertTriangle, MessageSquare, ShieldAlert, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { formatRelativeTime } from '../../lib/utils';
import { Link } from 'react-router';

interface AlertItem {
  id: string;
  type: 'feedback' | 'community_report' | 'marketplace_report' | 'contact_issue';
  title: string;
  description: string;
  date: string;
  status: string;
  link: string;
  icon: any;
  color: string;
}

export const AdminSmartAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem('admin_last_seen_alerts');
    if (seen) setLastSeen(seen);
    fetchAlerts();
    localStorage.setItem('admin_last_seen_alerts', new Date().toISOString());
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // Fetch Feedback, Reports, and Contact Issues concurrently using Supabase directly
      // Since some API methods might not be fully exported or paginated, we query directly for the latest 20 each
      const [
        { data: feedback },
        { data: commReports },
        { data: marketReports },
        { data: contactIssues }
      ] = await Promise.all([
        supabase.from('app_feedback').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('community_reports').select('*, post:community_posts(title)').order('created_at', { ascending: false }).limit(20),
        supabase.from('marketplace_reports').select('*, listing:marketplace_listings(title)').order('created_at', { ascending: false }).limit(20),
        supabase.from('contact_issues').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      const compiled: AlertItem[] = [];

      (feedback || []).forEach((f: any) => {
        compiled.push({
          id: `fb_${f.id}`,
          type: 'feedback',
          title: 'New App Feedback',
          description: f.message.substring(0, 100) + (f.message.length > 100 ? '...' : ''),
          date: f.created_at,
          status: f.status || 'pending',
          link: '/admin/feedback',
          icon: MessageSquare,
          color: 'text-[#3B82F6] bg-[#3B82F6]/10'
        });
      });

      (commReports || []).forEach((r: any) => {
        compiled.push({
          id: `cr_${r.id}`,
          type: 'community_report',
          title: `Community Post Reported`,
          description: `Reason: ${r.reason}`,
          date: r.created_at,
          status: r.status || 'pending',
          link: '/admin/community/reported',
          icon: ShieldAlert,
          color: 'text-[#DC2626] bg-[#DC2626]/10'
        });
      });

      (marketReports || []).forEach((r: any) => {
        compiled.push({
          id: `mr_${r.id}`,
          type: 'marketplace_report',
          title: `Marketplace Listing Reported`,
          description: `Reason: ${r.reason}`,
          date: r.created_at,
          status: r.status || 'pending',
          link: '/admin/marketplace/reported',
          icon: AlertTriangle,
          color: 'text-[var(--yellow-dark)] bg-[#FEFCE8]'
        });
      });

      (contactIssues || []).forEach((c: any) => {
        compiled.push({
          id: `ci_${c.id}`,
          type: 'contact_issue',
          title: `New Contact Issue: ${c.category || 'General'}`,
          description: c.message.substring(0, 100) + (c.message.length > 100 ? '...' : ''),
          date: c.created_at,
          status: c.status || 'open',
          link: '/admin/contact-issues',
          icon: Wrench,
          color: 'text-[#10B981] bg-[#10B981]/10'
        });
      });

      compiled.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAlerts(compiled);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto min-h-screen pb-20">
      <div className="mb-8">
        <h1 className="text-[28px] font-syne font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
          <Bell className="w-8 h-8 text-[var(--yellow)]" /> Smart Alerts
        </h1>
        <p className="mt-2 text-[15px] font-sans text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          Overview of all recent platform activity including app feedback, reported content, and user contact issues.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
          <div className="w-8 h-8 border-2 border-[var(--yellow)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-sans text-[15px] font-medium">Loading smart alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg)] rounded-2xl border border-black/[0.08] shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-[#10B981] mb-4" />
          <h2 className="text-xl font-bold font-syne text-[var(--text-primary)]">All Caught Up</h2>
          <p className="text-[var(--text-secondary)] mt-2">No recent activity to show.</p>
        </div>
      ) : (
        <div className="space-y-4 relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-black/[0.05] hidden md:block"></div>

          {alerts.map((alert) => {
            const isNew = lastSeen ? new Date(alert.date) > new Date(lastSeen) : true;
            const Icon = alert.icon;

            return (
              <div key={alert.id} className={`relative flex items-start gap-4 md:gap-6 group`}>
                <div className={`hidden md:flex relative z-10 w-12 h-12 rounded-full shrink-0 flex items-center justify-center border-4 border-[var(--bg-primary)] transition-transform group-hover:scale-110 ${alert.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className={`flex-1 p-5 rounded-2xl border border-black/[0.08] transition-all hover:-translate-y-0.5 hover:shadow-md ${isNew ? 'bg-[var(--bg)] shadow-[0_2px_12px_rgba(255,214,0,0.1)] border-[var(--yellow)]/40' : 'bg-[var(--bg)] shadow-sm'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`md:hidden flex w-10 h-10 rounded-full shrink-0 items-center justify-center ${alert.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {isNew && <span className="px-2 py-0.5 bg-[var(--yellow)] text-[var(--text-primary)] text-[10px] font-bold uppercase rounded-md tracking-wider">New</span>}
                          <h3 className="font-bold text-[var(--text-primary)] text-[15px]">{alert.title}</h3>
                        </div>
                        <p className="text-[var(--text-secondary)] text-[14px] leading-relaxed">{alert.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(alert.date).toLocaleDateString()}
                      </div>
                      <Link
                        to={alert.link}
                        className="px-4 py-1.5 text-xs font-bold bg-[var(--text-primary)] text-white rounded-lg hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                      >
                        Review
                      </Link>
                    </div>
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
