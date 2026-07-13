const { supabaseAdmin, supabase } = require('../config/supabase');
const sbClient = supabaseAdmin || supabase;

// Ensure participant_a < participant_b (DB check constraint requirement)
const sortedParticipants = (a, b) =>
  a < b ? { participant_a: a, participant_b: b } : { participant_a: b, participant_b: a };

// Find conversation between two users
const findConversation = async (userA, userB) => {
  const { participant_a, participant_b } = sortedParticipants(userA, userB);
  const { data } = await sbClient
    .from('direct_conversations')
    .select('*')
    .eq('participant_a', participant_a)
    .eq('participant_b', participant_b)
    .maybeSingle();
  return data || null;
};

// Map DB row to frontend-compatible shape
const mapConversation = (conv, myId) => {
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
};

// Map message row to frontend shape
const mapMessage = (m) => ({
  _id: m.id,
  conversationId: m.conversation_id,
  senderId: m.sender_id,
  receiverId: m.receiver_id,
  text: m.message,
  isRead: m.is_read,
  createdAt: m.created_at,
  deletedBy: m.deleted_by || [],
  editedAt: m.edited_at || null,
});

// Check mutual follow
const checkMutualFollow = async (userA, userB) => {
  const [{ data: aFollowsB }, { data: bFollowsA }] = await Promise.all([
    sbClient.from('follows').select('id').eq('follower_id', userA).eq('following_id', userB).maybeSingle(),
    sbClient.from('follows').select('id').eq('follower_id', userB).eq('following_id', userA).maybeSingle(),
  ]);
  return !!aFollowsB && !!bFollowsA;
};

