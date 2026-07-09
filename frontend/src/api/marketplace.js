import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/pushNotifications';
import { uploadImage } from '../lib/cloudinary';
import { reportContent } from './community';

const CONVERSATION_SELECT = `
  *,
  listing:listings(
    id,
    title,
    price,
    images,
    is_sold,
    category,
    condition
  ),
  buyer:profiles!buyer_id(
    id,
    name,
    avatar_url,
    username,
    college
  ),
  seller:profiles!seller_id(
    id,
    name,
    avatar_url,
    username,
    college
  )
`;

function normalizeListingPayload(listing) {
  return {
    ...listing,
    seller_profile: listing?.seller || listing?.profiles || null,
  };
}

async function enrichListingsWithProfiles(listings) {
  if (!Array.isArray(listings) || !listings.length) {
    return [];
  }

  const sellerIds = Array.from(new Set(listings.map((listing) => listing?.seller_id).filter(Boolean)));
  if (!sellerIds.length) {
    return listings.map(normalizeListingPayload);
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, username, college, created_at')
    .in('id', sellerIds);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return listings.map((listing) => normalizeListingPayload({
    ...listing,
    seller: profileMap.get(listing.seller_id) || null,
  }));
}

function buildConversationPreview(messageType, message, offerAmount) {
  if (messageType === 'offer') {
    return `Offer sent: Rs ${offerAmount}`;
  }

  if (messageType === 'image') {
    return 'Photo shared';
  }

  return String(message || '').trim() || 'New message';
}

export async function getListings(filters = {}) {
  try {
    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.max(1, Math.min(40, Number(filters?.pageSize || 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('is_sold', false)
      .eq('is_admin_disabled', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.searchTerm) {
      const safeTerm = String(filters.searchTerm).trim();
      if (safeTerm) {
        query = query.or(`title.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%`);
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const enriched = await enrichListingsWithProfiles(data || []);
    return { data: enriched, count: count || 0, error: null };
  } catch (error) {
    return { data: null, count: 0, error };
  }
}

export async function getListingById(id) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;

    const [normalized] = await enrichListingsWithProfiles([data]);

    const { count } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', normalized.seller_id)
      .eq('is_sold', false);

    supabase.rpc('increment_listing_views', { listing_id: id }).catch(() => {});

    return {
      data: {
        ...normalized,
        seller_listing_count: count || 0,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createListing(listingData, files) {
  try {
    const imageUrls = [];
    if (files && files.length > 0) {
      for (const file of files.slice(0, 5)) {
        const { data: uploadData, error: uploadError } = await uploadImage(
          file,
          `campus-blink/listings/${listingData.seller_id}`
        );
        if (uploadError) throw uploadError;

        if (uploadData?.url) {
          imageUrls.push(uploadData.url);
        }
      }
    }

    const { data, error } = await supabase
      .from('listings')
      .insert([{ ...listingData, images: imageUrls }])
      .select('*')
      .single();

    if (error) throw error;
    const [enriched] = await enrichListingsWithProfiles([data]);
    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateListing(id, updates, files = null) {
  try {
    let nextImages = updates?.images || [];

    if (Array.isArray(files) && files.length > 0) {
      const uploaded = [];
      for (const file of files.slice(0, 5)) {
        const { data: uploadData, error: uploadError } = await uploadImage(
          file,
          `campus-blink/listings/${updates.seller_id || 'listing'}`
        );
        if (uploadError) throw uploadError;
        if (uploadData?.url) {
          uploaded.push(uploadData.url);
        }
      }
      nextImages = uploaded;
    }

    const { data, error } = await supabase
      .from('listings')
      .update({ ...updates, images: nextImages })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const [enriched] = await enrichListingsWithProfiles([data]);
    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteListing(id) {
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function markAsSold(id) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .update({ is_sold: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const [enriched] = await enrichListingsWithProfiles([data]);
    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMyListings(sellerId) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = await enrichListingsWithProfiles(data || []);
    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getWishlistIds(userId) {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select('listing_id')
      .eq('user_id', userId);
    if (error) throw error;
    return { data: (data || []).map((row) => row.listing_id), error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function toggleWishlist(userId, listingId) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing?.id) {
      const { error } = await supabase.from('wishlists').delete().eq('id', existing.id);
      if (error) throw error;
      return { data: { wished: false }, error: null };
    }

    const { error } = await supabase.from('wishlists').insert([{ user_id: userId, listing_id: listingId }]);
    if (error) throw error;
    return { data: { wished: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getWishlistedListings(userId, filters = {}) {
  try {
    const { data: wishlistRows, error: wishlistError } = await supabase
      .from('wishlists')
      .select('listing_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (wishlistError) throw wishlistError;

    const listingIds = (wishlistRows || []).map((row) => row.listing_id);
    if (!listingIds.length) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('listings')
      .select('*')
      .in('id', listingIds)
      .eq('is_admin_disabled', false)
      .order('created_at', { ascending: false });

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.searchTerm) {
      const safeTerm = String(filters.searchTerm).trim();
      if (safeTerm) {
        query = query.or(`title.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    const enriched = await enrichListingsWithProfiles(data || []);
    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function ensureConversation(listingId, buyerId, sellerId) {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return { data: existing, error: null };
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          last_message: '',
          last_message_at: new Date().toISOString(),
        },
      ])
      .select(CONVERSATION_SELECT)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getConversations(userId) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getConversationMessages(conversationId, userId) {
  try {
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', conversationId)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .single();

    if (conversationError) throw conversationError;

    const { data: messages, error: messagesError } = await supabase
      .from('listing_messages')
      .select('*, sender:profiles!sender_id(id, name, avatar_url), receiver:profiles!receiver_id(id, name, avatar_url)')
      .eq('listing_id', conversation.listing_id)
      .or(`and(sender_id.eq.${conversation.buyer_id},receiver_id.eq.${conversation.seller_id}),and(sender_id.eq.${conversation.seller_id},receiver_id.eq.${conversation.buyer_id})`)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return { data: { conversation, messages: messages || [] }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function markConversationRead(conversationId, userId) {
  try {
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError) throw conversationError;

    const updatePayload = conversation.buyer_id === userId
      ? { buyer_unread: 0 }
      : { seller_unread: 0 };

    const { error: updateConversationError } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId);

    if (updateConversationError) throw updateConversationError;

    const { error: markMessagesError } = await supabase
      .from('listing_messages')
      .update({ is_read: true })
      .eq('listing_id', conversation.listing_id)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (markMessagesError) throw markMessagesError;

    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function sendConversationMessage(payload) {
  try {
    const messageType = payload?.messageType || 'text';
    const message = String(payload?.message || '').trim();
    const imageUrl = payload?.imageUrl || null;
    const offerAmount = payload?.offerAmount != null ? Number(payload.offerAmount) : null;

    if (messageType === 'text' && !message) {
      throw new Error('Message cannot be empty.');
    }

    if (messageType === 'offer' && (!offerAmount || offerAmount <= 0)) {
      throw new Error('Offer amount must be greater than 0.');
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', payload.conversationId)
      .single();

    if (conversationError) throw conversationError;

    const { data, error } = await supabase
      .from('listing_messages')
      .insert([
        {
          listing_id: conversation.listing_id,
          sender_id: payload.senderId,
          receiver_id: payload.receiverId,
          message: messageType === 'offer' ? `Offer: Rs ${offerAmount}` : message,
          message_type: messageType,
          image_url: imageUrl,
          offer_amount: messageType === 'offer' ? offerAmount : null,
          offer_status: messageType === 'offer' ? 'pending' : null,
          is_read: false,
        },
      ])
      .select('*, sender:profiles!sender_id(id, name, avatar_url), receiver:profiles!receiver_id(id, name, avatar_url)')
      .single();

    if (error) throw error;

    const previewText = buildConversationPreview(messageType, message, offerAmount);
    const unreadField = payload.receiverId === conversation.buyer_id ? 'buyer_unread' : 'seller_unread';
    const unreadValue = Number(conversation[unreadField] || 0) + 1;

    const { error: conversationUpdateError } = await supabase
      .from('conversations')
      .update({
        last_message: previewText,
        last_message_at: new Date().toISOString(),
        [unreadField]: unreadValue,
      })
      .eq('id', conversation.id);

    if (conversationUpdateError) throw conversationUpdateError;

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', payload.senderId)
      .maybeSingle();

    await supabase.from('notifications').insert([
      {
        user_id: payload.receiverId,
        type: 'marketplace_interest',
        title: messageType === 'offer' ? 'New offer received' : 'New marketplace message',
        message: `${senderProfile?.name || 'Someone'} sent you ${messageType === 'offer' ? `an offer of Rs ${offerAmount}` : 'a new message'} on your listing.`,
        link: '/student/messages',
      },
    ]).catch(() => {});

    await sendPushNotification(payload.receiverId, {
      type: 'marketplace_message',
      title: messageType === 'offer' ? 'New offer received' : 'New marketplace message',
      body: `${senderProfile?.name || 'Someone'} sent you ${messageType === 'offer' ? `an offer of Rs ${offerAmount}` : 'a new message'} on your listing.`,
      url: '/student/messages',
      important: false,
    }).catch(() => {});

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadMarketplaceChatImage(userId, file) {
  try {
    const { data, error } = await uploadImage(file, `campus-blink/marketplace-chat/${userId}`);
    if (error) throw error;
    return { data: data?.url || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateOfferStatus(messageId, conversationId, actingUserId, status) {
  try {
    const { data: message, error: messageError } = await supabase
      .from('listing_messages')
      .update({ offer_status: status, is_read: true })
      .eq('id', messageId)
      .select('*')
      .single();

    if (messageError) throw messageError;

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError) throw conversationError;

    const receiverId = message.sender_id;
    const unreadField = receiverId === conversation.buyer_id ? 'buyer_unread' : 'seller_unread';

    await supabase
      .from('conversations')
      .update({
        last_message: `Offer ${status}`,
        last_message_at: new Date().toISOString(),
        [unreadField]: Number(conversation[unreadField] || 0) + 1,
      })
      .eq('id', conversationId);

    await supabase
      .from('notifications')
      .insert([
        {
          user_id: receiverId,
          type: 'marketplace_interest',
          title: `Offer ${status}`,
          message: `Your offer on a marketplace listing was ${status}.`,
          link: '/student/messages',
        },
      ])
      .catch(() => {});

    await sendPushNotification(receiverId, {
      type: 'marketplace_message',
      title: `Offer ${status}`,
      body: `Your offer on a marketplace listing was ${status}.`,
      url: '/student/messages',
      important: false,
    }).catch(() => {});

    return { data: message, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createListingReport(targetId, reporterId, reason, description) {
  return reportContent('listing', targetId, reporterId, reason, description);
}

export async function sendMessage(listingId, senderId, receiverId, message) {
  try {
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) throw listingError;

    const buyerId = senderId === listing?.seller_id ? receiverId : senderId;
    const sellerId = listing?.seller_id || receiverId;
    const { data: conversation, error: conversationError } = await ensureConversation(listingId, buyerId, sellerId);
    if (conversationError) throw conversationError;

    return sendConversationMessage({
      conversationId: conversation.id,
      senderId,
      receiverId,
      message,
      messageType: 'text',
    });
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMessages(listingId, userId) {
  try {
    const { data, error } = await supabase
      .from('listing_messages')
      .select('*, sender:profiles!sender_id(id, name, avatar_url), receiver:profiles!receiver_id(id, name, avatar_url)')
      .eq('listing_id', listingId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error };
  }
}
