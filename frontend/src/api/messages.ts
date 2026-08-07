import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json'
  };
}

async function getMyId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) return data.session.user.id;
  const { data: userData } = await supabase.auth.getUser();
  return userData.user?.id || '';
}

// Map Supabase conversation row to frontend structure
function mapConversation(conv: any, myId: string) {
  const otherId = conv.participant_a === myId ? conv.participant_b : conv.participant_a;
  const isParticipantA = conv.participant_a === myId;
  const iAccepted = isParticipantA ? conv.accepted_by_a : conv.accepted_by_b;
  const isRequest = conv.request_for === myId && !iAccepted;
  const acceptedBy = [
    ...(conv.accepted_by_a ? [conv.participant_a] : []),
    ...(conv.accepted_by_b ? [conv.participant_b] : []),
  ];
  return {
    _id: conv.id,
    participants: [myId, otherId],
    isRequest,
    requestFor: conv.request_for,
    acceptedBy,
    lastMessage: conv.last_message,
    lastMessageAt: conv.last_message_at,
  };
}

export async function getConversations() {
  const myId = await getMyId();
  if (!myId) return { active: [], requests: [] };

  // Try Supabase direct query first to avoid HTTPS -> HTTP mixed content blocked on Vercel/AWS
  try {
    const { data, error } = await supabase
      .from('direct_conversations')
      .select('*')
      .or(`participant_a.eq.${myId},participant_b.eq.${myId}`)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map((conv: any) => mapConversation(conv, myId));
      return {
        active: mapped.filter((c: any) => !c.isRequest),
        requests: mapped.filter((c: any) => c.isRequest),
      };
    }
  } catch (err) {
    // Fallback to Express backend if needed
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/messages/conversations`, { headers });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return await res.json();
  } catch (err: any) {
    return { active: [], requests: [] };
  }
}

export async function getMessages(conversationId: string) {
  // Try Supabase direct query first
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      return data.map((m: any) => ({
        _id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        text: m.message,
        isRead: m.is_read,
        createdAt: m.created_at,
        deletedBy: m.deleted_by || [],
        editedAt: m.edited_at || null,
      }));
    }
  } catch (err) {
    // Fallback
  }

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/messages`, { headers });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function sendMessage(receiverId: string, text: string) {
  const myId = await getMyId();
  if (!myId) throw new Error('Not authenticated');

  const cleanText = text.trim();
  if (!cleanText) throw new Error('Message cannot be empty');

  // Try direct Supabase insertion first
  try {
    const [participantA, participantB] = [myId, receiverId].sort();
    let { data: existing } = await supabase
      .from('direct_conversations')
      .select('*')
      .eq('participant_a', participantA)
      .eq('participant_b', participantB)
      .maybeSingle();

    if (!existing) {
      const { data: created, error: createError } = await supabase
        .from('direct_conversations')
        .insert([{
          participant_a: participantA,
          participant_b: participantB,
          context_type: 'general',
          context_title: 'Direct chat',
          request_for: receiverId,
          accepted_by_a: myId === participantA,
          accepted_by_b: myId === participantB,
          last_message: cleanText,
          last_message_at: new Date().toISOString(),
        }])
        .select('*')
        .single();
      if (createError) throw createError;
      existing = created;
    }

    const { data: msg, error: msgError } = await supabase
      .from('direct_messages')
      .insert([{
        conversation_id: existing.id,
        sender_id: myId,
        receiver_id: receiverId,
        message: cleanText,
        is_read: false,
      }])
      .select('*')
      .single();

    if (msgError) throw msgError;

    await supabase
      .from('direct_conversations')
      .update({
        last_message: cleanText,
        last_message_at: msg.created_at,
      })
      .eq('id', existing.id);

    return {
      message: {
        _id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        text: msg.message,
        isRead: msg.is_read,
        createdAt: msg.created_at,
        deletedBy: msg.deleted_by || [],
        editedAt: msg.edited_at || null,
      }
    };
  } catch (err) {
    // Fallback to Express backend if direct Supabase insert fails
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/messages/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ receiverId, text: cleanText })
    });
    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || 'Failed to send message');
    }
    return res.json();
  }
}

export async function acceptRequest(conversationId: string) {
  try {
    const myId = await getMyId();
    await supabase
      .from('direct_conversations')
      .update({
        request_for: null,
        accepted_by_a: true,
        accepted_by_b: true,
      })
      .eq('id', conversationId);
    return { success: true };
  } catch (err) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/accept`, {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error('Failed to accept request');
    return res.json();
  }
}

export async function deleteMessages(messageIds: string[], deleteFor: 'me' | 'everyone') {
  try {
    if (deleteFor === 'everyone') {
      await supabase.from('direct_messages').delete().in('id', messageIds);
    } else {
      const myId = await getMyId();
      for (const id of messageIds) {
        const { data: m } = await supabase.from('direct_messages').select('deleted_by').eq('id', id).single();
        if (m) {
          const updated = [...(m.deleted_by || []), myId];
          await supabase.from('direct_messages').update({ deleted_by: updated }).eq('id', id);
        }
      }
    }
    return { success: true };
  } catch (err) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/messages/messages/batch`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ messageIds, deleteFor })
    });
    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || 'Failed to delete messages');
    }
    return res.json();
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    await supabase.from('direct_conversations').delete().eq('id', conversationId);
    return { success: true };
  } catch (err) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  }
}

export async function editMessageApi(messageId: string, text: string) {
  try {
    const now = new Date().toISOString();
    await supabase
      .from('direct_messages')
      .update({ message: text.trim(), edited_at: now })
      .eq('id', messageId);
    return { text: text.trim(), editedAt: now };
  } catch (err) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/messages/messages/${messageId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Failed to edit message');
    return res.json();
  }
}
