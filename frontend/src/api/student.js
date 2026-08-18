import { supabase } from '../lib/supabase';

async function getAuthHeader() {
  try {
    if (window.Clerk && window.Clerk.session) {
      const token = await window.Clerk.session.getToken({ template: 'supabase' });
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (_) {}
  return {};
}

// Ensure the frontend always uses relative path for API so that Vercel can proxy
// the HTTP request server-side, preventing Mixed Content blocks in the browser.
async function fetchWithScheduleFallback(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, options);
    if (res.headers.get('content-type')?.includes('text/html')) {
       throw new Error('Server returned HTML error page instead of JSON');
    }
    return res;
  } catch (err) {
    console.warn(`Fetch to ${endpoint} failed, falling back...`);
    throw err;
  }
}

export async function getStudentSchedule() {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithScheduleFallback('/api/student/schedule', {
      credentials: 'include',
      headers: { ...authHeaders },
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.schedule)) {
        localStorage.setItem('student_parsed_schedule', JSON.stringify(json.schedule));
        return { data: json.schedule, error: null };
      }
    }
  } catch (err) {
    console.error('Error fetching student schedule:', err);
  }
  // Local cache fallback
  try {
    const cached = localStorage.getItem('student_parsed_schedule');
    if (cached) return { data: JSON.parse(cached), error: null };
  } catch (_) {}
  return { data: [], error: null };
}

export async function saveStudentSchedule(schedule) {
  try {
    if (Array.isArray(schedule)) {
      localStorage.setItem('student_parsed_schedule', JSON.stringify(schedule));
    }
    const authHeaders = await getAuthHeader();
    const res = await fetchWithScheduleFallback('/api/student/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      credentials: 'include',
      body: JSON.stringify({ schedule }),
    });
    if (res.ok) {
      const json = await res.json();
      return { data: json.schedule || schedule, error: null };
    }
  } catch (err) {
    console.error('Error saving student schedule:', err);
  }
  return { data: schedule, error: null };
}

export async function deleteStudentSchedule() {
  try {
    localStorage.removeItem('student_parsed_schedule');
    const authHeaders = await getAuthHeader();
    const res = await fetchWithScheduleFallback('/api/student/schedule', {
      method: 'DELETE',
      headers: { ...authHeaders },
      credentials: 'include',
    });
    if (res.ok) {
      return { success: true, error: null };
    }
  } catch (err) {
    console.error('Error deleting schedule:', err);
  }
  return { success: true, error: null };
}

export async function uploadStudentScheduleFile(file) {
  try {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const endpoint = backendUrl ? `${backendUrl}/api/student/schedule/upload` : '/api/student/schedule/upload';

    const res = await fetchWithScheduleFallback(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to parse timetable upload');
    }

    if (Array.isArray(json.schedule)) {
      localStorage.setItem('student_parsed_schedule', JSON.stringify(json.schedule));
    }

    return { data: json, error: null };
  } catch (err) {
    console.error('Upload schedule error:', err);
    return { data: null, error: err };
  }
}
