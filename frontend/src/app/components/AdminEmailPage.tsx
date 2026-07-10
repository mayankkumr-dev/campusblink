import React, { useEffect, useState, useCallback } from 'react';
import { Clock, LayoutTemplate, Send, Mail, Users, User, ChevronDown, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
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
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
          <Mail className="h-4.5 w-4.5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">
            {title || 'Email Center'}
          </h2>
          <p className="text-sm text-slate-500">Send emails to platform users and manage templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {tabConfig.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${
              activeTab === id
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── COMPOSE TAB ───────────────────────────────── */}
      {activeTab === 'compose' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">New Email</h3>
            <p className="text-xs text-slate-400 mt-0.5">Send a custom email to individual users or groups</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Recipient Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Recipient Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-semibold transition-all ${
                      recipientType === id
                        ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50'
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
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Select User
                </label>
                <input
                  type="text"
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none transition-all mb-2"
                />
                <select
                  value={selectedEmail}
                  onChange={e => setSelectedEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none transition-all"
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
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter email subject…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none transition-all"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Email Body
              </label>
              <textarea
                rows={14}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your email content here. Use {{name}} to insert the recipient's name."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none font-mono leading-relaxed"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Tip: Use a template from the Templates tab as a starting point. Plain text is sent as-is.
              </p>
            </div>

            {/* Send button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                ← Use a template
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber-200 hover:bg-amber-600 disabled:opacity-60 transition-all"
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Email History</h3>
            <button
              type="button"
              onClick={fetchEmailLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Clock className="h-10 w-10 text-slate-200 mb-3" />
              <h4 className="font-semibold text-slate-700">No email history yet</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Email delivery logs will appear here once you start sending emails through the platform.
                Requires an <code className="text-amber-600">admin_email_log</code> table in Supabase.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Recipient', 'Subject', 'Sent By', 'Date', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emailLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-800 font-medium">{log.to_email}</td>
                      <td className="px-5 py-3.5 text-slate-600">{log.subject}</td>
                      <td className="px-5 py-3.5 text-slate-500">{log.sent_by}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-[12px]">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          log.status === 'sent'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
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
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <h3 className="font-semibold text-slate-900">Email Templates</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click "Use Template" to populate the Compose form with that template's content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMAIL_TEMPLATES.map(template => (
              <div
                key={template.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${
                  selectedTemplate === template.id
                    ? 'border-amber-400 shadow-amber-100'
                    : 'border-slate-200 hover:border-amber-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 shrink-0">
                    <LayoutTemplate className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 text-[13px]">{template.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{template.subject}</p>
                  </div>
                  {selectedTemplate === template.id && (
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                </div>

                <pre className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3 overflow-hidden line-clamp-4 font-sans whitespace-pre-wrap leading-relaxed">
                  {template.body.substring(0, 200)}…
                </pre>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate(template.id)}
                  className="mt-3 w-full rounded-xl bg-amber-500 py-2 text-xs font-bold text-white shadow-sm shadow-amber-200 hover:bg-amber-600 transition-colors"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};