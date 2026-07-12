import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2, Mail, MapPin, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { submitContactIssue } from '../../api/contact';

export const ContactPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profile = useAuthStore((state) => state.profile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string; issueId?: string } | null>(null);
  const [hasAppliedQueryPrefill, setHasAppliedQueryPrefill] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'general',
    subject: '',
    message: '',
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: prev.name || profile?.name || '',
      email: prev.email || profile?.email || '',
    }));
  }, [profile?.name, profile?.email]);

  useEffect(() => {
    if (hasAppliedQueryPrefill) return;

    const issue = searchParams.get('issue') || '';
    const status = searchParams.get('status') || '';
    const reason = searchParams.get('reason') || '';
    const prefillEmail = searchParams.get('email') || '';
    const category = searchParams.get('category') || '';

    const allowedCategories = new Set(['general', 'account', 'payment', 'community', 'bug']);
    const nextCategory = allowedCategories.has(category) ? category : 'general';

    if (!issue && !status && !reason && !prefillEmail && !allowedCategories.has(category)) {
      setHasAppliedQueryPrefill(true);
      return;
    }

    const lines = [];
    if (issue) lines.push(`Issue Type: ${issue}`);
    if (status) lines.push(`Account Status: ${status}`);
    if (reason) lines.push(`Admin Note: ${reason}`);
    lines.push('Please describe what happened and what you want us to fix.');

    setForm((prev) => ({
      ...prev,
      email: prev.email || prefillEmail,
      category: nextCategory,
      subject: prev.subject || (issue === 'restriction' ? 'Account restriction appeal' : ''),
      message: prev.message || lines.join('\n'),
    }));
    setHasAppliedQueryPrefill(true);
  }, [hasAppliedQueryPrefill, searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitResult(null);

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Name, email and message are required.');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Submitting your issue...');

    const { data, error } = await submitContactIssue({
      user_id: profile?.id || null,
      name: form.name.trim(),
      email: form.email.trim(),
      category: form.category,
      subject: form.subject.trim() || null,
      message: form.message.trim(),
      status: 'open',
    });

    if (error) {
      const errorMessage = (error as any)?.message || 'Failed to submit issue.';
      toast.error(errorMessage, { id: loadingToast });
      setSubmitResult({
        type: 'error',
        message: errorMessage.includes('relation "contact_issues" does not exist')
          ? 'Contact system is not initialized yet. Run add_contact_issues_system.sql in Supabase SQL Editor and try again.'
          : errorMessage,
      });
      setIsSubmitting(false);
      return;
    }

    toast.success('Issue submitted successfully.', { id: loadingToast });
    setSubmitResult({
      type: 'success',
      message: 'Your issue was submitted successfully.',
      issueId: data?.id,
    });
    setForm((prev) => ({ ...prev, subject: '', message: '', category: 'general' }));
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white font-sans p-6 md:p-12 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
      <div className="max-w-5xl mx-auto relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary/70 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#FFFFFF] border border-[#ffffff1a] rounded-lg flex items-center justify-center ">
            <MessageSquare className="w-6 h-6 text-[var(--yellow)]" />
          </div>
          <h1 className="font-syne font-extrabold text-4xl md:text-6xl">Contact</h1>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6 mt-12">
          <form onSubmit={handleSubmit} className="bg-[#F8F9FF] border border-[#ffffff1a] p-8 rounded-[2rem]">
            <h3 className="font-syne font-bold text-2xl mb-2">Report a problem</h3>
            <p className="text-text-secondary/70 mb-6 text-sm">Tell us exactly what went wrong so we can help you quickly.</p>

            <div className="space-y-4">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
                className="w-full rounded-lg border border-[#ffffff1a] bg-[#0E0E0E] px-4 py-3 text-sm text-white outline-none focus:border-[var(--yellow)]"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Your email"
                className="w-full rounded-lg border border-[#ffffff1a] bg-[#0E0E0E] px-4 py-3 text-sm text-white outline-none focus:border-[var(--yellow)]"
              />
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-[#ffffff1a] bg-[#0E0E0E] px-4 py-3 text-sm text-white outline-none focus:border-[var(--yellow)]"
              >
                <option value="general">General</option>
                <option value="account">Account</option>
                <option value="payment">Payment</option>
                <option value="community">Community</option>
                <option value="bug">Bug</option>
              </select>
              <input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Subject (optional)"
                className="w-full rounded-lg border border-[#ffffff1a] bg-[#0E0E0E] px-4 py-3 text-sm text-white outline-none focus:border-[var(--yellow)]"
              />
              <textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Describe your issue in detail"
                rows={6}
                className="w-full resize-none rounded-lg border border-[#ffffff1a] bg-[#0E0E0E] px-4 py-3 text-sm text-white outline-none focus:border-[var(--yellow)]"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--yellow)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[#ffca00] disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Submit Issue
              </button>

              {submitResult && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${submitResult.type === 'success' ? 'border-[#16A34A]/40 bg-[#052e16] text-[#bbf7d0]' : 'border-[#DC2626]/40 bg-[#450a0a] text-[#fecaca]'}`}
                >
                  <p className="font-bold">{submitResult.type === 'success' ? 'Issue submitted' : 'Submission failed'}</p>
                  <p className="mt-1">{submitResult.message}</p>
                  {submitResult.issueId ? <p className="mt-1 text-xs opacity-80">Issue ID: {submitResult.issueId}</p> : null}
                </div>
              )}
            </div>
          </form>

          <div className="bg-[#F8F9FF] border border-[#ffffff1a] p-8 rounded-[2rem] hover:border-[var(--yellow)]/40 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-[#0A0F1E] flex items-center justify-center mb-6 border border-[#ffffff1a] group-hover:scale-110 transition-transform">
               <Mail className="w-6 h-6 text-[var(--yellow)]" />
            </div>
            <h3 className="font-syne font-bold text-xl mb-2">Email Us</h3>
            <p className="text-text-secondary/70 mb-4 text-sm">For support, partnerships, or just to say hi.</p>
            <a href="mailto:contactus.mayank@gmail.com" className="font-bold text-[var(--yellow)] hover:underline">contactus.mayank@gmail.com</a>

            <div className="mt-8 w-full border-t border-[#ffffff14] pt-8" />

            <div className="w-12 h-12 rounded-lg bg-[#0A0F1E] flex items-center justify-center mb-6 border border-[#ffffff1a] group-hover:scale-110 transition-transform">
               <MapPin className="w-6 h-6 text-purple-400 dark:text-purple-300 transition-colors" />
            </div>
            <h3 className="font-syne font-bold text-xl mb-2">Campus Drop-in</h3>
            <p className="text-text-secondary/70 text-sm">Find us in the library, probably debugging near the charging ports.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
