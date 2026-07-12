import React, { useEffect, useState, useCallback } from 'react';
import { Clock, LayoutTemplate, Send, Mail, Users, User, ChevronDown, CheckCircle2, AlertCircle, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { getAllUsers } from '../../api/admin';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

type Tab = 'compose' | 'history' | 'templates';

type AdminEmailPageProps = {
  initialTab?: Tab;
  title?: string;
};

/* ── Email log type ─────────────────────────────────────── */
interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  sent_by: string;
  sent_at: string;
  status: 'sent' | 'failed';
}

/* ── Built-in templates ─────────────────────────────────── */
const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    subject: 'Welcome to Campus Blink!',
    body: `Hi {{name}},

Welcome to Campus Blink — your all-in-one campus super-app!

Here you can:
• Order from the campus canteen
• Use print services
• Browse the student marketplace
• Connect with your university community

If you have any questions, feel free to contact our support team.

Best regards,
Campus Blink Team`,
  },
  {
    id: 'maintenance',
    name: 'Maintenance Notice',
    subject: 'Scheduled Maintenance – Campus Blink',
    body: `Hi there,

We wanted to let you know that Campus Blink will be undergoing scheduled maintenance on [DATE] from [START_TIME] to [END_TIME].

During this time, the platform may be temporarily unavailable. We apologize for any inconvenience.

Thank you for your understanding.

Best regards,
Campus Blink Team`,
  },
  {
    id: 'policy_update',
    name: 'Policy Update',
    subject: 'Important: Campus Blink Policy Update',
    body: `Hi {{name}},

We've updated our Terms of Service and Privacy Policy effective [DATE].

Key changes include:
• [CHANGE 1]
• [CHANGE 2]
• [CHANGE 3]

You can review the full policies at campusblink.me/terms

By continuing to use Campus Blink, you agree to the updated policies.

Best regards,
Campus Blink Team`,
  },
  {
    id: 'announcement',
    name: 'Platform Announcement',
    subject: 'Announcement from Campus Blink',
    body: `Hi {{name}},

We have an important announcement to share with you.

[ANNOUNCEMENT CONTENT]

Thank you for being a valued part of the Campus Blink community!

Best regards,
Campus Blink Team`,
  },
];

