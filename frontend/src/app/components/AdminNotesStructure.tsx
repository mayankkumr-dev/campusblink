import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, ChevronRight, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = '/api/admin/notes';

export const AdminNotesStructure = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [editingSubject, setEditingSubject] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) fetchBranches(selectedCourseId);
    else setBranches([]);
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedBranchId) fetchSubjects(selectedBranchId);
    else setSubjects([]);
  }, [selectedBranchId]);

  const fetchCourses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/courses`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedCourseId) setSelectedCourseId(data[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchBranches = async (courseId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/notes/courses/${courseId}/branches`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedBranchId) setSelectedBranchId(data[0].id);
      else setSelectedBranchId('');
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async (branchId: string) => {
    // Actually need a way to fetch all subjects for a branch across all semesters
    // We can just query Supabase directly for admin convenience here
    try {
      const { data, error } = await supabase.from('notes_subjects').select('*').eq('branch_id', branchId).order('semester').order('name');
      if (error) throw error;
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const handleSubmitSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const code = (form.elements.namedItem('code') as HTMLInputElement).value;
    const semester = parseInt((form.elements.namedItem('semester') as HTMLInputElement).value);
    const credits = parseInt((form.elements.namedItem('credits') as HTMLInputElement).value);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const method = editingSubject ? 'PUT' : 'POST';
      const url = editingSubject ? `${API_BASE}/subjects/${editingSubject.id}` : `${API_BASE}/subjects`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ branch_id: selectedBranchId, name, code, semester, credits })
      });
      if (res.ok) {
        toast.success(editingSubject ? 'Subject updated' : 'Subject added');
        setEditingSubject(null);
        form.reset();
        fetchSubjects(selectedBranchId);
      } else throw new Error('Failed');
    } catch (e) {
      toast.error('Failed to save subject');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subject? All content under it will be lost.')) return;
    const tid = toast.loading('Deleting subject...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        toast.success('Subject deleted', { id: tid });
        fetchSubjects(selectedBranchId);
      } else throw new Error('Failed');
    } catch (e) {
      toast.error('Failed to delete subject', { id: tid });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Column 1: Courses & Branches */}
      <div className="space-y-6 md:col-span-1">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Courses</h2>
          <div className="space-y-2">
            {courses.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCourseId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${selectedCourseId === c.id ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {c.name}
                <ChevronRight size={14} className={selectedCourseId === c.id ? 'text-amber-500' : 'text-slate-400'} />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Branches</h2>
          {selectedCourseId ? (
            <div className="space-y-2">
              {branches.map(b => (
                <button 
                  key={b.id} 
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${selectedBranchId === b.id ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {b.name}
                  <ChevronRight size={14} className={selectedBranchId === b.id ? 'text-amber-500' : 'text-slate-400'} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Select a course first</p>
          )}
        </div>
      </div>

      {/* Column 2: Subjects */}
      <div className="md:col-span-2 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-6">Manage Subjects</h2>
          
          {selectedBranchId ? (
            <>
              {/* Add form */}
              <form key={editingSubject ? editingSubject.id : 'new'} onSubmit={handleSubmitSubject} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="col-span-2 sm:col-span-4 font-semibold text-sm text-slate-700 flex justify-between items-center">
                  <span>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</span>
                  {editingSubject && (
                    <button type="button" onClick={() => setEditingSubject(null)} className="text-xs text-amber-600 font-medium hover:underline">Cancel Edit</button>
                  )}
                </div>
                
                <input required name="name" defaultValue={editingSubject?.name} placeholder="Subject Name" className="col-span-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                <input name="code" defaultValue={editingSubject?.code} placeholder="Code (e.g. CS101)" className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                <input required name="semester" defaultValue={editingSubject?.semester} type="number" min="1" max="8" placeholder="Semester" className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                <input name="credits" defaultValue={editingSubject?.credits} type="number" placeholder="Credits" className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                
                <div className="col-span-2 sm:col-span-4 flex justify-end">
                  <button type="submit" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                    {editingSubject ? <Save size={16} /> : <Plus size={16} />}
                    {editingSubject ? 'Save Changes' : 'Add Subject'}
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="space-y-4">
                {[1,2,3,4,5,6,7,8].map(sem => {
                  const sems = subjects.filter(s => s.semester === sem);
                  if (sems.length === 0) return null;
                  return (
                    <div key={sem}>
                      <h3 className="font-semibold text-slate-700 text-sm mb-2 border-b border-slate-100 pb-1">Semester {sem}</h3>
                      <div className="space-y-2">
                        {sems.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                              <p className="text-xs text-slate-500">{s.code} • {s.credits} Credits</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setEditingSubject(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteSubject(s.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              Select a branch to manage its subjects.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