// ─── SEND MESSAGE ───────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.profile.id;

    if (!receiverId || !text) {
      return res.status(400).json({ error: 'Receiver ID and text are required' });
    }

    // Check receiver privacy settings
    const { data: prefs } = await sbClient
      .from('user_preferences').select('message_privacy').eq('user_id', receiverId).maybeSingle();
    const privacy = prefs?.message_privacy || 'Your Followers';

    if (privacy === 'Nobody') {
      return res.status(403).json({ error: 'This user is not accepting messages.' });
    }
    if (privacy === 'Your Followers') {
      const { data: followCheck } = await sbClient
        .from('follows').select('id').eq('follower_id', senderId).eq('following_id', receiverId).maybeSingle();
      if (!followCheck) {
        return res.status(403).json({ error: 'You must follow this user to send them a message.' });
      }
    }

    // Find or create conversation
    let conversation = await findConversation(senderId, receiverId);

    if (!conversation) {
      const isMutual = await checkMutualFollow(senderId, receiverId);
      const { participant_a, participant_b } = sortedParticipants(senderId, receiverId);
      const isRequest = !isMutual;
      const senderIsA = participant_a === senderId;

      const { data: newConv, error: convError } = await sbClient
        .from('direct_conversations')
        .insert({
          participant_a,
          participant_b,
          request_for: isRequest ? receiverId : null,
          accepted_by_a: senderIsA ? true : !isRequest,
          accepted_by_b: senderIsA ? !isRequest : true,
        })
        .select().single();
      if (convError) throw convError;
      conversation = newConv;
    } else {
      // Conversation exists — block sender from sending more if request is still pending
      if (conversation.request_for === receiverId) {
        return res.status(403).json({ 
          error: 'Cannot send more messages until your request is accepted.' 
        });
      }
    }

    // Insert message
    const { data: message, error: msgError } = await sbClient
      .from('direct_messages')
      .insert({ conversation_id: conversation.id, sender_id: senderId, receiver_id: receiverId, message: text })
      .select().single();
    if (msgError) throw msgError;

    // Update last message
    await sbClient.from('direct_conversations')
      .update({ last_message: text, last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    const mappedConv = mapConversation(conversation, senderId);
    const mappedMsg = mapMessage(message);

    const io = req.app.get('io');
    if (io) {
      io.to(receiverId).emit('newMessage', { message: mappedMsg, conversationId: mappedConv._id });
      if (mappedConv.isRequest) {
        io.to(receiverId).emit('newMessageRequest', { conversationId: mappedConv._id });
      }
    }

    res.status(201).json({ message: mappedMsg, conversation: mappedConv });
  } catch (err) {
    console.error('[sendMessage] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET CONVERSATIONS ───────────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const userId = req.profile.id;
    const [{ data: asA, error: errA }, { data: asB, error: errB }] = await Promise.all([
      sbClient.from('direct_conversations').select('*').eq('participant_a', userId).order('last_message_at', { ascending: false }),
      sbClient.from('direct_conversations').select('*').eq('participant_b', userId).order('last_message_at', { ascending: false }),
    ]);
    if (errA) throw errA;
    if (errB) throw errB;

    const seen = new Set();
    const all = [...(asA || []), ...(asB || [])]
      .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
      .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    const active = [], requests = [];
    for (const conv of all) {
      const mapped = mapConversation(conv, userId);
      // Only put in requests if I'm the RECEIVER who needs to act
      if (mapped.isRequest && mapped.requestFor === userId) {
        requests.push(mapped);
      } else {
        active.push(mapped);
      }
    }
    res.json({ active, requests });
  } catch (err) {
    console.error('[getConversations] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET MESSAGES ────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.profile.id;

    const { data: conv, error: convError } = await sbClient
      .from('direct_conversations').select('*').eq('id', conversationId)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`).single();
    if (convError || !conv) return res.status(404).json({ error: 'Conversation not found' });

    const { data: messages, error: msgError } = await sbClient
      .from('direct_messages').select('*').eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (msgError) throw msgError;

    const mapped = messages.map(mapMessage);

    // Mark as read in background
    sbClient.from('direct_messages').update({ is_read: true })
      .eq('conversation_id', conversationId).eq('receiver_id', userId).eq('is_read', false).then();

    res.json(mapped);
  } catch (err) {
    console.error('[getMessages] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── ACCEPT REQUEST ──────────────────────────────────────────────────────────
exports.acceptRequest = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.profile.id;

    const { data: conv, error } = await sbClient
      .from('direct_conversations').select('*').eq('id', conversationId).eq('request_for', userId).single();
    if (error || !conv) return res.status(404).json({ error: 'Conversation request not found' });

    const isParticipantA = conv.participant_a === userId;
    const { data: updated, error: updateError } = await sbClient
      .from('direct_conversations')
      .update({ ...(isParticipantA ? { accepted_by_a: true } : { accepted_by_b: true }), request_for: null })
      .eq('id', conversationId).select().single();
    if (updateError) throw updateError;

    res.json({ success: true, conversation: mapConversation(updated, userId) });
  } catch (err) {
    console.error('[acceptRequest] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET UNREAD COUNT ────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.profile.id;
    const { count, error } = await sbClient
      .from('direct_messages').select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId).eq('is_read', false);
    if (error) throw error;
    res.json({ unreadCount: count || 0 });
  } catch (err) {
    console.error('[getUnreadCount] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── DELETE SINGLE MESSAGE ───────────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor } = req.body; // 'me' | 'everyone'
    const userId = req.profile.id;

    const { data: msg, error } = await sbClient
      .from('direct_messages').select('*').eq('id', messageId).single();
    if (error || !msg) return res.status(404).json({ error: 'Message not found' });

    // Verify user is part of this conversation
    const { data: conv } = await sbClient.from('direct_conversations').select('id')
      .eq('id', msg.conversation_id)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`).single();
    if (!conv) return res.status(403).json({ error: 'Access denied' });

    if (deleteFor === 'everyone') {
      if (msg.sender_id !== userId) {
        return res.status(403).json({ error: 'You can only delete your own messages for everyone.' });
      }
      await sbClient.from('direct_messages').delete().eq('id', messageId);
    } else {
      // Delete for me — add userId to deleted_by array
      const deletedBy = [...(msg.deleted_by || [])];
      if (!deletedBy.includes(userId)) deletedBy.push(userId);
      await sbClient.from('direct_messages').update({ deleted_by: deletedBy }).eq('id', messageId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[deleteMessage] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── DELETE MESSAGES BATCH ───────────────────────────────────────────────────
exports.deleteMessagesBatch = async (req, res) => {
  try {
    const { messageIds, deleteFor } = req.body;
    const userId = req.profile.id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'No message IDs provided' });
    }

    const { data: msgs } = await sbClient
      .from('direct_messages').select('id, sender_id, deleted_by, conversation_id').in('id', messageIds);
    if (!msgs || msgs.length === 0) return res.status(404).json({ error: 'Messages not found' });

    if (deleteFor === 'everyone') {
      // Only delete messages the user sent
      const ownIds = msgs.filter(m => m.sender_id === userId).map(m => m.id);
      if (ownIds.length > 0) {
        await sbClient.from('direct_messages').delete().in('id', ownIds);
      }
    } else {
      // Delete for me — add userId to deleted_by for each message
      for (const msg of msgs) {
        const deletedBy = [...(msg.deleted_by || [])];
        if (!deletedBy.includes(userId)) {
          deletedBy.push(userId);
          await sbClient.from('direct_messages').update({ deleted_by: deletedBy }).eq('id', msg.id);
        }
      }
    }

    res.json({ success: true, count: messageIds.length });
  } catch (err) {
    console.error('[deleteMessagesBatch] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── DELETE CONVERSATION ─────────────────────────────────────────────────────
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.profile.id;

    const { data: conv, error } = await sbClient.from('direct_conversations').select('id')
      .eq('id', conversationId)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`).single();
    if (error || !conv) return res.status(403).json({ error: 'Access denied' });

    // Delete all messages first, then the conversation
    await sbClient.from('direct_messages').delete().eq('conversation_id', conversationId);
    await sbClient.from('direct_conversations').delete().eq('id', conversationId);

    res.json({ success: true });
  } catch (err) {
    console.error('[deleteConversation] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── EDIT MESSAGE ────────────────────────────────────────────────────────────
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.profile.id;

    if (!text?.trim()) return res.status(400).json({ error: 'Message text is required' });

    const { data: msg, error } = await sbClient
      .from('direct_messages').select('*').eq('id', messageId).single();
    if (error || !msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_id !== userId) return res.status(403).json({ error: 'Cannot edit someone else\'s message' });

    const { data: updated, error: updateError } = await sbClient
      .from('direct_messages')
      .update({ message: text.trim(), edited_at: new Date().toISOString() })
      .eq('id', messageId).select().single();
    if (updateError) throw updateError;

    res.json(mapMessage(updated));
  } catch (err) {
    console.error('[editMessage] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
