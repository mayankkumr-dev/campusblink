import { useEffect, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, IndianRupee, MessageCircle, Send, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import {
  getConversationMessages,
  getConversations,
  markConversationRead,
  sendConversationMessage,
  updateOfferStatus,
  uploadMarketplaceChatImage,
} from '../../api/marketplace';
import {
  MarketplaceAvatar,
  MarketplaceConversation,
  MarketplaceEmptyState,
  MarketplaceMessage,
  formatMarketplaceTime,
  formatPrice,
  getListingImage,
  getProfileName,
} from './marketplace/marketplaceShared';
import { ImageWithFallback } from './figma/ImageWithFallback';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

export function MarketplaceMessagesPage() {
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<MarketplaceConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<MarketplaceConversation | null>(null);
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [showOfferComposer, setShowOfferComposer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    loadConversations();
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const refreshConversationList = () => {
      loadConversations();
      if (activeConversation?.id) {
        loadConversation(activeConversation.id);
      }
    };

    const channel = supabase.channel(`marketplace-messages-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `buyer_id=eq.${profile.id}`,
      }, refreshConversationList)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `seller_id=eq.${profile.id}`,
      }, refreshConversationList)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listing_messages',
        filter: `receiver_id=eq.${profile.id}`,
      }, refreshConversationList)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listing_messages',
        filter: `sender_id=eq.${profile.id}`,
      }, refreshConversationList)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id, profile?.id]);

  async function loadConversations() {
    if (!profile?.id) return;
    setIsLoading(true);
    const { data, error } = await getConversations(profile.id);
    setIsLoading(false);

    if (error) {
      toast.error(getErrorMessage(error, 'Could not load conversations.'));
      return;
    }

    const nextConversations = data || [];
    setConversations(nextConversations);

    const requestedConversationId = searchParams.get('conversation');
    const nextActiveConversation = nextConversations.find((item) => item.id === requestedConversationId)
      || nextConversations.find((item) => item.id === activeConversation?.id)
      || nextConversations[0]
      || null;

    if (nextActiveConversation) {
      setActiveConversation(nextActiveConversation);
      loadConversation(nextActiveConversation.id);
      if (requestedConversationId !== nextActiveConversation.id) {
        setSearchParams({ conversation: nextActiveConversation.id });
      }
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }

  async function loadConversation(conversationId: string) {
    if (!profile?.id) return;
    setIsLoadingMessages(true);

    const { data, error } = await getConversationMessages(conversationId, profile.id);
    setIsLoadingMessages(false);

    if (error || !data) {
      toast.error(getErrorMessage(error, 'Could not load messages.'));
      return;
    }

    setActiveConversation(data.conversation);
    setMessages(data.messages || []);
    await markConversationRead(conversationId, profile.id);
  }

  async function handleSendTextMessage() {
    if (!profile?.id || !activeConversation || !messageDraft.trim()) return;

    const receiverId = profile.id === activeConversation.buyer_id ? activeConversation.seller_id : activeConversation.buyer_id;

    setIsSending(true);
    const { error } = await sendConversationMessage({
      conversationId: activeConversation.id,
      senderId: profile.id,
      receiverId,
      message: messageDraft.trim(),
      messageType: 'text',
    });
    setIsSending(false);

    if (error) {
      toast.error(getErrorMessage(error, 'Could not send message.'));
      return;
    }

    setMessageDraft('');
    loadConversation(activeConversation.id);
    loadConversations();
  }

  async function handleSendOffer() {
    if (!profile?.id || !activeConversation || !offerAmount.trim()) return;

    const receiverId = profile.id === activeConversation.buyer_id ? activeConversation.seller_id : activeConversation.buyer_id;

    setIsSending(true);
    const { error } = await sendConversationMessage({
      conversationId: activeConversation.id,
      senderId: profile.id,
      receiverId,
      offerAmount: Number(offerAmount),
      messageType: 'offer',
    });
    setIsSending(false);

    if (error) {
      toast.error(getErrorMessage(error, 'Could not send offer.'));
      return;
    }

    setOfferAmount('');
    setShowOfferComposer(false);
    loadConversation(activeConversation.id);
    loadConversations();
  }

  async function handleUploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !profile?.id || !activeConversation) return;

    const receiverId = profile.id === activeConversation.buyer_id ? activeConversation.seller_id : activeConversation.buyer_id;
    setIsSending(true);
    const uploadResult = await uploadMarketplaceChatImage(profile.id, file);

    if (uploadResult.error || !uploadResult.data) {
      setIsSending(false);
      toast.error(getErrorMessage(uploadResult.error, 'Could not upload image.'));
      return;
    }

    const sendResult = await sendConversationMessage({
      conversationId: activeConversation.id,
      senderId: profile.id,
      receiverId,
      messageType: 'image',
      imageUrl: uploadResult.data,
      message: 'Image shared',
    });
    setIsSending(false);

    if (sendResult.error) {
      toast.error(getErrorMessage(sendResult.error, 'Could not send image.'));
      return;
    }

    loadConversation(activeConversation.id);
    loadConversations();
  }

  async function handleOfferDecision(messageId: string, status: 'accepted' | 'rejected') {
    if (!profile?.id || !activeConversation) return;

    const { error } = await updateOfferStatus(messageId, activeConversation.id, profile.id, status);
    if (error) {
      toast.error(getErrorMessage(error, `Could not ${status} offer.`));
      return;
    }

    toast.success(`Offer ${status}.`);
    loadConversation(activeConversation.id);
    loadConversations();
  }

  const currentUserIsBuyer = activeConversation ? activeConversation.buyer_id === profile?.id : false;
  const peerProfile = activeConversation
    ? currentUserIsBuyer
      ? activeConversation.seller
      : activeConversation.buyer
    : null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-secondary)_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-black/8 bg-[var(--bg)] px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--yellow-dark)]">Marketplace inbox</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)]">Messages and offers</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/student/buy-sell" className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              Browse listings
            </Link>
            <Link to="/student/wishlist" className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              Wishlist
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <section className="overflow-hidden rounded-[32px] border border-black/8 bg-[var(--bg)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <div className="border-b border-black/8 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--yellow-dark)]">All conversations</div>
              <div className="mt-1 text-lg font-black tracking-tight text-[var(--text-primary)]">{conversations.length} active threads</div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {new Array(5).fill(null).map((_, index) => (
                    <div key={index} className="rounded-[24px] bg-[var(--bg-secondary)] p-4 animate-pulse">
                      <div className="h-4 w-1/2 rounded-md bg-[var(--bg)]/80" />
                      <div className="mt-3 h-3 w-4/5 rounded-md bg-[var(--bg)]/80" />
                    </div>
                  ))}
                </div>
              ) : conversations.length ? (
                <div className="space-y-2 p-3">
                  {conversations.map((conversation) => {
                    const isBuyer = conversation.buyer_id === profile?.id;
                    const otherProfile = isBuyer ? conversation.seller : conversation.buyer;
                    const unreadCount = isBuyer ? conversation.buyer_unread || 0 : conversation.seller_unread || 0;
                    const isActive = conversation.id === activeConversation?.id;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => {
                          setActiveConversation(conversation);
                          setSearchParams({ conversation: conversation.id });
                          loadConversation(conversation.id);
                        }}
                        className={`w-full rounded-[24px] border p-4 text-left transition ${isActive ? 'border-[var(--yellow)] bg-[var(--bg-primary)]' : 'border-transparent bg-[var(--bg)] hover:bg-[var(--bg-secondary)]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <MarketplaceAvatar profile={otherProfile} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm font-bold text-[var(--text-primary)]">{getProfileName(otherProfile)}</div>
                              <div className="text-[11px] text-[var(--text-secondary)]">{formatMarketplaceTime(conversation.last_message_at)}</div>
                            </div>
                            <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">{conversation.listing?.title || 'Marketplace listing'}</div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <div className="truncate text-sm text-[var(--text-secondary)]">{conversation.last_message || 'Say hi to start the deal.'}</div>
                              {unreadCount ? (
                                <div className="inline-flex min-w-6 items-center justify-center rounded-md bg-[var(--yellow)] px-2 py-1 text-[10px] font-black text-[var(--text-primary)]">
                                  {unreadCount}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4">
                  <MarketplaceEmptyState
                    title="No conversations yet"
                    description="When you message a seller or someone contacts you, the thread will appear here."
                    action={
                      <Link to="/student/buy-sell" className="rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                        Browse listings
                      </Link>
                    }
                  />
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-black/8 bg-[var(--bg)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            {activeConversation ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/8 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <MarketplaceAvatar profile={peerProfile} size="md" />
                    <div>
                      <div className="text-lg font-black tracking-tight text-[var(--text-primary)]">{getProfileName(peerProfile)}</div>
                      <div className="text-sm text-[var(--text-secondary)]">{activeConversation.listing?.title || 'Marketplace listing'}</div>
                    </div>
                  </div>
                  <Link to={`/student/buy-sell/${activeConversation.listing_id}`} className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                    View listing
                  </Link>
                </div>

                <div className="border-b border-black/8 bg-[var(--bg-primary)] px-5 py-3">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback src={getListingImage(activeConversation.listing || undefined)} alt={activeConversation.listing?.title || 'Listing'} className="h-14 w-14 rounded-[18px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[var(--text-primary)]">{activeConversation.listing?.title}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">{formatPrice(activeConversation.listing?.price)}</div>
                    </div>
                  </div>
                </div>

                <div className="max-h-[58vh] space-y-4 overflow-y-auto bg-[linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-secondary)_100%)] px-4 py-5 sm:px-5">
                  {isLoadingMessages ? (
                    <div className="space-y-3">
                      {new Array(4).fill(null).map((_, index) => (
                        <div key={index} className="h-16 w-3/4 animate-pulse rounded-[24px] bg-[var(--bg)]/80" />
                      ))}
                    </div>
                  ) : messages.length ? messages.map((message) => {
                    const isOwn = message.sender_id === profile?.id;
                    const isIncomingOffer = message.message_type === 'offer' && !isOwn;
                    const canRespondToOffer = isIncomingOffer && profile?.id === activeConversation.seller_id && message.offer_status === 'pending';

                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[86%] rounded-[28px] px-4 py-3 shadow-sm ${isOwn ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg)] text-[var(--text-primary)]'}`}>
                          {message.message_type === 'image' && message.image_url ? (
                            <ImageWithFallback src={message.image_url} alt="Shared in chat" className="mb-3 max-h-72 w-full rounded-[20px] object-cover" />
                          ) : null}

                          {message.message_type === 'offer' ? (
                            <div>
                              <div className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${isOwn ? 'bg-[var(--bg)]/12 text-[var(--yellow)]' : 'bg-[var(--yellow-light)] text-[var(--yellow-dark)]'}`}>
                                <IndianRupee className="h-3.5 w-3.5" />
                                Offer
                              </div>
                              <div className="mt-3 text-2xl font-black tracking-tight">{formatPrice(message.offer_amount)}</div>
                              <div className={`mt-2 text-sm ${isOwn ? 'text-white/72' : 'text-[var(--text-secondary)]'}`}>
                                {message.offer_status === 'accepted' ? 'Offer accepted' : message.offer_status === 'rejected' ? 'Offer rejected' : 'Waiting for response'}
                              </div>
                              {canRespondToOffer ? (
                                <div className="mt-4 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOfferDecision(message.id, 'accepted')}
                                    className="inline-flex items-center gap-2 rounded-md bg-[var(--yellow)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-primary)]"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOfferDecision(message.id, 'rejected')}
                                    className="inline-flex items-center gap-2 rounded-md border border-black/10 px-4 py-2 text-xs font-semibold text-[var(--text-primary)]"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Reject
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : message.message ? (
                            <div className="text-sm leading-6">{message.message}</div>
                          ) : null}

                          <div className={`mt-2 text-[11px] ${isOwn ? 'text-white/55' : 'text-[var(--text-secondary)]'}`}>{formatMarketplaceTime(message.created_at)}</div>
                        </div>
                      </div>
                    );
                  }) : (
                    <MarketplaceEmptyState
                      title="Start the conversation"
                      description="Ask about condition, pickup point, or send a quick offer."
                    />
                  )}
                </div>

                <div className="border-t border-black/8 bg-[var(--bg)] p-4 sm:p-5">
                  <AnimatePresence>
                    {showOfferComposer ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 overflow-hidden rounded-[24px] bg-[var(--bg-primary)] p-4"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--yellow-dark)]">Send an offer</div>
                        <div className="mt-3 flex gap-3">
                          <div className="relative flex-1">
                            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                            <input
                              value={offerAmount}
                              onChange={(event) => setOfferAmount(event.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="Enter offer amount"
                              className="w-full rounded-md border border-black/10 bg-[var(--bg)] px-10 py-3 text-sm outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSendOffer}
                            disabled={isSending}
                            className="rounded-md bg-[var(--yellow)] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-primary)] disabled:opacity-60"
                          >
                            Send offer
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex min-w-[220px] flex-1 items-center rounded-md border border-black/10 bg-[var(--bg-primary)] px-4 py-3">
                      <input
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleSendTextMessage();
                          }
                        }}
                        placeholder="Type a message"
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                    <label className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-md border border-black/10 bg-[var(--bg)] text-[var(--text-primary)]">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowOfferComposer((current) => !current)}
                      className={`rounded-md px-4 py-3 text-sm font-semibold ${showOfferComposer ? 'bg-[var(--text-primary)] text-white' : 'border border-black/10 bg-[var(--bg)] text-[var(--text-primary)]'}`}
                    >
                      Offer
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTextMessage}
                      disabled={isSending || !messageDraft.trim()}
                      className="inline-flex items-center gap-2 rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5">
                <MarketplaceEmptyState
                  title="Pick a conversation"
                  description="Your active marketplace threads will open here with images, offers, and quick replies."
                  action={
                    <Link to="/student/buy-sell" className="rounded-md bg-[var(--yellow)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                      Browse marketplace
                    </Link>
                  }
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
