import React, { useEffect, useState } from 'react';
import { Clock, LayoutTemplate, Send } from 'lucide-react';
import { getAllUsers } from '../../api/admin';

type AdminEmailPageProps = {
  initialTab?: 'compose' | 'history' | 'templates';
  title?: string;
};

export const AdminEmailPage: React.FC<AdminEmailPageProps> = ({ initialTab = 'compose', title }) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'templates'>(initialTab);
  const [recipients, setRecipients] = useState<any[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const loadRecipients = async () => {
      const { data } = await getAllUsers({}, 1);
      setRecipients(data || []);
    };

    loadRecipients();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {title && <div className="rounded-lg border border-black/[0.08] bg-white p-4"><h2 className="font-syne text-xl font-bold text-[#0D0D0D]">{title}</h2></div>}

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-black/[0.08] bg-white p-2">
        <button onClick={() => setActiveTab('compose')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'compose' ? 'bg-[#FFD600] text-[#0D0D0D]' : 'text-[#6B6B6B]'}`}><Send className="h-4 w-4" /> Compose</button>
        <button onClick={() => setActiveTab('history')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'history' ? 'bg-[#FFD600] text-[#0D0D0D]' : 'text-[#6B6B6B]'}`}><Clock className="h-4 w-4" /> History</button>
        <button onClick={() => setActiveTab('templates')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'templates' ? 'bg-[#FFD600] text-[#0D0D0D]' : 'text-[#6B6B6B]'}`}><LayoutTemplate className="h-4 w-4" /> Templates</button>
      </div>

      {activeTab === 'compose' && (
        <div className="space-y-6 rounded-lg border border-black/[0.08] bg-white p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select className="rounded-lg border border-black/10 bg-[#FAFAF8] p-3 text-sm text-[#0D0D0D] outline-none">
              <option>Individual User</option>
              <option>All Students</option>
              <option>All Canteen Owners</option>
              <option>All Print Shops</option>
            </select>
            <select className="rounded-lg border border-black/10 bg-[#FAFAF8] p-3 text-sm text-[#0D0D0D] outline-none">
              <option value="">Pick a live user</option>
              {recipients.map((recipient) => <option key={recipient.id} value={recipient.email}>{recipient.name || recipient.email}</option>)}
            </select>
          </div>
          <input placeholder="Subject line" className="w-full rounded-lg border border-black/10 bg-[#FAFAF8] p-3 text-sm text-[#0D0D0D] outline-none" />
          <textarea rows={12} placeholder="Write your email content here." className="w-full rounded-lg border border-black/10 bg-[#FAFAF8] p-4 text-sm text-[#0D0D0D] outline-none" />
          <div className="rounded-lg border border-dashed border-black/10 bg-[#FAFAF8] p-4 text-sm text-[#6B6B6B]">This screen now uses live recipient data. Email templates and delivery logs are not configured in the current database, so fabricated history/templates have been removed.</div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#0057FF] px-5 py-3 text-sm font-bold text-[#0D0D0D]"><Send className="h-4 w-4" /> Send Email</button>
        </div>
      )}

      {activeTab === 'history' && <div className="rounded-lg border border-dashed border-black/10 bg-white p-10 text-center text-sm text-[#6B6B6B]">No email delivery log table is configured yet, so this page only shows real data once backend logging exists.</div>}
      {activeTab === 'templates' && <div className="rounded-lg border border-dashed border-black/10 bg-white p-10 text-center text-sm text-[#6B6B6B]">No email template table is configured yet. The signup verification email is sourced from the real Supabase HTML template instead of mock cards.</div>}
    </div>
  );
};