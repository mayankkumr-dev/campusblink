import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UploadCloud, CheckCircle2, FileText, Video, Link as LinkIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = '/api/admin/notes';
const BUCKET_NAME = 'notes_content'; // Assumption based on standard Supabase setup

export const AdminNotesUploader = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [category, setCategory] = useState('note');
  const [title, setTitle] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [description, setDescription] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchCourses(); }, []);
  useEffect(() => { if (selectedCourse) fetchBranches(selectedCourse); }, [selectedCourse]);
  useEffect(() => { if (selectedBranch) fetchSubjects(selectedBranch); }, [selectedBranch]);

  const fetchCourses = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_BASE}/courses`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
  };

  const fetchBranches = async (cId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/notes/courses/${cId}/branches`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
    const data = await res.json();
    setBranches(Array.isArray(data) ? data : []);
  };

  const fetchSubjects = async (bId: string) => {
    const { data } = await supabase.from('notes_subjects').select('*').eq('branch_id', bId).order('semester').order('name');
    setSubjects(Array.isArray(data) ? data : []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return toast.error('Please select a subject');
    if (!title) return toast.error('Title is required');
    if (category !== 'video' && category !== 'syllabus_unit' && !file) return toast.error('Please select a file to upload');
    if (category === 'video' && !embedUrl) return toast.error('YouTube embed URL is required');
    if (category === 'syllabus_unit' && !description) return toast.error('Syllabus content is required');

    setUploading(true);
    const tid = toast.loading('Uploading content...');

    try {
      let file_url = null;
      let file_type = null;
      let file_size_bytes = 0;

      if (file && category !== 'video' && category !== 'syllabus_unit') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${selectedSubject}/${category}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        file_url = publicUrl;
        file_type = file.type;
        file_size_bytes = file.size;
      }

      // Metadata handling (thumbnail for video etc)
      let metadata = {};
      if (category === 'video') {
        // extract youtube ID from embed URL
        const m = embedUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (m && m[1]) {
          metadata = { thumbnailUrl: `https://img.youtube.com/vi/${m[1]}/maxresdefault.jpg` };
        }
      }
      
      if (category === 'syllabus_unit') {
        metadata = { ...metadata, description };
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        subject_id: selectedSubject,
        category,
        title,
        file_url,
        embed_url: category === 'video' ? embedUrl : null,
        file_type,
        file_size_bytes,
        status: 'draft',
        metadata
      };

      const res = await fetch(`${API_BASE}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save to database');

      toast.success('Uploaded successfully! Saved as Draft.', { id: tid });
      
      // Reset form
      setFile(null);
      setTitle('');
      setEmbedUrl('');
      setDescription('');
      
    } catch (e: any) {
      console.error(e);
      toast.error(`Upload failed: ${e.message}`, { id: tid });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-6 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Upload Content</h2>
          <p className="text-sm text-slate-500 mt-1">Add new materials, notes, or videos to a subject.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Target Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Course</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                <option value="">Select Course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Branch</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} disabled={!selectedCourse}>
                <option value="">Select Branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedBranch}>
                <option value="">Select Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>Sem {s.semester}: {s.name}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Content Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                value={category} onChange={e => setCategory(e.target.value)}>
                <option value="syllabus_unit">Syllabus</option>
                <option value="note">Notes</option>
                <option value="pyq">PYQs (Past Year)</option>
                <option value="lab">Lab Manual</option>
                <option value="aakash">Aakash (Local Material)</option>
                <option value="video">Video Lecture</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Unit 1: Introduction to Data Structures"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          {/* File / URL Input */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 border-dashed">
            {category === 'syllabus_unit' ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Content / Description</label>
                <textarea 
                  required 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Enter the syllabus content for this unit..."
                  rows={5}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500" 
                />
                <p className="text-xs text-slate-500 mt-2">This text will be displayed directly as the unit's syllabus content.</p>
              </div>
            ) : category === 'video' ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <LinkIcon size={16} /> YouTube Embed URL
                </label>
                <input required value={embedUrl} onChange={e => setEmbedUrl(e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                <p className="text-xs text-slate-500 mt-2">Paste the YouTube embed URL or standard watch URL.</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UploadCloud size={24} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Upload a Document</h3>
                <p className="text-xs text-slate-500 mb-4">PDF, DOCX, PPTX (Max 25MB)</p>
                <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" accept=".pdf,.doc,.docx,.ppt,.pptx" />
                <label htmlFor="file-upload" className="inline-block bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors">
                  {file ? file.name : 'Select File'}
                </label>
                {file && <p className="text-xs text-emerald-600 font-semibold mt-3 flex items-center justify-center gap-1"><CheckCircle2 size={12} /> File selected</p>}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={uploading}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Uploading...</>
              ) : (
                <><Save size={18} /> Save & Upload</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
