import { supabase } from '../lib/supabase';

async function authFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// =====================================
// PROFESSOR API CALLS
// =====================================

export async function createAttendanceSession(payload: {
  subjectId: string;
  sectionId: string;
  date: string;
  timeSlot: string;
}) {
  return authFetch('/api/attendance/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAttendanceSessionRoster(sessionId: string) {
  return authFetch(`/api/attendance/sessions/${encodeURIComponent(sessionId)}/roster`);
}

export async function bulkUpdateAttendanceRecords(
  sessionId: string,
  records: Array<{ studentId: string; status: 'present' | 'absent' }>,
  reason = 'Classroom roll call'
) {
  return authFetch(`/api/attendance/sessions/${encodeURIComponent(sessionId)}/records`, {
    method: 'PATCH',
    body: JSON.stringify({ records, reason }),
  });
}

export async function submitAttendanceSession(sessionId: string) {
  return authFetch(`/api/attendance/sessions/${encodeURIComponent(sessionId)}/submit`, {
    method: 'POST',
  });
}

export async function voidAttendanceSession(sessionId: string) {
  return authFetch(`/api/attendance/sessions/${encodeURIComponent(sessionId)}/void`, {
    method: 'PATCH',
  });
}

export async function copyPreviousAttendanceSession(sessionId: string) {
  return authFetch(`/api/attendance/sessions/${encodeURIComponent(sessionId)}/copy-previous`, {
    method: 'POST',
  });
}

// =====================================
// STUDENT API CALLS
// =====================================

export async function getStudentAttendanceSummary(studentId = 'me', threshold = 75) {
  return authFetch(`/api/attendance/student/${encodeURIComponent(studentId)}/summary?threshold=${threshold}`);
}

export async function getStudentSubjectHistory(studentId = 'me', subjectId: string) {
  return authFetch(`/api/attendance/student/${encodeURIComponent(studentId)}/subject/${encodeURIComponent(subjectId)}`);
}

export async function getStudentSafeToMiss(studentId = 'me', threshold = 75) {
  return authFetch(`/api/attendance/student/${encodeURIComponent(studentId)}/safe-to-miss?threshold=${threshold}`);
}

// =====================================
// DISPUTES API CALLS
// =====================================

export async function raiseAttendanceDispute(recordId: string, reason: string) {
  return authFetch('/api/attendance/disputes', {
    method: 'POST',
    body: JSON.stringify({ recordId, reason }),
  });
}

export async function resolveAttendanceDispute(
  disputeId: string,
  status: 'approved' | 'rejected',
  resolutionNote: string
) {
  return authFetch(`/api/attendance/disputes/${encodeURIComponent(disputeId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolutionNote }),
  });
}

// =====================================
// ADMIN API CALLS
// =====================================

export async function getAdminDefaulters({
  subjectId = 'ALL',
  sectionId = 'ALL',
  threshold = 75,
}: {
  subjectId?: string;
  sectionId?: string;
  threshold?: number;
}) {
  const query = new URLSearchParams({
    subjectId,
    sectionId,
    threshold: String(threshold),
  });
  return authFetch(`/api/attendance/admin/defaulters?${query.toString()}`);
}

export async function getAdminAuditLog(sessionId: string) {
  return authFetch(`/api/attendance/admin/audit-log/${encodeURIComponent(sessionId)}`);
}
