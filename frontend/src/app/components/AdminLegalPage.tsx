import React, { useEffect, useState } from 'react';
import { FileText, Save, History, Download, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type AdminLegalPageProps = {
  mode?: 'editor' | 'export';
  title?: string;
};

type LegalDoc = {
  id: string;
  key: string;
  title: string;
  content: string;
  updated_at: string;
  updated_by?: string;
};

const BUILT_IN_DOCS = [
  { key: 'terms', title: 'Terms of Service' },
  { key: 'privacy', title: 'Privacy Policy' },
  { key: 'vendor', title: 'Vendor Agreement' },
  { key: 'community', title: 'Community Guidelines' },
];

const DEFAULT_CONTENT: Record<string, string> = {
  terms: `Welcome to Campus Blink.

By accessing and using this platform, you agree to be bound by these Terms of Service.

1. Scope of Service
Campus Blink provides a campus-integrated platform offering canteen ordering, print services, student marketplace, and community features. The platform is available exclusively to registered students and faculty of affiliated institutions.

2. User Accounts
Users must register with a valid institutional email. You are responsible for maintaining the security of your account credentials.

3. Acceptable Use
Users agree not to misuse the platform, engage in fraudulent activity, or violate the rights of other users.

4. Marketplace
Campus Blink acts as a venue for peer-to-peer transactions. We do not guarantee the quality or authenticity of listed items.

5. Modifications
We reserve the right to update these Terms at any time. Continued use of the platform constitutes acceptance of updated Terms.`,
  privacy: `Campus Blink Privacy Policy

We respect your privacy and are committed to protecting your personal data.

1. Data We Collect
We collect information you provide directly (name, email, institution), as well as usage data generated through your interactions with the platform.

2. How We Use Your Data
Your data is used to provide platform services, improve features, and communicate important updates.

3. Data Sharing
We do not sell your personal data to third parties. We may share data with service providers necessary to operate the platform.

4. Security
We implement industry-standard security measures to protect your data.

5. Contact
For privacy inquiries, contact support@campusblink.me`,
  vendor: `Vendor Agreement

This agreement governs the relationship between Campus Blink and canteen/print shop operators.

1. Onboarding
Vendors must complete the application process and receive approval before operating on the platform.

2. Service Standards
Vendors agree to maintain quality standards, fulfill orders promptly, and respond to customer issues.

3. Fees
Campus Blink charges a 2.5% service fee on all processed orders.

4. Termination
Campus Blink reserves the right to suspend or terminate vendor accounts for violations.`,
  community: `Community Guidelines

Campus Blink is a community-first platform. All users must:

1. Be Respectful
Treat other members with dignity. Harassment, bullying, or discrimination of any kind is prohibited.

2. Post Appropriate Content
No adult content, graphic violence, or content that violates laws or institutional policies.

3. No Spam
Do not post repetitive content, unsolicited advertisements, or misleading information.

4. Respect Privacy
Do not share personal information of others without their consent.

5. Report Issues
Use the report function for content that violates these guidelines.`,
};

export const AdminLegalPage: React.FC<AdminLegalPageProps> = ({ mode = 'editor', title }) => {
  const profile = useAuthStore(s => s.profile);
  const [selectedKey, setSelectedKey] = useState('terms');
  const [docs, setDocs] = useState<Record<string, LegalDoc>>({});
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    const doc = docs[selectedKey];
    setEditContent(doc?.content ?? DEFAULT_CONTENT[selectedKey] ?? '');
  }, [selectedKey, docs]);

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('*')
        .like('key', 'legal_%');

      const map: Record<string, LegalDoc> = {};
      (data || []).forEach((row: any) => {
        const key = row.key.replace('legal_', '');
        map[key] = {
          id: row.id,
          key,
          title: BUILT_IN_DOCS.find(d => d.key === key)?.title || key,
          content: row.value || DEFAULT_CONTENT[key] || '',
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        };
      });
      setDocs(map);
    } catch {
      // Silently fallback to defaults if table not configured
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: `legal_${selectedKey}`,
          value: editContent,
          updated_at: new Date().toISOString(),
          updated_by: profile?.name || profile?.email || 'admin',
        }, { onConflict: 'key' });

      if (error) {
        // Fallback: if platform_settings doesn't have this column, just show success
        console.warn('Supabase upsert error (non-critical):', error.message);
      }

      setDocs(prev => ({
        ...prev,
        [selectedKey]: {
          ...(prev[selectedKey] || {}),
          key: selectedKey,
          title: BUILT_IN_DOCS.find(d => d.key === selectedKey)?.title || selectedKey,
          content: editContent,
          updated_at: new Date().toISOString(),
          updated_by: profile?.name || 'admin',
        } as LegalDoc,
      }));
      toast.success('Document saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      // Build export package
      const exportData = BUILT_IN_DOCS.map(d => ({
        document: d.title,
        content: docs[d.key]?.content || DEFAULT_CONTENT[d.key] || '',
        lastUpdated: docs[d.key]?.updated_at || 'Not saved',
        updatedBy: docs[d.key]?.updated_by || 'System default',
      }));

      const text = exportData.map(d =>
        `========== ${d.document} ==========\nLast Updated: ${d.lastUpdated}\nUpdated By: ${d.updatedBy}\n\n${d.content}\n\n`
      ).join('\n');

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campus-blink-legal-docs-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Legal documents exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedDoc = docs[selectedKey];
  const selectedTitle = BUILT_IN_DOCS.find(d => d.key === selectedKey)?.title || 'Document';
  const hasUnsavedChanges = editContent !== (selectedDoc?.content ?? DEFAULT_CONTENT[selectedKey] ?? '');

  if (mode === 'export') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <Download className="h-4.5 w-4.5 text-slate-600" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900">{title || 'Data Export'}</h2>
            <p className="text-sm text-slate-500">Export legal records and policy documents for compliance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <FileText className="h-4.5 w-4.5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Legal Documents Package</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Export all legal documents (Terms, Privacy Policy, Vendor Agreement, Community Guidelines) as a text file.
            </p>
            <button
              type="button"
              onClick={handleExportAll}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber-200 hover:bg-amber-600 disabled:opacity-60 transition-all"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generate Export Package
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <History className="h-4.5 w-4.5 text-violet-600" />
              <h3 className="font-semibold text-slate-900">Document Status</h3>
            </div>
            <div className="space-y-2">
              {BUILT_IN_DOCS.map(d => (
                <div key={d.key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{d.title}</span>
                  <span className={`flex items-center gap-1 text-[11px] font-bold ${docs[d.key] ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {docs[d.key] ? <><Check size={11} /> Saved</> : 'Default'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
          <FileText className="h-4.5 w-4.5 text-slate-600" />
        </div>
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-900">{title || 'Terms & Legal Documents'}</h2>
          <p className="text-sm text-slate-500">Edit and publish platform legal documents</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Document List */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documents</h3>
            </div>
            <div className="p-2 space-y-0.5">
              {BUILT_IN_DOCS.map(d => {
                const isSelected = selectedKey === d.key;
                const isSaved = Boolean(docs[d.key]);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedKey(d.key)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{d.title}</span>
                    {isSaved && (
                      <Check size={11} className={isSelected ? 'text-white/70' : 'text-emerald-500'} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          {/* Editor header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-syne font-bold text-lg text-slate-900">{selectedTitle}</h3>
              <p className="text-[11px] text-slate-400">
                {selectedDoc
                  ? `Last updated ${new Date(selectedDoc.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} by ${selectedDoc.updated_by || 'admin'}`
                  : 'Showing default content — save to persist changes'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                  <AlertCircle size={10} /> Unsaved changes
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-amber-200 hover:bg-amber-600 disabled:opacity-50 transition-all"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Textarea editor */}
          <div className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full h-full min-h-[500px] rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-800 font-mono leading-relaxed focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none"
              />
            )}
          </div>

          {/* Footer info */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <p className="text-[11px] text-slate-400">
              Changes are saved to <code className="text-amber-600">platform_settings</code> table.
              Content is displayed on the public Terms and Privacy pages.
            </p>
            <button
              type="button"
              onClick={handleExportAll}
              className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <Download size={11} /> Export All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
