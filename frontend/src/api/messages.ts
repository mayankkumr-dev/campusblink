import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json'
  };
}

export async function getConversations() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/conversations`, { headers });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function getMessages(conversationId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/messages`, { headers });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function sendMessage(receiverId: string, text: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ receiverId, text })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to send message');
  }
  return res.json();
}

export async function acceptRequest(conversationId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/accept`, {
    method: 'POST',
    headers
  });
  if (!res.ok) throw new Error('Failed to accept request');
  return res.json();
}

export async function deleteMessages(messageIds: string[], deleteFor: 'me' | 'everyone') {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/messages/batch`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ messageIds, deleteFor })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete messages');
  }
  return res.json();
}

export async function deleteConversation(conversationId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return res.json();
}

export async function editMessageApi(messageId: string, text: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/messages/${messageId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Failed to edit message');
  return res.json();
}
