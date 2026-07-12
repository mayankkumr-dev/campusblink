import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ExternalLink,
  Flag,
  Loader2,
  MessageSquare,
  Search,
  ShieldAlert,
  Trash2,
  UserX,
  Info,
} from 'lucide-react';
import {
  deleteCommunityPost,
  getAdminPostReveal,
  getAllCommunityPosts,
  sendUserWarning,
  updateUserStatus,
} from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type AdminCommunityPageProps = {
  initialFilterStatus?: 'All Threads' | 'Flagged';
  noticeMode?: boolean;
  title?: string;
};

function extractPostIdFromInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const uuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (uuidMatch?.[0]) return uuidMatch[0].toLowerCase();

  try {
    const parsedUrl = new URL(trimmed);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const maybeId = segments[segments.length - 1] || '';
    const urlUuidMatch = maybeId.match(/[0-9a-fA-F-]{36}/);
    if (urlUuidMatch?.[0]) return urlUuidMatch[0].toLowerCase();
  } catch {
    return null;
  }

  return null;
}

export const AdminCommunityPage: React.FC<AdminCommunityPageProps> = ({ initialFilterStatus = 'All Threads', noticeMode = false, title }) => {
  const adminProfile = useAuthStore((state) => state.profile);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [revealInput, setRevealInput] = useState('');
  const [isRevealLoading, setIsRevealLoading] = useState(false);
  const [revealResult, setRevealResult] = useState<any | null>(null);
  const [revealError, setRevealError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    setFilterStatus(initialFilterStatus);
  }, [initialFilterStatus]);

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data } = await getAllCommunityPosts();
    if (data) setPosts(data);
    setIsLoading(false);
  };

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const searchMatch =
          post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.author?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        let statusMatch = false;
        if (filterStatus === 'All Threads') statusMatch = true;
        else if (filterStatus === 'Flagged') statusMatch = post.report_count > 0;
        else statusMatch = true;

        const collegeMatch = collegeFilter === 'all' || (post.author?.college || '').toLowerCase() === collegeFilter.toLowerCase();

        return searchMatch && statusMatch && collegeMatch;
      }),
    [posts, searchTerm, filterStatus, collegeFilter]
  );

  const collegeOptions = Array.from(
    new Set(posts.map((post) => post.author?.college).filter((value): value is string => Boolean(value && value.trim())))
  ).sort((a, b) => a.localeCompare(b));

  const handleDeleteThread = async (postId: string, snippet: string) => {
    if (!adminProfile) return;
    if (!confirm('Are you sure you want to delete this thread?')) return;

    const loadingToast = toast.loading('Deleting thread...');
    const { error } = await deleteCommunityPost(adminProfile.id, postId, snippet.substring(0, 50));

    if (error) {
      toast.error((error as any)?.message || 'Failed to delete post.', { id: loadingToast });
      return;
    }

    toast.success('Thread deleted.', { id: loadingToast });

    if (revealResult?.post?.id === postId) {
      setRevealResult(null);
      setRevealError('');
    }

    setActiveDropdown(null);
    fetchPosts();
  };

  const handleRevealSearch = async () => {
    const extractedPostId = extractPostIdFromInput(revealInput);
    if (!extractedPostId) {
      setRevealResult(null);
      setRevealError('No post found with this ID or URL');
      return;
    }

    setIsRevealLoading(true);
    setRevealError('');

    const { data, error } = await getAdminPostReveal(extractedPostId);
    setIsRevealLoading(false);

    if (error || !data) {
      setRevealResult(null);
      setRevealError('No post found with this ID or URL');
      return;
    }

    setRevealResult(data);
    setRevealError('');
  };

  const handleWarnFromReveal = async () => {
    if (!adminProfile?.id || !revealResult?.author?.id) return;

    const warningTitle = 'Community guideline warning';
    const warningMessage = `Your post (${revealResult.post.id}) has been flagged by admin. Please review community rules.`;

    const loading = toast.loading('Sending warning...');
    const { error } = await sendUserWarning(adminProfile.id, revealResult.author.id, warningTitle, warningMessage);

    if (error) {
      toast.error((error as any)?.message || 'Failed to send warning.', { id: loading });
      return;
    }

    toast.success('Warning sent.', { id: loading });
  };

  const handleStatusFromReveal = async (nextStatus: 'restricted' | 'banned' | 'active') => {
    if (!adminProfile?.id || !revealResult?.author?.id) return;

    const loading = toast.loading(
      nextStatus === 'restricted' ? 'Restricting account...' : nextStatus === 'banned' ? 'Banning account...' : 'Removing restriction...'
    );
    const { error } = await updateUserStatus(adminProfile.id, revealResult.author.id, nextStatus, `Updated from post reveal ${revealResult.post.id}`);

    if (error) {
      toast.error((error as any)?.message || `Failed to ${nextStatus} user.`, { id: loading });
      return;
    }

    toast.success(
      nextStatus === 'restricted' ? 'Account restricted.' : nextStatus === 'banned' ? 'Account banned.' : 'Account is now active again.',
      { id: loading }
    );
    setRevealResult((prev: any) =>
      prev
        ? {
            ...prev,
            author: {
              ...prev.author,
              status: nextStatus,
            },
          }
        : prev
    );
  };

  const StatusBadge = ({ reports }: { reports: number }) => {
    if (reports > 0) {
      return (
        <span className="inline-flex items-center rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">
          <Flag className="mr-1 h-3 w-3" /> {reports} Reports
        </span>
      );
    }

    return <span className="inline-flex items-center rounded bg-accent-green/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-green">Active</span>;
  };

  return (
    <div className="animate-in space-y-6 fade-in duration-500">
      {title && (
        <div className="rounded-lg border border-black/[0.08] bg-white p-4">
          <h2 className="font-syne text-xl font-bold text-slate-900">{title}</h2>
        </div>
      )}

      {/* Reveal Author Tool */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all">
        <p className="mb-3 font-syne text-[13px] font-extrabold text-slate-900 tracking-tight">Paste post URL or ID to reveal author</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="e.g. http://localhost:5173/community/c8c4e779..."
              value={revealInput}
              onChange={(e) => setRevealInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRevealSearch();
              }}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            />
          </div>
          <button
            onClick={handleRevealSearch}
            disabled={isRevealLoading || !revealInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
          >
            {isRevealLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Reveal
          </button>
        </div>

        {revealError && <p className="mt-3 text-sm font-medium text-rose-600">{revealError}</p>}

        {revealResult && (
          <div className="mt-4 rounded-lg border border-black/[0.08] bg-slate-50 p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-black/[0.08] bg-white p-4">
                <h3 className="mb-3 font-syne text-sm font-bold uppercase tracking-wider text-slate-900">Post Information</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-500">
                    <span className="font-bold text-slate-900">Post ID:</span> {revealResult.post.id}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-bold text-slate-900">Posted at:</span> {new Date(revealResult.post.created_at).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900">{revealResult.post.type || 'General'}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${revealResult.post.is_anonymous ? 'bg-rose-100 text-rose-600' : 'bg-accent-green/15 text-accent-green'}`}>
                      {revealResult.post.is_anonymous ? 'Anonymous' : 'Public'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-900">{revealResult.post.content}</p>
                  <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                    <span>Likes: {revealResult.post.like_count || 0}</span>
                    <span>Comments: {revealResult.post.comment_count || 0}</span>
                    <span>Reports: {revealResult.post.report_count || 0}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-black/[0.08] bg-white p-4">
                <h3 className="mb-3 font-syne text-sm font-bold uppercase tracking-wider text-slate-900">Real Author Information</h3>
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={revealResult.author.avatar_url || '/logo2/Blue_transparent.png?v=4'}
                    alt={revealResult.author.name || 'User'}
                    className="h-12 w-12 rounded-full border border-black/10 object-cover"
                  />
                  <div>
                    <p className="font-bold text-slate-900">{revealResult.author.name || 'Unknown user'}</p>
                    <p className="text-xs text-slate-500">@{revealResult.author.username || 'unknown'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-500">
                  <p><span className="font-bold text-slate-900">Email:</span> {revealResult.author.email || 'N/A'}</p>
                  <p><span className="font-bold text-slate-900">College:</span> {revealResult.author.college_name || 'N/A'}{revealResult.author.college_short ? ` (${revealResult.author.college_short})` : ''}</p>
                  <p><span className="font-bold text-slate-900">Role:</span> <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">{revealResult.author.role || 'student'}</span></p>
                  <p>
                    <span className="font-bold text-slate-900">Status:</span>{' '}
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${revealResult.author.status === 'banned' ? 'bg-rose-100 text-rose-600' : revealResult.author.status === 'restricted' ? 'bg-amber-100 text-amber-800' : 'bg-accent-green/15 text-accent-green'}`}>
                      {revealResult.author.status || 'active'}
                    </span>
                  </p>
                  <p><span className="font-bold text-slate-900">Joined:</span> {revealResult.author.joined_at ? new Date(revealResult.author.joined_at).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="font-bold text-slate-900">Reputation:</span> ⭐ {revealResult.author.campus_credits || 0} Reputation</p>
                  <p><span className="font-bold text-slate-900">No show count:</span> {revealResult.author.no_show_count || 0}</p>
                </div>
              </section>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-black/[0.08] pt-4">
              <button
                onClick={() => window.open(`/community/${revealResult.post.id}`, '_blank')}
                className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100"
              >
                <ExternalLink className="h-4 w-4" /> View Post
              </button>
              <button
                onClick={() => navigate(`/admin/users/${revealResult.author.id}`)}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100"
              >
                View Full Profile
              </button>
              <button
                onClick={handleWarnFromReveal}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-800/20 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-[#92400E] hover:text-slate-900"
              >
                <AlertTriangle className="h-4 w-4" /> Send Warning
              </button>
              <button
                onClick={() => handleStatusFromReveal('restricted')}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-800/20 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-[#92400E] hover:text-slate-900"
              >
                <ShieldAlert className="h-4 w-4" /> Restrict Account
              </button>
              {revealResult.author.status === 'restricted' || revealResult.author.status === 'banned' ? (
                <button
                  onClick={() => handleStatusFromReveal('active')}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-accent-green/15 px-3 py-2 text-xs font-bold text-accent-green hover:bg-emerald-600 hover:text-white"
                >
                  <ShieldAlert className="h-4 w-4" /> Unrestrict Account
                </button>
              ) : null}
              <button
                onClick={() => handleStatusFromReveal('banned')}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-600/20 bg-rose-100 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white"
              >
                <UserX className="h-4 w-4" /> Ban Account
              </button>
              <button
                onClick={() => handleDeleteThread(revealResult.post.id, revealResult.post.content || '')}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-600/20 bg-rose-100 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white"
              >
                <Trash2 className="h-4 w-4" /> Delete Post
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-lg border border-black/[0.08] bg-white p-4 lg:flex-row lg:items-center">
        <div className="group relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-amber-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search posts, authors, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-slate-100 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-amber-400/50 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 font-sans text-xs font-bold uppercase tracking-wider text-slate-500">Filters:</span>
          {(['All Threads', 'Flagged'] as const).map((pill) => (
            <button
              key={pill}
              onClick={() => setFilterStatus(pill)}
              className={`rounded-lg px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition-colors ${
                filterStatus === pill
                  ? 'bg-amber-500 text-slate-900'
                  : 'border border-black/[0.08] bg-slate-100 text-slate-500 hover:border-black/20 hover:text-slate-900'
              }`}
            >
              {pill}
            </button>
          ))}
          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="ml-2 rounded-lg border border-black/10 bg-slate-100 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-900"
          >
            <option value="all">All Colleges</option>
            {collegeOptions.map((college) => (
              <option key={college} value={college}>
                {college}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── MOBILE VIEWPORT ONLY ── */}
      <div className="md:hidden space-y-3 pb-6">
        {noticeMode && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 font-sans text-xs font-semibold text-blue-900 shadow-sm flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 dark:text-blue-400 transition-colors" />
            <div>
              <p className="font-bold text-sm mb-0.5">Notice Mode Active</p>
              <p>Identify important threads here to create a pinned campus notice in Announcements.</p>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center flex flex-col items-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] mt-4">
            <div className="p-4 bg-slate-50 rounded-full mb-3">
              <MessageSquare className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-900">No posts found</p>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-[200px]">Adjust your filters to see results.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative">
              {/* Top: Author & Date */}
              <div className="flex items-start justify-between mb-2 border-b border-slate-100/80 pb-2">
                <div>
                  <h4 className="font-sans text-[13px] font-bold text-slate-900 leading-tight">
                    {post.author?.name || 'Unknown author'}
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">
                    {new Date(post.created_at).toLocaleDateString()} • {post.is_anonymous ? 'Anonymous' : 'Public'}
                  </p>
                </div>
              </div>
              
              {/* Middle: Post Preview */}
              <div className="mb-4">
                <p className="font-sans text-sm leading-relaxed text-slate-800 line-clamp-3">
                  "{post.content}"
                </p>
              </div>

              {/* Bottom: Engagement, Health, Mod Action */}
              <div className="flex items-center justify-between border-t border-slate-100/80 pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    <MessageSquare className="h-3 w-3" /> {post.comment_count || 0}
                  </div>
                  <StatusBadge reports={post.report_count} />
                </div>
                <button
                  onClick={() => setActiveDropdown(activeDropdown === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 font-sans text-[11px] font-extrabold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Mod <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* Mod Action Dropdown Overlay */}
              {activeDropdown === post.id && (
                <div className="absolute right-4 bottom-12 z-20 w-48 animate-in overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 text-left font-sans text-xs shadow-xl zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Sanctions</span>
                  </div>
                  <button
                    onClick={() => { handleDeleteThread(post.id, post.content); setActiveDropdown(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Thread
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── DESKTOP PC VIEWPORT ONLY ── */}
      <div className="hidden md:block min-h-[400px] overflow-x-auto rounded-lg border border-black/[0.08] bg-white">
        {noticeMode && (
          <div className="m-4 rounded-lg border border-amber-400/30 bg-[#FEF3C7] p-4 font-sans text-sm font-medium text-slate-900">
            Notice mode is active. Use this page to identify important threads, then create a pinned campus notice in Announcements.
          </div>
        )}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 h-[40px] border-b border-[rgba(15,23,42,0.08)]">
              <tr className="border-b border-black/[0.08] bg-slate-100 hover:bg-slate-50 transition-colors duration-150">
                <th className="p-4 font-sans text-xs font-bold uppercase tracking-wider text-slate-500 px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Post Preview</th>
                <th className="p-4 font-sans text-xs font-bold uppercase tracking-wider text-slate-500 px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Author Information</th>
                <th className="flex items-center gap-2 p-4 font-sans text-xs font-bold uppercase tracking-wider text-slate-500 px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">
                  <MessageSquare className="h-3.5 w-3.5" /> Engagement
                </th>
                <th className="p-4 font-sans text-xs font-bold uppercase tracking-wider text-slate-500 px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Health</th>
                <th className="w-16 p-4 text-center font-sans text-xs font-bold uppercase tracking-wider text-slate-500 px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Actions</th>
              </tr>
            </thead>
            <tbody className="relative divide-y divide-black/[0.06]">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="group transition-colors hover:bg-slate-100">
                  <td className="max-w-md min-w-[300px] p-4">
                    <div className="mb-1.5 line-clamp-2 font-sans text-sm leading-relaxed text-slate-900">"{post.content}"</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-black/[0.08] bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {post.is_anonymous ? 'Anonymous' : 'Public'}
                      </span>
                      <span className="font-sans text-[10px] uppercase tracking-wider text-slate-500">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="mb-0.5 font-sans text-sm font-medium text-slate-900">{post.author?.name || 'Unknown author'}</div>
                    <div className="font-sans text-xs text-slate-500">{post.author?.email || post.author?.college || 'No details'}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 font-syne text-base font-bold text-accent-green">
                        <MessageSquare className="h-4 w-4" /> {post.comment_count || 0}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge reports={post.report_count} />
                  </td>
                  <td className="relative p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === post.id ? null : post.id)}
                        className="flex items-center gap-1 rounded-lg border border-black/[0.08] bg-slate-100 p-1.5 font-sans text-xs font-bold text-slate-900 transition-colors hover:bg-black/[0.06]"
                      >
                        Mod <ShieldAlert className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 transition-colors" />
                      </button>
                    </div>

                    {activeDropdown === post.id && (
                      <div className="absolute right-4 top-12 z-20 w-52 animate-in overflow-hidden rounded-lg border border-black/[0.08] bg-white py-1 text-left font-sans text-sm shadow-md zoom-in-95 duration-100">
                        <div className="px-3 py-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sanctions</span>
                        </div>
                        <button
                          onClick={() => handleDeleteThread(post.id, post.content)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left font-sans text-xs font-bold text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" /> Delete Thread
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPosts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-sans text-slate-500">
                    No posts found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {activeDropdown && <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />}
    </div>
  );
};
