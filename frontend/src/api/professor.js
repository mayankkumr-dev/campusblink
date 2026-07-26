import { supabase } from '../lib/supabase';
import { logAdminAction } from './admin';

// ── Professor Profile ──────────────────────────────────────────────

export async function getProfessorProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ── Professor Orders ───────────────────────────────────────────────

export async function getProfessorOrders(userId, limit = 20) {
  try {
    const { data: canteenOrders, error: e1 } = await supabase
      .from('canteen_orders')
      .select('*, shop:canteen_shops!shop_id(id, name, logo_url)')
      .eq('student_id', userId)
      .eq('is_professor_order', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (e1) throw e1;

    const { data: printOrders, error: e2 } = await supabase
      .from('print_orders')
      .select('*, shop:print_shops!shop_id(id, name)')
      .eq('student_id', userId)
      .eq('is_professor_order', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (e2) throw e2;

    const all = [
      ...(canteenOrders || []).map(o => ({ ...o, _type: 'canteen' })),
      ...(printOrders || []).map(o => ({ ...o, _type: 'print' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: all.slice(0, limit), error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getTodayOrdersCount(userId) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const iso = todayStart.toISOString();

    const { count: c1 } = await supabase
      .from('canteen_orders')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('is_professor_order', true)
      .gte('created_at', iso);

    const { count: c2 } = await supabase
      .from('print_orders')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('is_professor_order', true)
      .gte('created_at', iso);

    return { data: (c1 || 0) + (c2 || 0), error: null };
  } catch (error) {
    return { data: 0, error };
  }
}

// ── Pending Payments ───────────────────────────────────────────────

export async function getPendingPayments(userId) {
  try {
    const { data, error } = await supabase
      .from('professor_pending_payments')
      .select('*')
      .eq('professor_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getPendingPaymentsTotal(userId) {
  try {
    const { data, error } = await supabase
      .from('professor_pending_payments')
      .select('amount')
      .eq('professor_id', userId)
      .eq('is_paid', false);
    if (error) throw error;
    const total = (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { data: total, error: null };
  } catch (error) {
    return { data: 0, error };
  }
}

export async function markPaymentsAsPaid(paymentIds) {
  try {
    const { data, error } = await supabase
      .from('professor_pending_payments')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .in('id', paymentIds)
      .select();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function insertPendingPayment(payment) {
  try {
    const { data, error } = await supabase
      .from('professor_pending_payments')
      .insert([payment])
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ── Admin: Professor Management ────────────────────────────────────

export async function getPendingProfessors() {
  try {
    const { data: pendingProfessors, error } = await supabase
      .from('profiles')
      .select('*')
      .or('and(requested_role.eq.teacher,role_request_status.eq.pending),and(role.eq.professor,professor_status.eq.pending)')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    const activePending = (pendingProfessors || []).filter(
      p =>
        p.professor_status !== 'approved' &&
        p.professor_status !== 'rejected' &&
        p.role_request_status !== 'approved' &&
        p.role_request_status !== 'rejected' &&
        (p.role === 'professor' || p.requested_role === 'teacher')
    );
    return { data: activePending, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function approveProfessor(adminId, professorId) {
  try {
    // The frontend Supabase client (anon key) is blocked by RLS from updating other users' profiles.
    // Use the backend route which uses supabaseAdmin (service role) and bypasses RLS.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const res = await fetch(`${backendUrl}/api/admin/professors/${professorId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to approve professor');

    const professor = json.professor;

    await logAdminAction(
      adminId,
      'APPROVED_PROFESSOR',
      'profile',
      professorId,
      professor?.email || professorId,
      { decision: 'approved' }
    ).catch(() => null);

    return { data: professor, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function rejectProfessor(adminId, professorId, reason) {
  try {
    // Use the backend route (supabaseAdmin / service role) to bypass RLS.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const res = await fetch(`${backendUrl}/api/admin/professors/${professorId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reject professor');

    const professor = json.professor;

    await logAdminAction(
      adminId,
      'REJECTED_PROFESSOR',
      'profile',
      professorId,
      professor?.email || professorId,
      { decision: 'rejected', reason }
    ).catch(() => null);

    return { data: professor, error: null };
  } catch (error) {
    return { data: null, error };
  }
}


export async function getAllProfessors() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, college, staff_room_number, professor_status, professor_rejection_reason, professor_verified_at, avatar_url, created_at')
      .or('role.eq.professor,professor_status.eq.approved')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getProfessorFeatures(professorId) {
  try {
    const { data, error } = await supabase
      .from('professor_feature_access')
      .select('*')
      .eq('professor_id', professorId);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function toggleProfessorFeature(adminId, professorId, feature, isEnabled) {
  try {
    const { data, error } = await supabase
      .from('professor_feature_access')
      .upsert(
        {
          professor_id: professorId,
          feature,
          is_enabled: isEnabled,
          enabled_by: isEnabled ? adminId : null,
        },
        { onConflict: 'professor_id,feature' }
      )
      .select()
      .single();
    if (error) throw error;

    await logAdminAction(
      adminId,
      isEnabled ? 'ENABLED_PROFESSOR_FEATURE' : 'DISABLED_PROFESSOR_FEATURE',
      'professor_feature_access',
      professorId,
      feature,
      { feature, is_enabled: isEnabled }
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function revokeProfessor(adminId, professorId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        professor_status: 'rejected',
        professor_rejection_reason: 'Access revoked by admin',
        professor_verified_at: new Date().toISOString(),
        professor_verified_by: adminId,
      })
      .eq('id', professorId)
      .select()
      .single();
    if (error) throw error;

    await logAdminAction(
      adminId,
      'REVOKED_PROFESSOR',
      'profile',
      professorId,
      data?.email || professorId,
      { decision: 'revoked' }
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function reapproveProfessor(adminId, professorId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        professor_status: 'approved',
        professor_rejection_reason: null,
        professor_verified_at: new Date().toISOString(),
        professor_verified_by: adminId,
      })
      .eq('id', professorId)
      .select()
      .single();
    if (error) throw error;

    await logAdminAction(
      adminId,
      'REAPPROVED_PROFESSOR',
      'profile',
      professorId,
      data?.email || professorId,
      { decision: 'reapproved' }
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function getAuthHeader() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (_) {}
  return {};
}

const HEROKU_API_URL = 'https://campus-blink-api-server-b8fe7246b471.herokuapp.com';

async function fetchWithScheduleFallback(endpoint, options = {}) {
  // Use relative URLs to allow Vercel rewrites (production) and Vite proxies (development)
  // to handle routing. This avoids Mixed Content errors when Vercel is HTTPS but backend is HTTP.
  try {
    const res = await fetch(endpoint, options);
    return res;
  } catch (err) {
    console.warn(`Fetch to ${endpoint} failed, falling back to Heroku API`);
    return await fetch(`${HEROKU_API_URL}${endpoint}`, options);
  }
}

export async function getProfessorSchedule() {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetchWithScheduleFallback('/api/professor/schedule', {
      credentials: 'include',
      headers: { ...authHeaders },
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.schedule)) {
        localStorage.setItem('prof_parsed_schedule', JSON.stringify(json.schedule));
        return { data: json.schedule, error: null };
      }
    }
  } catch (err) {
    console.error('Error fetching professor schedule:', err);
  }
  // Local cache fallback
  try {
    const cached = localStorage.getItem('prof_parsed_schedule');
    if (cached) return { data: JSON.parse(cached), error: null };
  } catch (_) {}
  return { data: [], error: null };
}

export async function saveProfessorSchedule(schedule) {
  try {
    if (Array.isArray(schedule)) {
      localStorage.setItem('prof_parsed_schedule', JSON.stringify(schedule));
    }
    const authHeaders = await getAuthHeader();
    const res = await fetchWithScheduleFallback('/api/professor/schedule', {
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
    console.error('Error saving schedule:', err);
  }
  return { data: schedule, error: null };
}

export async function deleteProfessorSchedule() {
  try {
    localStorage.removeItem('prof_parsed_schedule');
    const authHeaders = await getAuthHeader();
    const res = await fetchWithScheduleFallback('/api/professor/schedule', {
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

export async function uploadProfessorScheduleFile(file) {
  try {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchWithScheduleFallback('/api/professor/schedule/upload', {
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
      localStorage.setItem('prof_parsed_schedule', JSON.stringify(json.schedule));
    }

    return { data: json, error: null };
  } catch (err) {
    console.error('Upload schedule error:', err);
    return { data: null, error: err };
  }
}

