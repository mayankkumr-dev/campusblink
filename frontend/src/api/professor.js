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
      .or('and(requested_role.eq.teacher,role_request_status.eq.pending),professor_status.eq.pending')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return { data: pendingProfessors || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function approveProfessor(adminId, professorId) {
  try {
    const { error: rpcError } = await supabase.rpc('admin_approve_professor', {
      target_user_id: professorId,
    });
    if (rpcError) throw rpcError;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', professorId)
      .single();
    
    if (error) throw error;

    try {
      if (import.meta.env.VITE_BACKEND_URL) {
         fetch(`${import.meta.env.VITE_BACKEND_URL}/api/email/professor/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ professorId })
         }).catch(() => null);
      }
    } catch(err) {}

    await logAdminAction(
      adminId,
      'APPROVED_PROFESSOR',
      'profile',
      professorId,
      updatedProfile?.email || professorId,
      { decision: 'approved' }
    );

    return { data: updatedProfile, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function rejectProfessor(adminId, professorId, reason) {
  try {
    const { data: updatedProfile, error } = await supabase.from('profiles').update({ requested_role: null, role_request_status: 'rejected' }).eq('id', professorId).select().single();
    if (error) throw error;

    try {
      if (import.meta.env.VITE_BACKEND_URL) {
         fetch(`${import.meta.env.VITE_BACKEND_URL}/api/email/professor/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ professorId, reason })
         }).catch(() => null);
      }
    } catch(err) {}

    await logAdminAction(
      adminId,
      'REJECTED_PROFESSOR',
      'profile',
      professorId,
      updatedProfile?.email || professorId,
      { decision: 'rejected', reason }
    );

    return { data: updatedProfile, error: null };
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
