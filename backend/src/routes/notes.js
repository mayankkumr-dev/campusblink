const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all active courses
router.get('/courses', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes_courses')
      .select('*')
      .eq('status', 'active')
      .order('name');
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get branches for a course
router.get('/courses/:courseId/branches', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { data, error } = await supabase
      .from('notes_branches')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subjects for a branch and semester
router.get('/branches/:branchId/semesters/:semester/subjects', async (req, res) => {
  try {
    const { branchId, semester } = req.params;
    const { data, error } = await supabase
      .from('notes_subjects')
      .select('*')
      .eq('branch_id', branchId)
      .eq('semester', semester)
      .order('name');
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subject details and its content items
router.get('/subjects/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    // 1. Fetch subject
    const { data: subject, error: subError } = await supabase
      .from('notes_subjects')
      .select('*, notes_branches(name, code, course_id, notes_courses(name, slug))')
      .eq('id', subjectId)
      .single();
      
    if (subError) throw subError;
    
    // 2. Fetch published content
    const { data: content, error: contentError } = await supabase
      .from('notes_content_items')
      .select(`
        id, category, title, file_url, embed_url, file_type, file_size_bytes, 
        uploaded_at, download_count, view_count, sort_order, metadata,
        uploaded_by, profiles!notes_content_items_uploaded_by_fkey(name, avatar_url)
      `)
      .eq('subject_id', subjectId)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('uploaded_at', { ascending: false });
      
    if (contentError) throw contentError;
    
    res.json({ subject, content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track download
router.post('/content/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.rpc('increment_download_count', { item_id: id });
    
    if (error) {
      // Fallback if RPC doesn't exist
      const { data } = await supabase.from('notes_content_items').select('download_count').eq('id', id).single();
      if (data) {
        await supabase.from('notes_content_items').update({ download_count: data.download_count + 1 }).eq('id', id);
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
