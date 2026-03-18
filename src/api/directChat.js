import { supabase } from '../lib/supabase';

const DIRECT_CONVERSATION_SELECT = `
  *,
  participantA:profiles!direct_conversations_participant_a_fkey(
    id,
    name,
    avatar_url,
    username,
    college
  ),
  participantB:profiles!direct_conversations_participant_b_fkey(
    id,
    name,
    avatar_url,
    username,
    college
  )
`;

function sortParticipants(firstUserId, secondUserId) {
  return [firstUserId, secondUserId].sort();
}

function conversationPreview(message) {
  return String(message || '').trim() || 'New message';
}

export async function ensureDirectConversation({ initiatorId, peerId, contextType = 'general', contextTitle = 'Direct chat', requestFor = null }) {
  try {
    if (!initiatorId || !peerId) {
      throw new Error('Both users are required to start a conversation.');
    }

    if (initiatorId === peerId) {
      throw new Error('You cannot chat with yourself.');
    }

    const [participantA, participantB] = sortParticipants(initiatorId, peerId);

    const { data: existing, error: existingError } = await supabase
      .from('direct_conversations')
      .select(DIRECT_CONVERSATION_SELECT)
      .eq('participant_a', participantA)
      .eq('participant_b', participantB)
      .eq('context_type', contextType)
      .eq('context_title', contextTitle)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return { data: existing, error: null };

    const insertPayload = {
      participant_a: participantA,
      participant_b: participantB,
      context_type: contextType,
      context_title: contextTitle,
      request_for: requestFor,
      accepted_by_a: initiatorId === participantA,
      accepted_by_b: initiatorId === participantB,
      last_message: '',
      last_message_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('direct_conversations')
      .insert([insertPayload])
      .select(DIRECT_CONVERSATION_SELECT)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getDirectConversations(userId) {
  try {
    const { data, error } = await supabase
      .from('direct_conversations')
      .select(DIRECT_CONVERSATION_SELECT)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getDirectConversationMessages(conversationId, userId) {
  try {
    const { data: conversation, error: conversationError } = await supabase
      .from('direct_conversations')
      .select(DIRECT_CONVERSATION_SELECT)
      .eq('id', conversationId)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .single();

    if (conversationError) throw conversationError;

    const { data: messages, error: messagesError } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(id, name, avatar_url), receiver:profiles!direct_messages_receiver_id_fkey(id, name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return { data: { conversation, messages: messages || [] }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function markDirectConversationRead(conversationId, userId) {
  try {
    const { data: conversation, error: conversationError } = await supabase
      .from('direct_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError) throw conversationError;

    const unreadField = conversation.participant_a === userId ? 'participant_a_unread' : 'participant_b_unread';

    const { error: updateConversationError } = await supabase
      .from('direct_conversations')
      .update({ [unreadField]: 0 })
      .eq('id', conversationId);

    if (updateConversationError) throw updateConversationError;

    const { error: updateMessagesError } = await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (updateMessagesError) throw updateMessagesError;

    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function sendDirectMessage({ conversationId, senderId, receiverId, message }) {
  try {
    const text = String(message || '').trim();
    if (!text) {
      throw new Error('Message cannot be empty.');
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('direct_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError) throw conversationError;

    const { data, error } = await supabase
      .from('direct_messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          receiver_id: receiverId,
          message: text,
          is_read: false,
        },
      ])
      .select('*, sender:profiles!direct_messages_sender_id_fkey(id, name, avatar_url), receiver:profiles!direct_messages_receiver_id_fkey(id, name, avatar_url)')
      .single();

    if (error) throw error;

    const unreadField = receiverId === conversation.participant_a ? 'participant_a_unread' : 'participant_b_unread';
    const { error: updateError } = await supabase
      .from('direct_conversations')
      .update({
        last_message: conversationPreview(text),
        last_message_at: data.created_at,
        [unreadField]: Number(conversation[unreadField] || 0) + 1,
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    await supabase.from('notifications').insert([
      {
        user_id: receiverId,
        type: 'direct_message',
        title: 'New message',
        message: 'You received a new direct message.',
        link: `/student/chat?conversation=${conversationId}`,
      },
    ]).catch(() => {});

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function acceptDirectConversationRequest(conversationId, userId) {
  try {
    const { data: conversation, error: conversationError } = await supabase
      .from('direct_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError) throw conversationError;

    if (conversation.participant_a !== userId && conversation.participant_b !== userId) {
      throw new Error('You cannot accept this request.');
    }

    const { data, error } = await supabase
      .from('direct_conversations')
      .update({
        request_for: null,
        accepted_by_a: true,
        accepted_by_b: true,
      })
      .eq('id', conversationId)
      .select(DIRECT_CONVERSATION_SELECT)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}