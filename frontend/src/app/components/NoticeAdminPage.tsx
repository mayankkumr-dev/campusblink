import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  Loader2,
  Megaphone,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Trash2,
  UploadCloud,
  X,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  createNotice,
  uploadNoticeAttachment,
} from '../../api/notices';
import { FileProgressBar } from '../../shared/components/UploadOverlay';
import toast from 'react-hot-toast';

// ─── Constants ─────────────────────────────────────────────────────────────────

const YEAR_OPTIONS = [
  { value: 'all', label: 'All Students', color: 'bg-surface-elevated text-text-primary border-border-subtle' },
  { value: '1st Year', label: '1st Year', color: 'bg-accent-blue-soft text-blue-700 border-accent-blue-soft' },
  { value: '2nd Year', label: '2nd Year', color: 'bg-accent-purple/15 text-purple-700 border-purple-200' },
  { value: '3rd Year', label: '3rd Year', color: 'bg-accent-green/15 text-accent-green border-emerald-200' },
  { value: '4th Year', label: '4th Year', color: 'bg-accent-amber-soft text-accent-amber border-accent-amber-soft' },
];

const PIN_DURATION_OPTIONS = [
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 24 * 7 },
  { label: '30 Days', hours: 24 * 30 },
];

const ACCEPTED_TYPES =
  'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

function getFileIcon(type: string) {
  if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 transition-colors" />;
  return <FileText className="w-4 h-4 text-accent-red" />;
}


