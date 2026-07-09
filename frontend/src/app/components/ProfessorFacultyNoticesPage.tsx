import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Calendar, FileText, Download, ExternalLink, Shield, Plus, UploadCloud, X, Users, Megaphone, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getNoticesForFaculty, createNotice, uploadNoticeAttachment } from '../../api/notices';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const FileUploader: React.FC<{ files: File[], onChange: (files: File[]) => void, uploading: boolean }> = ({ files, onChange, uploading }) => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onChange([...files, ...Array.from(e.dataTransfer.files)]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
          dragging ? 'border-indigo-400 dark:border-prof-accent-blue bg-indigo-50 dark:bg-prof-accent-blue-soft-bg' : 'border-gray-200 dark:border-prof-border-strong bg-gray-50 dark:bg-prof-bg-surface-raised hover:border-indigo-300 dark:hover:border-prof-accent-blue/50 hover:bg-indigo-50/50 dark:hover:bg-prof-accent-blue/5'
        }`}
      >
        <UploadCloud className={`w-7 h-7 ${dragging ? 'text-indigo-500 dark:text-prof-accent-blue' : 'text-gray-400 dark:text-prof-text-tertiary'}`} />
        <p className="text-sm font-bold text-gray-700 dark:text-prof-text-primary">
          Drag files here or <span className="text-indigo-600 dark:text-prof-accent-blue">browse</span>
        </p>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} onChange={(e) => {
          onChange([...files, ...Array.from(e.target.files || [])]);
          e.target.value = '';
        }} className="sr-only" />
        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-prof-bg-surface/80 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-prof-accent-blue" />
          </div>
        )}
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-prof-bg-surface border border-gray-100 dark:border-prof-border-subtle shadow-sm dark:shadow-none">
              <FileText className="w-4 h-4 text-indigo-500 dark:text-prof-accent-blue" />
              <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-prof-text-primary truncate min-w-0">{f.name}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, idx) => idx !== i)); }} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AttachmentCard: React.FC<{ att: any }> = ({ att }) => {
  const isImage = att.type?.startsWith('image/');
  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="group relative block w-32 h-24 rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
        <img src={att.url} alt={att.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
          <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 dark:border-prof-border-subtle bg-gray-50 dark:bg-prof-bg-surface-raised hover:bg-white dark:hover:bg-prof-bg-surface hover:border-gray-200 dark:hover:border-prof-border-strong shadow-sm dark:shadow-none transition-all group max-w-[260px]">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-100 dark:bg-prof-accent-blue/10 text-indigo-600 dark:text-prof-accent-blue">
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-900 dark:text-prof-text-primary truncate">{att.name}</p>
        <p className="text-[10px] text-gray-500 dark:text-prof-text-tertiary font-medium uppercase tracking-wider mt-0.5">Document</p>
      </div>
      <Download className="w-3.5 h-3.5 text-gray-400 dark:text-prof-text-tertiary group-hover:text-indigo-500 dark:group-hover:text-prof-accent-blue transition-colors shrink-0" />
    </a>
  );
};

export const ProfessorFacultyNoticesPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNotices = useCallback(async () => {
    setIsLoading(true);
    const { data } = await getNoticesForFaculty({ college: profile?.college });
    setNotices(data || []);
    setIsLoading(false);
  }, [profile?.college]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error('Title and content required.');
    setIsSubmitting(true);
    
    const attachments: any[] = [];
    if (files.length > 0) {
      for (const file of files) {
        const { data, error } = await uploadNoticeAttachment(file, profile?.id);
        if (error) { toast.error(`Upload failed: ${file.name}`); setIsSubmitting(false); return; }
        if (data) attachments.push(data);
      }
    }

    const { error } = await createNotice({
      authorId: profile?.id, college: profile?.college, title, content, targetYear: 'faculty', attachments, isPinned: false
    });

    setIsSubmitting(false);
    if (error) return toast.error('Publish failed.');
    
    toast.success('Shared with faculty!');
    setTitle(''); setContent(''); setFiles([]); setShowCompose(false);
    loadNotices();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-prof-bg-base px-4 py-8 md:px-8 font-sans transition-colors duration-200">
      <div className="max-w-[800px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-prof-accent-blue/10 border border-indigo-200 dark:border-prof-accent-blue/30 flex items-center justify-center text-indigo-600 dark:text-prof-accent-blue shadow-sm dark:shadow-none">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-prof-accent-blue">Restricted Access</span>
            </div>
            <h1 className="font-syne text-4xl font-extrabold text-gray-900 dark:text-prof-text-primary tracking-tight">Faculty Hub</h1>
            <p className="text-sm text-gray-500 dark:text-prof-text-secondary font-medium mt-2 max-w-lg">A private, secure space to share notices, documents, and updates exclusively with other faculty members.</p>
          </div>
          <button 
            onClick={() => setShowCompose(!showCompose)} 
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 dark:bg-prof-accent-blue text-white rounded-xl font-bold text-sm hover:bg-indigo-700 dark:hover:bg-blue-500 shadow-md dark:shadow-none transition-colors active:scale-95 whitespace-nowrap"
          >
            {showCompose ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCompose ? 'Cancel' : 'Compose Update'}
          </button>
        </div>

        {showCompose && (
          <div className="bg-white dark:bg-prof-bg-surface rounded-3xl border border-indigo-100 dark:border-prof-border-subtle shadow-[0_8px_30px_rgb(79,70,229,0.08)] dark:shadow-none overflow-hidden mb-8 transform transition-all">
            <div className="px-6 py-5 border-b border-gray-50 dark:border-prof-border-subtle bg-indigo-50/30 dark:bg-prof-bg-surface-raised/50">
              <h2 className="font-syne text-lg font-extrabold text-gray-900 dark:text-prof-text-primary">Share with Faculty</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-prof-text-tertiary uppercase tracking-wider mb-2">Topic</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full h-12 rounded-xl border border-gray-200 dark:border-prof-border-strong bg-gray-50 dark:bg-prof-bg-surface-raised px-4 text-sm font-semibold text-gray-900 dark:text-prof-text-primary outline-none focus:bg-white dark:focus:bg-prof-bg-surface focus:border-indigo-400 dark:focus:border-prof-accent-blue focus:ring-4 focus:ring-indigo-50 dark:focus:ring-prof-accent-blue/20 transition-all placeholder:text-gray-400 dark:placeholder:text-prof-text-tertiary" placeholder="e.g. Department Meeting Agenda" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-prof-text-tertiary uppercase tracking-wider mb-2">Message</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={5} className="w-full rounded-xl border border-gray-200 dark:border-prof-border-strong bg-gray-50 dark:bg-prof-bg-surface-raised px-4 py-3 text-sm font-medium text-gray-900 dark:text-prof-text-primary outline-none focus:bg-white dark:focus:bg-prof-bg-surface focus:border-indigo-400 dark:focus:border-prof-accent-blue focus:ring-4 focus:ring-indigo-50 dark:focus:ring-prof-accent-blue/20 transition-all placeholder:text-gray-400 dark:placeholder:text-prof-text-tertiary resize-none" placeholder="Write your message to the faculty..." />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-prof-text-tertiary uppercase tracking-wider mb-2">Attach Documents (Optional)</label>
                <FileUploader files={files} onChange={setFiles} uploading={isSubmitting && files.length > 0} />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl bg-indigo-600 dark:bg-prof-accent-blue hover:bg-indigo-700 dark:hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md dark:shadow-none disabled:opacity-60">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />} Securely Publish
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500 dark:text-prof-accent-blue" /></div>
        ) : notices.length === 0 ? (
          <div className="bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle p-12 text-center shadow-sm dark:shadow-none">
            <Shield className="w-10 h-10 text-gray-300 dark:text-prof-border-strong mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-prof-text-primary">No faculty updates</h2>
            <p className="text-sm text-gray-500 dark:text-prof-text-secondary mt-1">There are no internal faculty notices yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {notices.map((notice) => (
              <article key={notice.id} className="bg-white dark:bg-prof-bg-surface rounded-3xl border border-gray-100 dark:border-prof-border-subtle p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-none hover:border-indigo-100 dark:hover:border-prof-accent-blue/30 transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-syne text-xl font-extrabold text-gray-900 dark:text-prof-text-primary leading-snug mb-1.5">{notice.title}</h2>
                    {notice.author && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-prof-accent-blue bg-indigo-50 dark:bg-prof-accent-blue/10 px-2.5 py-1 rounded-full w-max">
                        <User className="w-3.5 h-3.5" />
                        {notice.author.name || 'Unknown Faculty'}
                      </div>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-50 dark:bg-prof-bg-surface-raised border border-gray-200 dark:border-prof-border-strong text-[10px] font-bold text-gray-500 dark:text-prof-text-secondary uppercase tracking-wider shrink-0">
                    <Shield className="w-3 h-3" /> Faculty Only
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-prof-text-secondary font-medium leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                {notice.attachments?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {notice.attachments.map((att: any, idx: number) => <AttachmentCard key={idx} att={att} />)}
                  </div>
                )}
                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-prof-border-subtle flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-prof-text-tertiary">
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Posted {formatDate(notice.created_at)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
