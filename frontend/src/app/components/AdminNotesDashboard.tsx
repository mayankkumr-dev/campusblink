import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, AlertCircle, CheckCircle2, FileText, Video, Server } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = '/api/admin/notes';

export const AdminNotesDashboard = () => {
  const [items, setItems] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get auth token from supabase to send in headers if required by adminOnly
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Authorization': `Bearer ${session?.access_token}` };
      
      const [contentRes, coverageRes] = await Promise.all([
        fetch(`${API_BASE}/content`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE}/reports/coverage`, { headers, cache: 'no-store' })
      ]);
      
      const content = await contentRes.json();
      const cov = await coverageRes.json();
      
      setItems(Array.isArray(content) ? content : []);
      setCoverage(Array.isArray(cov) ? cov : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (branchFilter !== 'all' && i.notes_subjects?.notes_branches?.id !== branchFilter) return false;
    if (semesterFilter !== 'all' && i.notes_subjects?.semester?.toString() !== semesterFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Extract unique branches for the filter dropdown
  const uniqueBranches = Array.from(new Map(
    items.filter(i => i.notes_subjects?.notes_branches).map(i => [i.notes_subjects.notes_branches.id, i.notes_subjects.notes_branches.name])
  ).entries());

  if (loading) {
    return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  const missingCoverage = coverage.filter(c => !c.has_syllabus || !c.has_notes || !c.has_pyq);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Coverage Alerts */}
      {missingCoverage.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="text-rose-500 mt-0.5 mr-3 shrink-0" />
            <div>
              <h3 className="text-rose-800 font-semibold text-sm">Coverage Gaps Detected</h3>
              <p className="text-rose-600 text-sm mt-1">
                {missingCoverage.length} subjects are missing essential materials (Syllabus, Notes, or PYQs).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Items</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{items.length}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Published</p>
          <h2 className="text-2xl font-bold text-emerald-600 mt-1">{items.filter(i => i.status === 'published').length}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Drafts</p>
          <h2 className="text-2xl font-bold text-amber-500 mt-1">{items.filter(i => i.status === 'draft').length}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Downloads</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">
            {items.reduce((acc, curr) => acc + (curr.download_count || 0), 0)}
          </h2>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <select 
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Branches</option>
              {uniqueBranches.map(([id, name]) => <option key={id} value={id as string}>{name as string}</option>)}
            </select>
            <select 
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(sem => <option key={sem} value={sem.toString()}>Sem {sem}</option>)}
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold">Title</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Subject</th>
                <th className="p-4 font-semibold">Stats</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800 flex items-center">
                    {item.category === 'video' ? <Video size={16} className="mr-2 text-slate-400" /> : <FileText size={16} className="mr-2 text-slate-400" />}
                    {item.title}
                  </td>
                  <td className="p-4 text-slate-600 capitalize">{item.category.replace('_', ' ')}</td>
                  <td className="p-4 text-slate-600">
                    <div className="text-xs">{item.notes_subjects?.notes_branches?.notes_courses?.name} › {item.notes_subjects?.notes_branches?.name}</div>
                    <div className="font-medium">Sem {item.notes_subjects?.semester}: {item.notes_subjects?.name}</div>
                  </td>
                  <td className="p-4 text-slate-500 text-xs">
                    {item.download_count} DLs<br/>
                    {item.view_count} views
                  </td>
                  <td className="p-4">
                    {item.status === 'published' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <CheckCircle2 size={12} /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <AlertCircle size={12} /> Draft
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={async () => {
                          const newStatus = item.status === 'published' ? 'draft' : 'published';
                          const tid = toast.loading('Updating status...');
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const res = await fetch(`${API_BASE}/content/${item.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                              body: JSON.stringify({ status: newStatus })
                            });
                            if (res.ok) {
                              toast.success(`Status changed to ${newStatus}`, { id: tid });
                              fetchData();
                            } else throw new Error('Failed');
                          } catch (e) {
                            toast.error('Failed to update status', { id: tid });
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        {item.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button 
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to permanently delete this item and its file?')) return;
                          const tid = toast.loading('Deleting...');
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const res = await fetch(`${API_BASE}/content/${item.id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${session?.access_token}` }
                            });
                            if (res.ok) {
                              toast.success('Deleted permanently', { id: tid });
                              fetchData();
                            } else throw new Error('Failed');
                          } catch (e) {
                            toast.error('Failed to delete', { id: tid });
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No items found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
