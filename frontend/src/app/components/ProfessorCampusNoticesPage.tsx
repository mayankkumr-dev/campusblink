import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Megaphone, Calendar, Users, FileText, Download, ExternalLink, Pin } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getCampusNoticesForProfessor } from '../../api/notices';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

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
    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 shadow-sm transition-all group max-w-[260px]">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-900 truncate">{att.name}</p>
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Document</p>
      </div>
      <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
    </a>
  );
};

export const ProfessorCampusNoticesPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotices = useCallback(async () => {
    setIsLoading(true);
    const { data } = await getCampusNoticesForProfessor({ college: profile?.college });
    setNotices(data || []);
    setIsLoading(false);
  }, [profile?.college]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 md:px-8 font-sans">
      <div className="max-w-[800px] mx-auto">
        <div className="mb-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Megaphone className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Public Feed</span>
          </div>
          <h1 className="font-syne text-4xl font-extrabold text-gray-900 tracking-tight">Campus Notices</h1>
          <p className="text-sm text-gray-500 font-medium mt-2">Read-only view of official announcements sent to the student body.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : notices.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900">No campus notices</h2>
            <p className="text-sm text-gray-500 mt-1">There are no student broadcasts yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {notices.map((notice) => (
              <article key={notice.id} className={`bg-white rounded-3xl border p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all ${notice.is_pinned ? 'border-amber-200 ring-1 ring-amber-50' : 'border-gray-100'}`}>
                {notice.is_pinned && (
                  <div className="flex items-center gap-2 mb-4">
                    <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Pinned Notice</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="font-syne text-xl font-extrabold text-gray-900 leading-snug">{notice.title}</h2>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-600 uppercase tracking-wider shrink-0">
                    <Users className="w-3 h-3" /> All Students
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                {notice.attachments?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {notice.attachments.map((att: any, idx: number) => <AttachmentCard key={idx} att={att} />)}
                  </div>
                )}
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-400">
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Published {formatDate(notice.created_at)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