export const AdminEmailPage: React.FC<AdminEmailPageProps> = ({ initialTab = 'compose', title }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [recipients, setRecipients] = useState<any[]>([]);

  // Compose state
  const [recipientType, setRecipientType] = useState<'individual' | 'all_students' | 'all_canteen' | 'all_print' | 'all_professors'>('individual');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  // History state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Selected template
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const load = async () => {
      const { data } = await getAllUsers({}, 1);
      setRecipients(data || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchEmailLogs();
  }, [activeTab]);

  const fetchEmailLogs = async () => {
    setLogsLoading(true);
    try {
      const { data } = await supabase
        .from('admin_email_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);
      setEmailLogs(data || []);
    } catch {
      // Table may not exist yet; silently continue
    } finally {
      setLogsLoading(false);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const t = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    setSelectedTemplate(templateId);
    setActiveTab('compose');
    toast.success(`Template "${t.name}" applied`);
  };

  const getRecipientsToEmail = async (): Promise<string[]> => {
    if (recipientType === 'individual') {
      return selectedEmail ? [selectedEmail] : [];
    }
    const roleMap: Record<string, string> = {
      all_students: 'student',
      all_canteen: 'canteen',
      all_print: 'print',
      all_professors: 'professor',
    };
    const role = roleMap[recipientType];
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', role)
      .eq('status', 'active');
    return (data || []).map((u: any) => u.email).filter(Boolean);
  };

  const handleSendEmail = async () => {
    if (!subject.trim()) { toast.error('Please enter a subject line'); return; }
    if (!body.trim()) { toast.error('Please enter email body content'); return; }

    const toEmails = await getRecipientsToEmail();
    if (toEmails.length === 0) {
      toast.error('No recipients selected or found');
      return;
    }

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) { toast.error('Not authenticated'); return; }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) { toast.error('Backend URL not configured'); return; }

    setIsSending(true);
    const toastId = toast.loading(`Sending to ${toEmails.length} recipient${toEmails.length !== 1 ? 's' : ''}…`);

    let successCount = 0;
    let failCount = 0;

    for (const email of toEmails) {
      try {
        const res = await fetch(`${backendUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: email,
            subject: subject.trim(),
            html: body.replace(/\n/g, '<br/>'),
          }),
        });

        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setIsSending(false);

    if (failCount === 0) {
      toast.success(`Email sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}`, { id: toastId });
      setSubject('');
      setBody('');
      setSelectedEmail('');
    } else {
      toast.error(`${successCount} sent, ${failCount} failed`, { id: toastId });
    }
  };

  const filteredRecipients = recipients.filter(r => {
    if (!searchUser) return true;
    const q = searchUser.toLowerCase();
    return (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q);
  });

  const tabConfig: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'compose', label: 'Compose', icon: Send },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-admin-accent-soft-bg transition-colors">
          <Mail className="h-4.5 w-4.5 text-blue-600 dark:text-admin-accent transition-colors" />
        </div>
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">
            {title || 'Email Center'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-admin-text-secondary transition-colors">Send emails to platform users and manage templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md pt-2 pb-2 -mx-4 px-4 md:static md:bg-white dark:md:bg-admin-bg-surface md:border md:border-slate-200 dark:md:border-admin-border-subtle md:rounded-2xl md:p-1.5 md:shadow-sm dark:md:shadow-none md:w-fit md:mx-0 flex md:items-center gap-1.5 overflow-x-auto hide-scrollbar transition-colors">
        {tabConfig.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 md:py-2 text-[13px] font-semibold transition-all relative ${
              activeTab === id
                ? 'text-amber-600 dark:text-amber-500 md:bg-amber-500 dark:md:bg-admin-accent md:text-white dark:md:text-admin-bg-surface-elevated md:rounded-xl md:shadow-sm md:shadow-amber-200 dark:md:shadow-none'
                : 'text-slate-500 dark:text-admin-text-secondary hover:text-slate-800 dark:hover:text-admin-text-primary md:rounded-xl md:hover:bg-slate-100 dark:md:hover:bg-admin-bg-surface-hover'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {/* Mobile Underline Indicator */}
            {activeTab === id && (
              <div className="md:hidden absolute bottom-0 left-4 right-4 h-[3px] bg-amber-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ─── COMPOSE TAB ───────────────────────────────── */}
      {activeTab === 'compose' && (
        <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
            <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">New Email</h3>
            <p className="text-xs text-slate-400 dark:text-admin-text-tertiary mt-0.5 transition-colors">Send a custom email to individual users or groups</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Recipient Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-admin-text-secondary uppercase tracking-wider mb-2 transition-colors">
                Recipient Type
              </label>
              <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-2 px-2 md:mx-0 md:px-0">
                {[
                  { id: 'individual', label: 'Individual', icon: User },
                  { id: 'all_students', label: 'All Students', icon: Users },
                  { id: 'all_professors', label: 'All Professors', icon: Users },
                  { id: 'all_canteen', label: 'Canteen Owners', icon: Users },
                  { id: 'all_print', label: 'Print Shops', icon: Users },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRecipientType(id as any)}
                    className={`shrink-0 flex items-center md:flex-col md:items-center gap-1.5 rounded-full md:rounded-xl border px-4 py-2 md:p-3 text-[11px] font-semibold transition-all shadow-sm md:shadow-none ${
                      recipientType === id
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 md:shadow-sm dark:md:shadow-none'
                        : 'border-slate-200 dark:border-admin-border-subtle text-slate-500 dark:text-admin-text-secondary hover:border-amber-200 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 bg-white dark:bg-admin-bg-surface'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual picker */}
            {recipientType === 'individual' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-admin-text-secondary uppercase tracking-wider mb-2 transition-colors">
                  Select User
                </label>
                <input
                  type="text"
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-base px-4 py-2.5 text-sm text-slate-900 dark:text-admin-text-primary placeholder-slate-400 focus:border-amber-400 focus:bg-white dark:focus:bg-admin-bg-surface focus:ring-2 focus:ring-amber-100 outline-none transition-all mb-2"
                />
                <select
                  value={selectedEmail}
                  onChange={e => setSelectedEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-base px-4 py-2.5 text-sm text-slate-900 dark:text-admin-text-primary focus:border-amber-400 focus:bg-white dark:focus:bg-admin-bg-surface focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                >
                  <option value="">Select a user…</option>
                  {filteredRecipients.map(r => (
                    <option key={r.id} value={r.email}>
                      {r.name || r.email} {r.email ? `— ${r.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-admin-text-secondary uppercase tracking-wider mb-2 transition-colors">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter email subject…"
                className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-base px-4 py-2.5 text-sm text-slate-900 dark:text-admin-text-primary placeholder-slate-400 focus:border-amber-400 focus:bg-white dark:focus:bg-admin-bg-surface focus:ring-2 focus:ring-amber-100 outline-none transition-all"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-admin-text-secondary uppercase tracking-wider mb-2 transition-colors">
                Email Body
              </label>
              <textarea
                rows={14}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your email content here. Use {{name}} to insert the recipient's name."
                className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-base px-4 py-3 text-sm text-slate-900 dark:text-admin-text-primary placeholder-slate-400 focus:border-amber-400 focus:bg-white dark:focus:bg-admin-bg-surface focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none font-mono leading-relaxed"
              />
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-admin-text-tertiary transition-colors">
                Tip: Use a template from the Templates tab as a starting point. Plain text is sent as-is.
              </p>
            </div>

            {/* Send button (Desktop inline, Mobile sticky bottom) */}
            <div className="hidden md:flex items-center justify-between pt-2 border-t border-slate-100 dark:border-admin-border-subtle transition-colors">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className="text-xs font-semibold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
              >
                ← Use a template
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 dark:bg-admin-accent px-6 py-2.5 text-sm font-bold text-white dark:text-admin-bg-surface-elevated shadow-sm shadow-amber-200 dark:shadow-none hover:bg-amber-600 dark:hover:bg-amber-400 disabled:opacity-60 transition-all"
              >
                {isSending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Email</>
                )}
              </button>
            </div>
            
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-admin-bg-base/95 backdrop-blur-md border-t border-slate-100 dark:border-admin-border-subtle shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-none z-40 pb-safe flex items-center gap-3 transition-colors">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-admin-bg-surface-hover text-slate-600 dark:text-admin-text-secondary shadow-sm dark:shadow-none transition-colors"
              >
                <LayoutTemplate className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending}
                className="flex-1 h-12 rounded-xl bg-amber-500 dark:bg-admin-accent active:bg-amber-600 dark:active:bg-amber-400 text-white dark:text-admin-bg-surface-elevated font-extrabold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-200/50 dark:shadow-none disabled:opacity-60"
              >
                {isSending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Email</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── HISTORY TAB ───────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
            <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">Email History</h3>
            <button
              type="button"
              onClick={fetchEmailLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-admin-text-secondary hover:text-slate-800 dark:hover:text-admin-text-primary transition-colors"
            >
              <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6 rounded-3xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-base m-4 md:m-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-colors">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-admin-bg-surface shadow-sm flex items-center justify-center mb-4 transition-colors">
                <Clock className="h-8 w-8 text-slate-300 dark:text-admin-text-tertiary transition-colors" />
              </div>
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-admin-text-primary transition-colors">No email history yet</h4>
              <p className="text-xs text-slate-500 dark:text-admin-text-secondary mt-1 max-w-xs leading-relaxed transition-colors">
                Email delivery logs will appear here once you start sending emails through the platform.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-admin-bg-base border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
                  <tr>
                    {['Recipient', 'Subject', 'Sent By', 'Date', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-admin-border-subtle transition-colors">
                  {emailLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover transition-colors">
                      <td className="px-5 py-3.5 text-slate-800 dark:text-admin-text-primary transition-colors">{log.to_email}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-admin-text-secondary transition-colors">{log.subject}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-admin-text-secondary transition-colors">{log.sent_by}</td>
                      <td className="px-5 py-3.5 text-slate-400 dark:text-admin-text-tertiary text-[12px] transition-colors">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                          log.status === 'sent'
                            ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        }`}>
                          {log.status === 'sent'
                            ? <CheckCircle2 size={10} />
                            : <AlertCircle size={10} />
                          }
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TEMPLATES TAB ─────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-6 py-4 shadow-sm transition-colors">
            <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary transition-colors">Email Templates</h3>
            <p className="text-xs text-slate-400 dark:text-admin-text-tertiary mt-0.5 transition-colors">
              Click "Use Template" to populate the Compose form with that template's content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMAIL_TEMPLATES.map(template => (
              <div
                key={template.id}
                onClick={() => handleApplyTemplate(template.id)}
                className={`relative rounded-2xl border bg-white dark:bg-admin-bg-surface p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none transition-all cursor-pointer group ${
                  selectedTemplate === template.id
                    ? 'border-amber-400 shadow-amber-100 ring-1 ring-amber-400'
                    : 'border-slate-200 dark:border-admin-border-subtle hover:border-amber-200 dark:hover:border-amber-500 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0 pr-6">
                    <h4 className="font-syne font-bold text-slate-900 dark:text-admin-text-primary text-[14px] leading-tight mb-1 transition-colors">{template.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-admin-text-tertiary font-bold uppercase tracking-wider truncate transition-colors">{template.subject}</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-admin-text-secondary bg-slate-50/50 dark:bg-admin-bg-base/50 rounded-xl p-3 border border-slate-100 dark:border-admin-border-subtle overflow-hidden line-clamp-2 font-sans leading-relaxed transition-colors">
                  {template.body.replace(/\n/g, ' ')}
                </div>
                
                {/* Desktop massive button / Mobile subtle arrow */}
                <div className="hidden md:block mt-3">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-amber-500 dark:bg-admin-accent py-2 text-xs font-bold text-white dark:text-admin-bg-surface-elevated shadow-sm shadow-amber-200 dark:shadow-none hover:bg-amber-600 dark:hover:bg-amber-400 transition-colors"
                  >
                    Use Template
                  </button>
                </div>
                <div className="md:hidden absolute top-4 right-4 text-slate-300 dark:text-admin-text-tertiary group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                  {selectedTemplate === template.id ? (
                    <CheckCircle2 className="h-5 w-5 text-amber-500 dark:text-amber-400 transition-colors" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};