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
  softDeleteNotice,
  hardRemoveNotice,
  restoreNotice,
  getNoticesForAdmin,
  togglePinNotice,
  uploadNoticeAttachment,
} from '../../api/notices';
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
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative bg-surface rounded-3xl border border-border-subtle shadow-[0_32px_80px_rgba(0,0,0,0.15)] p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-accent-amber-soft border border-amber-100 flex items-center justify-center text-accent-amber">
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
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border-subtle bg-surface hover:bg-amber-50 hover:border-amber-200 text-left transition-all group"
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
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, onChange, uploading }) => {
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
            <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border-subtle shadow-2xs">
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
  const [isPinned, setIsPinned] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ── Published notices ────────────────────────────────────────────────────────
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // ── Pin duration modal ───────────────────────────────────────────────────────
  const [pinModalForNoticeId, setPinModalForNoticeId] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    setIsLoadingNotices(true);
    const { data, error } = await getNoticesForAdmin(profile?.college);
    if (error) {
      toast.error('Failed to load admin notices: ' + (error.message || 'Unknown error'));
      console.error('Admin notices load error:', error);
    }
    setNotices(data || []);
    setIsLoadingNotices(false);
  }, [profile?.college]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  // ── Submit new notice ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    if (!profile?.id || !profile?.college) {
      toast.error('Your profile is incomplete. Cannot post notice.');
      return;
    }

    setIsSubmitting(true);
    const attachments: any[] = [];

    if (files.length > 0) {
      setIsUploading(true);
      for (const file of files) {
        const { data, error } = await uploadNoticeAttachment(file, profile.id);
        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        }
        if (data) attachments.push(data);
      }
      setIsUploading(false);
    }

    const { error } = await createNotice({
      authorId: profile.id,
      college: profile.college,
      title: title.trim(),
      content: content.trim(),
      targetYear,
      attachments,
      isPinned,
    });

    if (error) {
      toast.error((error as any).message || 'Could not publish notice.');
      setIsSubmitting(false);
      return;
    }

    toast.success('Notice published!');
    setTitle('');
    setContent('');
    setTargetYear('all');
    setIsPinned(false);
    setFiles([]);
    setIsSubmitting(false);
    await loadNotices();
  };

  // ── Soft delete (notice admin) ───────────────────────────────────────────────
  const handleSoftDelete = async (notice: any) => {
    if (notice.is_deleted) {
      // Already deleted — restore it
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

  // (Hard remove is reserved for platform admin panel)

  // ── Pin (shows duration modal) ───────────────────────────────────────────────
  const handlePinClick = (notice: any) => {
    if (isPinnedAndActive(notice)) {
      // Already pinned — unpin immediately
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
                Managing notices for <span className="font-bold text-text-primary">{profile?.college}</span>
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
                    <FileUploader files={files} onChange={setFiles} uploading={isUploading} />
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

            {/* ── RIGHT: Published notices list ───────────────────────────── */}
            <div>
              <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="px-6 py-5 border-b border-border-subtle">
                  <h2 className="font-syne text-base font-extrabold text-text-primary">
                    Published Notices
                  </h2>
                  <p className="text-xs text-text-secondary font-medium mt-0.5">
                    {notices.length} notice{notices.length !== 1 ? 's' : ''} · click pin icon to set duration
                  </p>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-280px)] hide-scrollbar">
                  {isLoadingNotices && (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-5 h-5 animate-spin text-accent-amber" />
                    </div>
                  )}

                  {!isLoadingNotices && notices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <Megaphone className="w-8 h-8 text-text-placeholder mb-3 stroke-[1.5]" />
                      <p className="text-sm font-bold text-text-primary">No notices yet</p>
                    </div>
                  )}

                  {!isLoadingNotices && notices.map((notice) => {
                    const pinActive = isPinnedAndActive(notice);
                    const isActionLoading = actionLoadingId === notice.id;

                    return (
                      <div key={notice.id} className={`p-5 transition-colors ${notice.is_deleted ? 'bg-surface' : 'hover:bg-slate-50/50'}`}>
                        {notice.is_deleted ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                <Trash2 className="w-4 h-4 text-text-secondary/70" />
                              </div>
                              <p className="text-sm text-text-secondary font-medium italic truncate">
                                This message is deleted by admin
                              </p>
                            </div>
                            <button
                              type="button"
                              title="Restore notice"
                              onClick={() => handleSoftDelete(notice)}
                              disabled={isActionLoading}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-accent-green/15 text-accent-green hover:bg-emerald-100 shrink-0"
                            >
                              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {pinActive && <Pin className="w-3 h-3 text-accent-amber fill-amber-600 shrink-0" />}
                                <h3 className="font-syne text-sm font-bold leading-snug truncate text-text-primary">
                                  {notice.title}
                                </h3>
                              </div>

                              <p className="text-xs text-text-secondary font-medium line-clamp-2 mt-0.5">
                                {notice.content}
                              </p>

                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 text-[10px] text-text-secondary font-medium">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(notice.created_at)}
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary text-[10px] font-bold">
                                  {yearLabel(notice.target_year)}
                                </span>
                                {pinActive && notice.pin_expires_at && (
                                  <span className="px-2 py-0.5 rounded-full bg-accent-amber-soft text-accent-amber text-[10px] font-bold border border-amber-100">
                                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                                    Expires {new Date(notice.pin_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                title={pinActive ? 'Unpin notice' : 'Pin notice (set duration)'}
                                onClick={() => handlePinClick(notice)}
                                disabled={isActionLoading}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
                                  pinActive ? 'bg-accent-amber-soft text-accent-amber hover:bg-amber-100' : 'bg-surface-elevated text-text-secondary hover:bg-slate-200'
                                }`}
                              >
                                {isActionLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : pinActive ? (
                                  <PinOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Pin className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                title="Soft-delete (shows placeholder)"
                                onClick={() => handleSoftDelete(notice)}
                                disabled={isActionLoading}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 bg-surface-elevated text-text-secondary hover:bg-rose-50 hover:text-rose-600"
                              >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
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
                    <strong>Soft-delete</strong> shows "This message has been deleted" to students.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent-amber-soft border border-amber-100">
                  <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
                  <p className="text-[11px] text-accent-amber font-medium leading-relaxed">
                    Notices are only visible to students at <strong>{profile?.college}</strong> matching the target year.
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
