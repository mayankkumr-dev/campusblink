const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');
const adminOnlyMiddleware = require('../middleware/adminOnly');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to protect all routes
router.use(authMiddleware);
router.use(adminOnlyMiddleware);

// --- COURSES ---
router.get('/courses', async (req, res) => {
  const { data, error } = await supabase.from('notes_courses').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/courses', async (req, res) => {
  const { name, slug, status, semester_count } = req.body;
  const { data, error } = await supabase.from('notes_courses').insert({ name, slug, status, semester_count }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/courses/:id', async (req, res) => {
  const { name, slug, status, semester_count } = req.body;
  const { data, error } = await supabase.from('notes_courses').update({ name, slug, status, semester_count }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- BRANCHES ---
router.post('/branches', async (req, res) => {
  const { course_id, name, code, sort_order, icon } = req.body;
  const { data, error } = await supabase.from('notes_branches').insert({ course_id, name, code, sort_order, icon }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/branches/:id', async (req, res) => {
  const { name, code, sort_order, icon } = req.body;
  const { data, error } = await supabase.from('notes_branches').update({ name, code, sort_order, icon }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/branches/:id', async (req, res) => {
  const { error } = await supabase.from('notes_branches').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- SUBJECTS ---
router.post('/subjects', async (req, res) => {
  const { branch_id, semester, name, code, credits } = req.body;
  const { data, error } = await supabase.from('notes_subjects').insert({ branch_id, semester, name, code, credits }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/subjects/:id', async (req, res) => {
  const { name, code, credits, semester, branch_id } = req.body;
  const { data, error } = await supabase.from('notes_subjects').update({ name, code, credits, semester, branch_id }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/subjects/:id', async (req, res) => {
  const { error } = await supabase.from('notes_subjects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- CONTENT ITEMS ---
router.get('/content', async (req, res) => {
  // Useful for overall dashboard table
  const { data, error } = await supabase
    .from('notes_content_items')
    .select(`
      *,
      notes_subjects (
        name, semester, branch_id,
        notes_branches (name, course_id, notes_courses(name))
      )
    `)
    .order('uploaded_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/content', async (req, res) => {
  // Insert content. File upload handled client-side direct to Supabase Storage, then metadata sent here
  const { subject_id, category, title, file_url, embed_url, file_type, file_size_bytes, uploaded_by, status, metadata, sort_order } = req.body;
  
  const payload = {
    subject_id, category, title, file_url, embed_url, file_type, file_size_bytes,
    uploaded_by, status: status || 'draft', metadata: metadata || {}, sort_order: sort_order || 0
  };
  
  const { data, error } = await supabase.from('notes_content_items').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/content/:id', async (req, res) => {
  const { title, status, metadata, sort_order, category, subject_id, file_url, embed_url, file_type, file_size_bytes } = req.body;
  
  // Only update provided fields
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (metadata !== undefined) updates.metadata = metadata;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (category !== undefined) updates.category = category;
  if (subject_id !== undefined) updates.subject_id = subject_id;
  if (file_url !== undefined) updates.file_url = file_url;
  if (embed_url !== undefined) updates.embed_url = embed_url;
  if (file_type !== undefined) updates.file_type = file_type;
  if (file_size_bytes !== undefined) updates.file_size_bytes = file_size_bytes;

  const { data, error } = await supabase.from('notes_content_items').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/content/:id', async (req, res) => {
  // 1. Fetch the item to get its file_url
  const { data: item, error: fetchError } = await supabase.from('notes_content_items').select('file_url').eq('id', req.params.id).single();
  if (fetchError) return res.status(500).json({ error: fetchError.message });

  // 2. Delete from storage if it has a file
  if (item && item.file_url) {
    try {
      const urlParts = item.file_url.split('/notes_content/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        await supabase.storage.from('notes_content').remove([filePath]);
      }
    } catch (e) {
      console.error('Failed to delete file from storage:', e);
    }
  }

  // 3. Delete from database
  const { error } = await supabase.from('notes_content_items').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- COVERAGE REPORT ---
router.get('/reports/coverage', async (req, res) => {
  const { data: subjects, error } = await supabase
    .from('notes_subjects')
    .select('id, name, branch_id, semester, notes_content_items(category, status)');
    
  if (error) return res.status(500).json({ error: error.message });
  
  // Transform to flag missing categories
  const report = subjects.map(sub => {
    const categoriesPresent = new Set(sub.notes_content_items.map(i => i.category));
    return {
      id: sub.id,
      name: sub.name,
      branch_id: sub.branch_id,
      semester: sub.semester,
      has_syllabus: categoriesPresent.has('syllabus_unit'),
      has_notes: categoriesPresent.has('note'),
      has_pyq: categoriesPresent.has('pyq'),
      has_lab: categoriesPresent.has('lab'),
      has_aakash: categoriesPresent.has('aakash'),
      has_video: categoriesPresent.has('video'),
    };
  });
  
  res.json(report);
});

module.exports = router;
