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
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  createNotice,
  softDeleteNotice,
  hardRemoveNotice,
  restoreNotice,
  getNoticesForAdmin,
  togglePinNotice,
  uploadNoticeAttachment,
} from '../../api/notices';
import { FileProgressBar } from '../../shared/components/UploadOverlay';
import toast from 'react-hot-toast';

// ─── Constants ─────────────────────────────────────────────────────────────────

const YEAR_OPTIONS = [
  { value: 'all', label: 'All Students', color: 'bg-surface-elevated text-text-primary border-border-subtle' },
  { value: '1st Year', label: '1st Year', color: 'bg-accent-blue-soft text-blue-700 dark:text-blue-300 border-accent-blue-soft' },
  { value: '2nd Year', label: '2nd Year', color: 'bg-accent-purple/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/40' },
  { value: '3rd Year', label: '3rd Year', color: 'bg-accent-green/15 text-accent-green border-emerald-200 dark:border-emerald-900/40' },
  { value: '4th Year', label: '4th Year', color: 'bg-accent-amber-soft text-accent-amber border-accent-amber-soft' },
];

const PIN_DURATION_OPTIONS = [
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 24 * 7 },
  { label: '30 Days', hours: 24 * 30 },
];

const ACCEPTED_TYPES =
  'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function yearLabel(year: string) {
  if (year === 'all') return 'All Students';
  return year;
}

function isPinnedAndActive(notice: any): boolean {
  if (!notice.is_pinned) return false;
  if (!notice.pin_expires_at) return true;
  return new Date(notice.pin_expires_at) > new Date();
}

function getFileIcon(type: string) {
  if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 transition-colors" />;
  return <FileText className="w-4 h-4 text-accent-red" />;
}

// ─── Pin Duration Modal ───────────────────────────────────────────────────────

interface PinDurationModalProps {
  onConfirm: (expiresAt: Date) => void;
  onCancel: () => void;
}

