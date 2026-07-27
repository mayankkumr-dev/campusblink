import { useEffect, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, IndianRupee, MessageCircle, Send, X, Search, Inbox, UserPlus, Image as ImageIcon, ChevronLeft, MoreVertical, FileText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import toast from 'react-hot-toast';
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
import { ImageWithFallback } from '../../shared/components/ImageWithFallback';

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
  const [activeTab, setActiveTab] = useState<'inbox' | 'requests'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${profile.id}` }, refreshConversationList)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `seller_id=eq.${profile.id}` }, refreshConversationList)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_messages', filter: `receiver_id=eq.${profile.id}` }, refreshConversationList)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_messages', filter: `sender_id=eq.${profile.id}` }, refreshConversationList)
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

  // Filter conversations for the UI tabs (placeholder logic for Inbox vs Requests)
  // Currently displaying all in Inbox until specific 'follow' logic is required by backend
  const filteredConversations = conversations.filter(c => {
    const isBuyer = c.buyer_id === profile?.id;
    const otherProfile = isBuyer ? c.seller : c.buyer;
    const searchMatch = (otherProfile?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (c.listing?.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!searchMatch) return false;
    if (activeTab === 'requests') return false; // Placeholder for requests
    return true;
  });

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-[1400px] h-[calc(100vh-3rem)] flex flex-col gap-6 animate-in fade-in duration-500">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight font-syne">Messages</h1>
            <p className="text-sm text-text-secondary mt-1 font-medium">Manage your marketplace conversations and offers.</p>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="flex-1 overflow-hidden bg-surface rounded-[2rem] border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row">
          
          {/* Sidebar: Conversation List */}
          <div className="w-full lg:w-[380px] flex flex-col border-b lg:border-b-0 lg:border-r border-border-subtle shrink-0 bg-white/50">
            
            {/* Sidebar Header & Tabs */}
            <div className="p-5 border-b border-border-subtle space-y-4 shrink-0 bg-surface">
              {/* Tab Toggle */}
              <div className="flex p-1 bg-surface-elevated/70 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('inbox')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-secondary hover:text-slate-700'}`}
                >
                  <Inbox className="w-4 h-4" />
                  Inbox
                </button>
                <button 
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'requests' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-secondary hover:text-slate-700'}`}
                >
                  <UserPlus className="w-4 h-4" />
                  Requests
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/70" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..." 
                  className="w-full bg-surface border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:bg-surface focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all text-text-primary placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-3 space-y-1">
              {isLoading ? (
                <div className="space-y-2">
                  {new Array(5).fill(null).map((_, index) => (
                    <div key={index} className="rounded-2xl p-4 animate-pulse flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-surface-elevated shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 w-1/2 rounded-md bg-surface-elevated" />
                        <div className="h-3 w-4/5 rounded-md bg-surface-elevated/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => {
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
                      className={`w-full flex items-start gap-3.5 p-3.5 rounded-2xl text-left transition-all group ${
                        isActive 
                          ? 'bg-amber-50/50 shadow-xs ring-1 ring-amber-200/60' 
                          : 'bg-transparent hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-border-subtle bg-surface-elevated">
                          {otherProfile?.avatar_url ? (
                            <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-text-secondary/70">
                              {(otherProfile?.name || otherProfile?.username || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-rose-500 border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white px-1">
                            {unreadCount}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="truncate text-sm font-bold text-text-primary">{getProfileName(otherProfile)}</div>
                          <div className={`text-[10px] font-semibold whitespace-nowrap ${isActive ? 'text-accent-amber' : 'text-text-secondary/70'}`}>
                            {formatMarketplaceTime(conversation.last_message_at)}
                          </div>
                        </div>
                        <div className="truncate text-[11px] font-semibold text-text-secondary mb-1">
                          {conversation.listing?.title || 'Marketplace Item'}
                        </div>
                        <div className="truncate text-xs text-text-secondary font-medium">
                          {conversation.last_message || 'Say hi to start the deal.'}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center opacity-70">
                  <MessageCircle className="w-10 h-10 text-text-placeholder mb-3 stroke-[1.5]" />
                  <p className="text-sm font-bold text-text-secondary">No conversations</p>
                  <p className="text-xs text-text-secondary/70 mt-1">
                    {activeTab === 'requests' ? "You don't have any message requests." : "When you contact a seller, it'll appear here."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="h-[76px] flex items-center justify-between gap-4 px-6 border-b border-border-subtle bg-surface shrink-0">
                  <div className="flex items-center gap-4">
                    {/* Mobile back button placeholder (can be implemented later) */}
                    <div className="w-10 h-10 rounded-full border border-border-subtle bg-surface overflow-hidden shrink-0 hidden sm:block">
                      {peerProfile?.avatar_url ? (
                        <img src={peerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-text-secondary/70">
                          {(peerProfile?.name || peerProfile?.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary tracking-tight">{getProfileName(peerProfile)}</h2>
                      <p className="text-xs text-text-secondary font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                        Online recently
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link 
                      to={`/student/buy-sell/${activeConversation.listing_id}`} 
                      className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-border-subtle bg-surface text-xs font-bold text-text-primary hover:bg-surface-elevated transition-all shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-text-secondary/70" />
                      View Listing
                    </Link>
                    <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-elevated text-text-secondary/70 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Listing Context Banner */}
                <div className="px-6 py-3 border-b border-border-subtle bg-surface  shrink-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-elevated overflow-hidden border border-border-subtle shrink-0">
                    <ImageWithFallback src={getListingImage(activeConversation.listing || undefined)} alt={activeConversation.listing?.title || 'Listing'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div className="truncate text-sm font-bold text-text-primary">{activeConversation.listing?.title}</div>
                    <div className="text-sm font-extrabold text-text-primary bg-surface-elevated px-2 py-1 rounded-md">{formatPrice(activeConversation.listing?.price)}</div>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
                  {isLoadingMessages ? (
                    <div className="space-y-4">
                      {new Array(3).fill(null).map((_, index) => (
                        <div key={index} className={`flex ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                          <div className="h-12 w-48 animate-pulse rounded-2xl bg-surface-elevated" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length ? (
                    messages.map((message) => {
                      const isOwn = message.sender_id === profile?.id;
                      const isIncomingOffer = message.message_type === 'offer' && !isOwn;
                      const canRespondToOffer = isIncomingOffer && profile?.id === activeConversation.seller_id && message.offer_status === 'pending';

                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]">
                            <div 
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                                isOwn 
                                  ? 'bg-slate-900 text-white rounded-tr-sm' 
                                  : 'bg-surface border border-border-subtle text-text-primary rounded-tl-sm'
                              }`}
                            >
                              {message.message_type === 'image' && message.image_url ? (
                                <ImageWithFallback src={message.image_url} alt="Shared in chat" className="mb-2 max-h-60 w-full rounded-xl object-cover border border-black/5" />
                              ) : null}

                              {message.message_type === 'offer' ? (
                                <div className="min-w-[200px]">
                                  <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isOwn ? 'bg-white/20 text-white' : 'bg-amber-100/50 text-accent-amber'}`}>
                                    <IndianRupee className="h-3 w-3" />
                                    Offer Received
                                  </div>
                                  <div className="mt-2 text-2xl font-black tracking-tight">{formatPrice(message.offer_amount)}</div>
                                  <div className={`mt-1 text-xs font-medium ${isOwn ? 'text-white/70' : 'text-text-secondary'}`}>
                                    {message.offer_status === 'accepted' ? 'Offer accepted 🎉' : message.offer_status === 'rejected' ? 'Offer declined' : 'Pending response...'}
                                  </div>
                                  {canRespondToOffer ? (
                                    <div className="mt-4 flex flex-col gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleOfferDecision(message.id, 'accepted')}
                                        className="w-full flex justify-center items-center gap-2 rounded-xl bg-accent-green hover:bg-emerald-600 transition-colors px-4 py-2.5 text-xs font-bold text-white shadow-xs"
                                      >
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                        Accept Offer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOfferDecision(message.id, 'rejected')}
                                        className="w-full flex justify-center items-center gap-2 rounded-xl bg-surface text-text-primary hover:bg-surface-elevated transition-colors px-4 py-2.5 text-xs font-bold shadow-xs border border-border-subtle"
                                      >
                                        <X className="h-3.5 w-3.5 stroke-[3]" />
                                        Decline
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : message.message ? (
                                <div>{message.message}</div>
                              ) : null}
                            </div>
                            <div className={`text-[10px] font-medium text-text-secondary/70 ${isOwn ? 'text-right pr-1' : 'text-left pl-1'}`}>
                              {formatMarketplaceTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                       <div className="w-16 h-16 rounded-full bg-accent-amber-soft flex items-center justify-center">
                         <MessageCircle className="w-8 h-8 text-accent-amber" />
                       </div>
                       <div>
                         <h3 className="text-base font-bold text-text-primary">Start the conversation</h3>
                         <p className="text-sm text-text-secondary mt-1 max-w-sm">Ask about the condition, pickup point, or send a quick offer to get started.</p>
                       </div>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="p-4 bg-surface border-t border-border-subtle shrink-0">
                  <AnimatePresence>
                    {showOfferComposer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex flex-col sm:flex-row gap-3">
                           <div className="flex-1 relative">
                             <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/70" />
                             <input
                               value={offerAmount}
                               onChange={(event) => setOfferAmount(event.target.value.replace(/[^0-9]/g, ''))}
                               placeholder="Enter your offer..."
                               className="w-full bg-surface border border-border-subtle rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold text-text-primary outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all"
                             />
                           </div>
                           <button
                             type="button"
                             onClick={handleSendOffer}
                             disabled={isSending || !offerAmount.trim()}
                             className="rounded-xl bg-amber-500 hover:bg-amber-600 transition-colors px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-xs shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center shrink-0"
                           >
                             Send Offer
                           </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2">
                    <label className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-elevated text-text-secondary/70 transition-colors cursor-pointer border border-border-subtle">
                      <ImageIcon className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                    </label>
                    <div className="flex-1 flex items-center rounded-2xl border border-border-subtle bg-surface px-4 focus-within:bg-white focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-100 transition-all h-12">
                      <input
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleSendTextMessage();
                          }
                        }}
                        placeholder="Write a message..."
                        className="w-full bg-transparent text-sm text-text-primary placeholder:text-slate-400 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOfferComposer((prev) => !prev)}
                      className={`shrink-0 px-4 h-12 rounded-xl text-sm font-bold transition-all shadow-xs flex items-center gap-2 ${showOfferComposer ? 'bg-slate-900 text-white' : 'bg-surface border border-border-subtle text-text-primary hover:bg-surface-elevated'}`}
                    >
                      <IndianRupee className="w-4 h-4" />
                      <span className="hidden sm:inline">Offer</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTextMessage}
                      disabled={isSending || !messageDraft.trim()}
                      className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 translate-x-px -translate-y-px" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-background">
                 <div className="w-32 h-32 mb-6 opacity-80">
                   {/* Clean geometric empty state illustration */}
                   <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="25" y="40" width="150" height="120" rx="24" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="4"/>
                      <circle cx="65" cy="75" r="16" fill="#F1F5F9" />
                      <rect x="95" y="65" width="60" height="8" rx="4" fill="#F1F5F9" />
                      <rect x="95" y="81" width="40" height="8" rx="4" fill="#F1F5F9" />
                      
                      <rect x="135" y="115" width="40" height="28" rx="14" fill="#0F172A" />
                      <rect x="55" y="115" width="70" height="28" rx="14" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2"/>
                   </svg>
                 </div>
                 <h2 className="text-xl font-extrabold text-text-primary mb-2">No conversation selected</h2>
                 <p className="text-sm text-text-secondary max-w-sm text-center mb-8">
                   Select a thread from the sidebar to view your messages, send offers, and finalize deals.
                 </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