// ─── Drag & Drop File Uploader ─────────────────────────────────────────────────

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  uploading: boolean;
  /** Per-file upload progress: index → 0-100 | 'done' | 'error' */
  fileProgress?: Record<number, number | 'done' | 'error'>;
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, onChange, uploading, fileProgress = {} }) => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onChange([...files, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange([...files, ...Array.from(e.target.files || [])]);
    e.target.value = '';
  };

  const removeFile = (index: number) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
          dragging ? 'border-amber-400 bg-accent-amber-soft' : 'border-border-subtle bg-slate-50/60 hover:border-amber-300 hover:bg-amber-50/40'
        }`}
      >
        <UploadCloud className={`w-7 h-7 ${dragging ? 'text-accent-amber' : 'text-text-secondary/70'}`} />
        <p className="text-sm font-bold text-text-primary">
          Drag files here or <span className="text-accent-amber">click to browse</span>
        </p>
        <p className="text-[11px] text-text-secondary font-medium text-center">
          PDFs, images, Word, Excel — up to 25 MB each
        </p>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} onChange={handleFileInput} className="sr-only" />
        {uploading && (
          <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent-amber" />
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border-subtle shadow-2xs">
                {getFileIcon(file.type)}
                <span className="flex-1 text-xs font-semibold text-text-primary truncate min-w-0">{file.name}</span>
                <span className="text-[10px] text-text-secondary/70 font-medium shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-rose-50 text-text-secondary/70 hover:text-rose-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <FileProgressBar
                progress={typeof fileProgress[idx] === 'number' ? fileProgress[idx] as number : 0}
                done={fileProgress[idx] === 'done'}
                error={fileProgress[idx] === 'error'}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Notice Admin Panel ────────────────────────────────────────────────────────

export const NoticeAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);

  // Guard
  useEffect(() => {
    if (profile && !profile.is_notice_admin && profile.role !== 'admin') {
      navigate('/student/notices', { replace: true });
    }
  }, [profile, navigate]);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetYear, setTargetYear] = useState('all');
  const [targetCollege, setTargetCollege] = useState('All');
  const [isPinned, setIsPinned] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  /** Per-file upload progress: idx → 0-100 | 'done' | 'error' */
  const [fileProgress, setFileProgress] = useState<Record<number, number | 'done' | 'error'>>({});

  // ── Submit new notice ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim() && files.length === 0) {
      toast.error('You must provide a title, content, or an attachment.');
      return;
    }
    if (!profile?.id || !profile?.college) {
      toast.error('Your profile is incomplete. Cannot post notice.');
      return;
    }

    setIsSubmitting(true);
    const attachments: any[] = [];
    setFileProgress({});

    if (files.length > 0) {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileProgress((prev) => ({ ...prev, [i]: 0 }));

        const { data, error } = await uploadNoticeAttachment(file, profile.id, {
          onProgress: (percent: number) => {
            setFileProgress((prev) => ({ ...prev, [i]: percent }));
          },
        });

        if (error) {
          setFileProgress((prev) => ({ ...prev, [i]: 'error' }));
          toast.error(
            (error as any).message?.includes('paused') || (error as any).message?.includes('connection')
              ? 'Upload paused. Check your connection.'
              : `Failed to upload ${file.name}`
          );
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        }

        if (data) {
          attachments.push(data);
          setFileProgress((prev) => ({ ...prev, [i]: 'done' }));
        }
      }
      setIsUploading(false);
    }

    const { data, error } = await createNotice({
      authorId: profile.id,
      college: profile.role === 'admin' ? targetCollege : profile.college,
      title: title.trim(),
      content: content.trim(),
      targetYear,
      attachments,
      isPinned,
    });

    if (error || !data) {
      toast.error((error as any).message || 'Could not publish notice.');
      setIsSubmitting(false);
      return;
    }

    toast.success('Notice published!');

    // ── Broadcast FCM push to all targeted students ────────────────────────
    // Fire-and-forget: errors here must NOT block the UI success flow.
    try {
      const token = await import('../../lib/supabase').then(m => m.getStandardClerkToken());
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      fetch(`${backendUrl}/api/push/broadcast-notice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          noticeId: data.id,
          title: data.title || title.trim(),
          college: profile.role === 'admin' ? targetCollege : profile.college,
          targetYear,
        }),
      }).catch((err) => console.warn('[notices] broadcast-notice call failed:', err));
    } catch (broadcastErr) {
      console.warn('[notices] Could not queue push broadcast:', broadcastErr);
    }

    setTitle('');
    setContent('');
    setTargetYear('all');
    setIsPinned(false);
    setFiles([]);
    setFileProgress({});
    setIsSubmitting(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>

      <div className="min-h-full bg-slate-50/40 px-4 py-6 md:px-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => navigate('/student/notices')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-text-secondary hover:bg-surface-elevated text-xs font-bold transition-all shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <h1 className="font-syne text-xl font-extrabold text-text-primary tracking-tight">
                  Notice Admin Panel
                </h1>
              </div>
              <p className="text-xs text-text-secondary font-medium mt-0.5">
                {profile?.role === 'admin' ? (
                  <>Publishing as <span className="font-bold text-text-primary">Super Admin</span></>
                ) : (
                  <>Managing notices for <span className="font-bold text-text-primary">{profile?.college}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT: Compose form ──────────────────────────────────────── */}
            <div>
              <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="px-6 py-5 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-accent-amber" />
                    <h2 className="font-syne text-base font-extrabold text-text-primary">Compose Notice</h2>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      Notice Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Mid-term Examination Schedule"
                      required
                      className="w-full h-11 rounded-xl border border-border-subtle bg-surface px-4 text-sm font-semibold text-text-primary outline-none focus:bg-surface focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      Notice Content
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write the full content of the notice here..."
                      required
                      rows={7}
                      className="w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm font-medium text-text-primary outline-none focus:bg-surface focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Super Admin College Selector */}
                  {profile?.role === 'admin' && (
                    <div>
                      <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-1.5">
                        Target College
                      </label>
                      <select
                        value={targetCollege}
                        onChange={(e) => setTargetCollege(e.target.value)}
                        className="w-full h-11 rounded-xl border border-border-subtle bg-surface px-4 text-sm font-semibold text-text-primary outline-none focus:bg-surface focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer"
                      >
                        <option value="All">All Colleges</option>
                        <option value="Maharaja Agrasen Institute of Technology (MAIT)">Maharaja Agrasen Institute of Technology (MAIT)</option>
                      </select>
                    </div>
                  )}

                  {/* Target Year */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-2">
                      Target Audience
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {YEAR_OPTIONS.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setTargetYear(opt.value)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                            targetYear === opt.value
                              ? 'ring-2 ring-amber-500 ring-offset-1 ' + opt.color
                              : 'bg-surface border-border-subtle text-text-secondary hover:border-slate-300'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-2">
                      Attachments (optional)
                    </label>
                    <FileUploader files={files} onChange={setFiles} uploading={isUploading} fileProgress={fileProgress} />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                    ) : (
                      <><Megaphone className="w-4 h-4" /> Publish Notice</>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* ── RIGHT: Published notices redirect ───────────────────────────── */}
            <div>
              <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden p-6 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 mx-auto flex items-center justify-center text-amber-600 mb-4">
                  <Megaphone className="w-8 h-8" />
                </div>
                <h2 className="font-syne text-xl font-extrabold text-text-primary mb-2">
                  Manage Published Notices
                </h2>
                <p className="text-sm text-text-secondary font-medium mb-6">
                  View, pin, and delete published notices. You can also filter them by target year.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/student/notices/admin/published')}
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  View Published Notices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