const PinDurationModal: React.FC<PinDurationModalProps> = ({ onConfirm, onCancel }) => {
  const handleSelect = (hours: number) => {
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    onConfirm(expiresAt);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative bg-surface rounded-3xl border border-border-subtle shadow-[0_32px_80px_rgba(0,0,0,0.15)] p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-accent-amber-soft border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-accent-amber">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <h3 className="font-syne text-lg font-extrabold text-text-primary">
            Choose pin duration
          </h3>
        </div>
        <p className="text-xs text-text-secondary font-medium mb-5 ml-12">
          You can unpin at any time
        </p>

        <div className="space-y-2.5">
          {PIN_DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              type="button"
              onClick={() => handleSelect(opt.hours)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border-subtle bg-surface hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left transition-all group"
            >
              <span className="text-sm font-bold text-text-primary group-hover:text-accent-amber">
                {opt.label}
              </span>
              <Pin className="w-4 h-4 text-text-secondary/70 group-hover:text-amber-600 transition-colors" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-surface-elevated transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─── Drag & Drop File Uploader ─────────────────────────────────────────────────

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  uploading: boolean;
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
      {/* ── DESKTOP VIEWPORT ── */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`hidden md:flex relative rounded-2xl border-2 border-dashed p-6 flex-col items-center gap-2 cursor-pointer transition-all ${
          dragging ? 'border-amber-400 bg-accent-amber-soft' : 'border-border-subtle bg-slate-50/60 dark:bg-surface-elevated/40 hover:border-amber-300'
        }`}
      >
        <UploadCloud className={`w-7 h-7 ${dragging ? 'text-accent-amber' : 'text-text-secondary/70'}`} />
        <p className="text-sm font-bold text-text-primary">
          Drag files here or <span className="text-accent-amber">click to browse</span>
        </p>
        <p className="text-[11px] text-text-secondary font-medium text-center">
          PDFs, images, Word, Excel — up to 25 MB each
        </p>
        {uploading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-surface/80 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent-amber" />
          </div>
        )}
      </div>

      {/* ── MOBILE VIEWPORT ── */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`md:hidden relative w-full rounded-xl border border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-elevated hover:bg-slate-100 dark:hover:bg-surface p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm dark:shadow-none ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
        ) : (
          <UploadCloud className="w-4 h-4 text-slate-500 dark:text-text-secondary" />
        )}
        <span className="text-xs font-bold text-slate-700 dark:text-text-primary">
          {uploading ? 'Uploading...' : 'Attach documents or images'}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        onChange={handleFileInput}
        className="hidden"
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const progress = fileProgress[i];

            return (
              <div key={i} className="flex flex-col gap-3 p-3 rounded-2xl bg-surface border border-border-subtle shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(file.type)}
                    <span className="text-xs font-bold text-text-primary truncate">{file.name}</span>
                    <span className="text-[10px] text-text-secondary font-semibold shrink-0">
                      ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  </div>

                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="p-1 rounded-lg text-text-secondary hover:text-accent-red hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {file.type.startsWith('image/') && (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-auto max-h-80 object-contain rounded-xl border border-gray-100 bg-gray-50"
                  />
                )}

                {uploading && progress !== undefined && progress !== 'done' && (
                  <FileProgressBar
                    progress={typeof progress === 'number' ? progress : 0}
                    error={progress === 'error'}
                    done={false}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── AdminNoticesPage Main Component ──────────────────────────────────────────

export const AdminNoticesPage: React.FC = () => {
  const { profile } = useAuthStore() as any;
  const navigate = useNavigate();

  const [notices, setNotices] = useState<any[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetYear, setTargetYear] = useState('all');
  const [isPinned, setIsPinned] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState<Record<number, number | 'done' | 'error'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actions loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal for duration pin selection
  const [pinModalForNoticeId, setPinModalForNoticeId] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    setIsLoadingNotices(true);
    const { data } = await getNoticesForAdmin();
    if (data) setNotices(data);
    setIsLoadingNotices(false);
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // ── Form Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim() && files.length === 0) {
      toast.error('You must provide a title, content, or an attachment.');
      return;
    }

    setIsSubmitting(true);

    const attachments: any[] = [];
    if (files.length > 0) {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileProgress((prev) => ({ ...prev, [i]: 10 }));
        const { data, error } = await uploadNoticeAttachment(file);
        if (error || !data) {
          setFileProgress((prev) => ({ ...prev, [i]: 'error' }));
          toast.error(`Failed to upload ${file.name}`);
        } else {
          setFileProgress((prev) => ({ ...prev, [i]: 'done' }));
          attachments.push(data);
        }
      }
      setIsUploading(false);
    }

    const { data, error } = await createNotice({
      title: title.trim(),
      content: content.trim(),
      targetYear,
      isPinned,
      attachments,
      authorId: profile?.id,
      college: 'All',
    });

    if (error || !data) {
      toast.error('Failed to publish notice. Please try again.');
      setIsSubmitting(false);
      return;
    }

    toast.success('Notice published successfully!');

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
          content: data.content || content.trim(),
          college: 'All',
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
    await loadNotices();
  };


  // ── Soft delete ─────────────────────────────────────────────────────────────
  const handleSoftDelete = async (notice: any) => {
    if (notice.is_deleted) {
      setActionLoadingId(notice.id);
      const { error } = await restoreNotice(notice.id);
      setActionLoadingId(null);
      if (error) { toast.error('Failed to restore notice.'); return; }
      toast.success('Notice restored.');
      setNotices((prev) => prev.map((n) => n.id === notice.id ? { ...n, is_deleted: false } : n));
      return;
    }

    if (!window.confirm('Delete this notice? Students will see "This message has been deleted" in its place.')) return;
    setActionLoadingId(notice.id);
    const { error } = await softDeleteNotice(notice.id, profile?.id);
    setActionLoadingId(null);
    if (error) { toast.error('Failed to delete notice.'); return; }
    toast.success('Notice deleted. Students see the deletion placeholder.');
    setNotices((prev) => prev.map((n) => n.id === notice.id ? { ...n, is_deleted: true } : n));
  };

  // ── Hard remove ─────────────────────────────────────────────────────────────
  const handleHardRemove = async (noticeId: string) => {
    if (!window.confirm('Permanently remove this notice? Students will see nothing at all — the deletion message will vanish too.')) return;
    setActionLoadingId(noticeId);
    const { error } = await hardRemoveNotice(noticeId);
    setActionLoadingId(null);
    if (error) { toast.error('Failed to hard-remove notice.'); return; }
    toast.success('Notice fully removed. It is now invisible to all students.');
    setNotices((prev) => prev.filter((n) => n.id !== noticeId));
  };

  // ── Pin ──────────────────────────────────────────────────────────────────────
  const handlePinClick = (notice: any) => {
    if (isPinnedAndActive(notice)) {
      handleUnpin(notice.id);
    } else {
      setPinModalForNoticeId(notice.id);
    }
  };

  const handleUnpin = async (noticeId: string) => {
    setActionLoadingId(noticeId);
    const { error } = await togglePinNotice(noticeId, false, null);
    setActionLoadingId(null);
    if (error) { toast.error('Failed to unpin.'); return; }
    setNotices((prev) => prev.map((n) => n.id === noticeId ? { ...n, is_pinned: false, pin_expires_at: null } : n));
  };

  const handlePinWithDuration = async (expiresAt: Date) => {
    if (!pinModalForNoticeId) return;
    const noticeId = pinModalForNoticeId;
    setPinModalForNoticeId(null);
    setActionLoadingId(noticeId);
    const { error } = await togglePinNotice(noticeId, true, expiresAt);
    setActionLoadingId(null);
    if (error) { toast.error('Failed to pin notice.'); return; }
    toast.success(`Notice pinned until ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
    setNotices((prev) =>
      prev.map((n) => n.id === noticeId
        ? { ...n, is_pinned: true, pin_expires_at: expiresAt.toISOString() }
        : n
      )
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Pin Duration Modal */}
      {pinModalForNoticeId && (
        <PinDurationModal
          onConfirm={handlePinWithDuration}
          onCancel={() => setPinModalForNoticeId(null)}
        />
      )}

      <div className="min-h-full bg-background text-text-primary px-4 py-6 pb-12 md:px-6 md:py-8 transition-colors">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => navigate('/student/notices')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-text-secondary hover:bg-surface-elevated text-xs font-bold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <h1 className="font-syne text-xl font-extrabold text-text-primary tracking-tight">
                  Super Admin Notices
                </h1>
              </div>
              <p className="text-xs text-text-secondary font-medium mt-0.5">
                Managing notices across <span className="font-bold text-text-primary">All Colleges</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT: Compose form ──────────────────────────────────────── */}
            <div>
              <div className="bg-surface rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
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
                      className="w-full h-11 rounded-xl border border-border-subtle bg-surface-elevated px-4 text-sm font-semibold text-text-primary outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-text-placeholder"
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
                      rows={7}
                      className="w-full rounded-xl border border-border-subtle bg-surface-elevated px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-text-placeholder resize-none leading-relaxed"
                    />
                  </div>

                  {/* Target Year */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary uppercase tracking-wider mb-2">
                      Target Audience
                    </label>
                    <div className="flex md:flex-wrap gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-2 px-2 md:mx-0 md:px-0">
                      {YEAR_OPTIONS.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setTargetYear(opt.value)}
                          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[11px] md:text-xs font-bold transition-all shadow-sm ${
                            targetYear === opt.value
                              ? 'ring-2 ring-amber-500 ring-offset-1 ' + opt.color
                              : 'bg-surface border-border-subtle text-text-secondary hover:border-slate-300 dark:hover:border-border-subtle hover:text-text-primary'
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

                  {/* Action Dock (Desktop inline, Mobile sticky bottom) */}
                  <div className="md:block hidden">
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
                  </div>
                  <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-border-subtle shadow-lg z-40 pb-safe transition-colors">
                    <button
                      type="submit"
                      disabled={isSubmitting || isUploading}
                      className="w-full h-12 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                      ) : (
                        <><Megaphone className="w-4 h-4" /> Publish Notice</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* ── RIGHT: Published notices list ───────────────────────────── */}
            <div>
              <div className="bg-surface rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border-subtle">
                  <h2 className="font-syne text-base font-extrabold text-text-primary">
                    Published Notices
                  </h2>
                  <p className="text-xs text-text-secondary font-medium mt-0.5">
                    {notices.length} notice{notices.length !== 1 ? 's' : ''} · click pin icon to set duration
                  </p>
                </div>

                <div className="flex md:block flex-row overflow-x-auto md:overflow-x-visible snap-x snap-mandatory gap-3 p-4 md:p-0 md:divide-y md:divide-border-subtle md:max-h-[calc(100vh-280px)] md:overflow-y-auto hide-scrollbar -mx-4 md:mx-0 transition-colors">
                  {isLoadingNotices && (
                    <div className="flex items-center justify-center py-10 md:py-20 w-full shrink-0 snap-center">
                      <Loader2 className="w-5 h-5 animate-spin text-accent-amber" />
                    </div>
                  )}

                  {!isLoadingNotices && notices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 md:py-16 text-center px-6 w-full shrink-0 snap-center border border-border-subtle rounded-2xl md:border-0 md:rounded-none transition-colors">
                      <Megaphone className="w-8 h-8 text-text-secondary mb-3 stroke-[1.5] transition-colors" />
                      <p className="text-sm font-bold text-text-primary transition-colors">No notices yet</p>
                    </div>
                  )}

                  {!isLoadingNotices && notices.map((notice) => {
                    const pinActive = isPinnedAndActive(notice);
                    const isActionLoading = actionLoadingId === notice.id;

                    return (
                      <div key={notice.id} className={`w-[85vw] md:w-auto shrink-0 snap-center rounded-2xl md:rounded-none border border-border-subtle md:border-0 p-4 md:p-5 transition-colors bg-surface ${notice.is_deleted ? 'opacity-80' : 'md:hover:bg-surface-elevated/50'}`}>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 h-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {pinActive && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 dark:text-amber-400 transition-colors" />}
                              {notice.is_deleted && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-extrabold uppercase tracking-wider">
                                  Deleted
                                </span>
                              )}
                              <h3 className={`font-syne text-[13px] md:text-sm font-bold leading-snug line-clamp-2 transition-colors ${notice.is_deleted ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                {notice.title}
                              </h3>
                            </div>

                            {!notice.is_deleted && (
                              <p className="text-[11px] md:text-xs text-text-secondary font-medium line-clamp-2 mt-1 mb-2">
                                {notice.content}
                              </p>
                            )}

                            <div className="flex items-center gap-2 flex-wrap mt-auto pt-2">
                              <div className="flex items-center gap-1 text-[9px] text-text-secondary font-bold uppercase tracking-wider">
                                <Calendar className="w-3 h-3" />
                                {formatDate(notice.created_at)}
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary text-[9px] font-extrabold uppercase tracking-wider border border-border-subtle">
                                {yearLabel(notice.target_year)}
                              </span>
                              {pinActive && notice.pin_expires_at && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold uppercase tracking-wider border border-amber-100 dark:border-amber-900/40">
                                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                                  Exp {new Date(notice.pin_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>

                            {/* Author & Deleter visibility */}
                            <div className="mt-3 p-2 rounded-xl bg-surface-elevated/50 border border-border-subtle text-[9px] font-semibold text-text-secondary flex flex-col gap-1 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5 truncate">
                                <User className="w-3 h-3 text-text-secondary" />
                                <span className="font-extrabold text-text-primary">By:</span> {notice.author?.name || notice.author?.email || 'Unknown'}
                              </div>
                              {notice.is_deleted && notice.deleted_by && (
                                <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 truncate">
                                  <Trash2 className="w-3 h-3" />
                                  <span className="font-extrabold">Del:</span> {notice.deleted_by?.name || notice.deleted_by?.email || 'Unknown'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 md:flex-col pt-3 border-t border-border-subtle md:pt-0 md:border-0 mt-3 md:mt-0 transition-colors">
                            {/* Pin / Unpin button */}
                            {!notice.is_deleted && (
                              <button
                                type="button"
                                title={pinActive ? 'Unpin notice' : 'Pin notice (set duration)'}
                                onClick={() => handlePinClick(notice)}
                                disabled={isActionLoading}
                                className={`flex-1 md:flex-none h-8 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 text-[10px] font-bold gap-1 ${
                                  pinActive ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                {isActionLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : pinActive ? (
                                  <><PinOff className="w-3.5 h-3.5" /><span className="md:hidden">Unpin</span></>
                                ) : (
                                  <><Pin className="w-3.5 h-3.5" /><span className="md:hidden">Pin</span></>
                                )}
                              </button>
                            )}

                            {/* Soft delete / Restore */}
                            <button
                              type="button"
                              title={notice.is_deleted ? 'Restore notice' : 'Soft-delete (shows placeholder)'}
                              onClick={() => handleSoftDelete(notice)}
                              disabled={isActionLoading}
                              className={`flex-1 md:flex-none h-8 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 text-[10px] font-bold gap-1 ${
                                notice.is_deleted
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-surface-elevated text-text-secondary hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              }`}
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : notice.is_deleted ? (
                                <><RotateCcw className="w-3.5 h-3.5" /><span className="md:hidden">Restore</span></>
                              ) : (
                                <><Trash2 className="w-3.5 h-3.5" /><span className="md:hidden">Delete</span></>
                              )}
                            </button>

                            {/* Hard remove */}
                            <button
                              type="button"
                              title="Permanently remove"
                              onClick={() => handleHardRemove(notice.id)}
                              disabled={isActionLoading}
                              className="flex-1 md:flex-none h-8 md:w-8 md:h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-50 text-[10px] font-bold gap-1"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><X className="w-3.5 h-3.5" /><span className="md:hidden">Remove</span></>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-surface border border-border-subtle">
                  <Trash2 className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                    <strong className="text-text-primary">Soft-delete</strong> shows "This message has been deleted" to students.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
                    <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                      <strong>Hard remove</strong> (red X) fully erases the notice — no placeholder is shown. Platform admin only.
                    </p>
                </div>
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                    Notices are only visible to students at <strong>All Colleges</strong> matching the target year.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
