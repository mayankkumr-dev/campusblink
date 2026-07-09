import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, FileText, ImageIcon, Loader2, Megaphone, Pin, PinOff,
  Plus, RotateCcw, Trash2, UploadCloud, X, Users, Calendar, AlertTriangle, Clock
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  createNotice, softDeleteNotice, restoreNotice, getNoticesForAdmin,
  togglePinNotice, uploadNoticeAttachment,
} from '../../api/notices';
import toast from 'react-hot-toast';

const YEAR_OPTIONS = [
  { value: 'all', label: 'All Students', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { value: '1st Year', label: '1st Year', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: '2nd Year', label: '2nd Year', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: '3rd Year', label: '3rd Year', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: '4th Year', label: '4th Year', color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

const PIN_DURATION_OPTIONS = [
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 24 * 7 },
  { label: '30 Days', hours: 24 * 30 },
];

const ACCEPTED_TYPES = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isPinnedAndActive(notice: any): boolean {
  if (!notice.is_pinned) return false;
  if (!notice.pin_expires_at) return true;
  return new Date(notice.pin_expires_at) > new Date();
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
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
      >
        <UploadCloud className={`w-7 h-7 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-sm font-bold text-gray-700">
          Drag files here or <span className="text-blue-600">browse</span>
        </p>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} onChange={(e) => {
          onChange([...files, ...Array.from(e.target.files || [])]);
          e.target.value = '';
        }} className="sr-only" />
        {uploading && (
          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="flex-1 text-xs font-semibold text-gray-700 truncate min-w-0">{f.name}</span>
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

export const ProfessorNoticeAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);

  useEffect(() => {
    if (profile && !profile.is_notice_admin && profile.role !== 'admin') {
      navigate('/professor/settings', { replace: true });
    }
  }, [profile, navigate]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetYear, setTargetYear] = useState('all');
  const [isPinned, setIsPinned] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);

  const loadNotices = useCallback(async () => {
    setIsLoadingNotices(true);
    const { data } = await getNoticesForAdmin(profile?.college);
    // filter out target_year = 'faculty' for the broadcast page
    setNotices(data?.filter((n: any) => n.target_year !== 'faculty') || []);
    setIsLoadingNotices(false);
  }, [profile?.college]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error('Title and content are required.');
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
      authorId: profile?.id, college: profile?.college, title, content, targetYear, attachments, isPinned
    });

    setIsSubmitting(false);
    if (error) return toast.error('Publish failed.');
    
    toast.success('Notice published to students!');
    setTitle(''); setContent(''); setTargetYear('all'); setIsPinned(false); setFiles([]);
    loadNotices();
  };

  const handleSoftDelete = async (notice: any) => {
    if (notice.is_deleted) {
      await restoreNotice(notice.id);
    } else {
      if (!window.confirm('Hide this notice from students?')) return;
      await softDeleteNotice(notice.id, profile?.id);
    }
    loadNotices();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 md:px-8 font-sans">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/professor/settings')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all shadow-sm">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div>
            <h1 className="font-syne text-2xl font-extrabold text-gray-900 tracking-tight">Student Broadcasting</h1>
            <p className="text-xs text-gray-500 font-medium">Publish official notices to {profile?.college} students</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Compose Form */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                <h2 className="font-syne text-base font-extrabold text-gray-900">Compose Notice</h2>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notice Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-300" placeholder="e.g. Mid-term Schedule" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notice Content</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={6} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-300 resize-none" placeholder="Write the full content..." />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Target Audience</label>
                <div className="flex flex-wrap gap-2">
                  {YEAR_OPTIONS.map((opt) => (
                    <button type="button" key={opt.value} onClick={() => setTargetYear(opt.value)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${targetYear === opt.value ? 'ring-2 ring-blue-500 ring-offset-1 ' + opt.color : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Attachments (optional)</label>
                <FileUploader files={files} onChange={setFiles} uploading={isSubmitting && files.length > 0} />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Publish to Students
              </button>
            </form>
          </div>

          {/* Published List */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col max-h-[700px]">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h2 className="font-syne text-base font-extrabold text-gray-900">Broadcast History</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{notices.length} student broadcasts</p>
            </div>
            <div className="divide-y divide-gray-100 overflow-y-auto flex-1 p-2">
              {isLoadingNotices && <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}
              {!isLoadingNotices && notices.map(notice => (
                <div key={notice.id} className="p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-syne text-sm font-bold truncate ${notice.is_deleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{notice.title}</h3>
                      <p className={`text-xs mt-1 line-clamp-2 ${notice.is_deleted ? 'text-gray-400' : 'text-gray-600'}`}>{notice.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-400 font-medium"><Calendar className="w-3 h-3 inline mr-1" />{formatDate(notice.created_at)}</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[9px] font-bold uppercase">{notice.target_year}</span>
                      </div>
                    </div>
                    <button onClick={() => handleSoftDelete(notice)} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${notice.is_deleted ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                      {notice.is_deleted ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
