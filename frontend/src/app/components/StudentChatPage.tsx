import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Loader2, MessageCircle, Search, Send } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getAvatarDataUrl } from '../../lib/avatar';
import {
  acceptDirectConversationRequest,
  ensureDirectConversation,
  getDirectConversationMessages,
  getDirectConversations,
  markDirectConversationRead,
  sendDirectMessage,
} from '../../api/directChat';

type ChatMessage = {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type ChatPerson = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
};

type DirectConversation = {
  id: string;
  participant_a: string;
  participant_b: string;
  context_type: 'product' | 'roommate' | 'general';
  context_title: string;
  last_message: string;
  last_message_at: string;
  participant_a_unread: number;
  participant_b_unread: number;
  request_for: string | null;
  accepted_by_a: boolean;
  accepted_by_b: boolean;
  participantA: ChatPerson | null;
  participantB: ChatPerson | null;
};

function getPeerProfile(conversation: DirectConversation | null, viewerId: string | undefined) {
  if (!conversation || !viewerId) return null;
  return conversation.participant_a === viewerId ? conversation.participantB : conversation.participantA;
}

export const StudentChatPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [networkUserIds, setNetworkUserIds] = useState<string[]>([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState<ChatPerson[]>([]);
  const [isPeopleLoading, setIsPeopleLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'chats' | 'requests'>('chats');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;

    async function loadNetwork() {
      const [followingResult, followerResult] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', profile.id),
        supabase.from('follows').select('follower_id').eq('following_id', profile.id),
      ]);

      if (!active) return;

      const ids = new Set<string>();
      (followingResult.data || []).forEach((item: any) => ids.add(item.following_id));
      (followerResult.data || []).forEach((item: any) => ids.add(item.follower_id));
      ids.delete(profile.id);
      setNetworkUserIds(Array.from(ids));
    }

    loadNetwork();
    return () => {
      active = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const load = async () => {
      setIsLoadingConversations(true);
      const { data } = await getDirectConversations(profile.id);
      setConversations((data || []) as DirectConversation[]);
      setIsLoadingConversations(false);
    };

    load();

    const refresh = () => {
      load();
      const selectedId = searchParams.get('conversation') || activeConversationId;
      if (selectedId) {
        void loadMessages(selectedId);
      }
    };

    const channel = supabase
      .channel(`direct-chat-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_conversations',
        filter: `participant_a=eq.${profile.id}`,
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_conversations',
        filter: `participant_b=eq.${profile.id}`,
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${profile.id}`,
      }, refresh)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `sender_id=eq.${profile.id}`,
      }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, profile?.id, searchParams]);

  useEffect(() => {
    if (!profile?.id) return;

    const peerId = searchParams.get('peer');
    const peerName = searchParams.get('name') || 'Student';
    const contextType = (searchParams.get('type') as 'product' | 'roommate' | null) || 'general';
    const contextTitle = searchParams.get('title') || 'Direct chat';
    const requestedConversationId = searchParams.get('conversation');

    if (requestedConversationId) {
      setActiveConversationId(requestedConversationId);
      void loadMessages(requestedConversationId);
      return;
    }

    if (!peerId || peerId === profile.id) return;

    const createConversation = async () => {
      const inNetwork = networkUserIds.includes(peerId);
      const { data, error } = await ensureDirectConversation({
        initiatorId: profile.id,
        peerId,
        contextType,
        contextTitle,
        requestFor: inNetwork ? null : peerId,
      } as any);

      if (error || !data) return;

      const peer = getPeerProfile(data as DirectConversation, profile.id);
      const nextConversation = {
        ...(data as DirectConversation),
        ...(peerName && peer && !peer.name ? { peerName } : {}),
      };

      setActiveConversationId(nextConversation.id);
      setSearchParams({ conversation: nextConversation.id });
      void loadMessages(nextConversation.id);
    };

    void createConversation();
  }, [networkUserIds, profile?.id, searchParams, setSearchParams]);

  useEffect(() => {
    if (!profile?.id) return;

    let active = true;
    const trimmed = peopleQuery.trim();

    if (trimmed.length < 2) {
      setPeopleResults([]);
      setIsPeopleLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsPeopleLoading(true);
      const safe = trimmed.replace(/[%_]/g, '').slice(0, 40);
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .or(`username.ilike.%${safe}%,name.ilike.%${safe}%`)
        .neq('id', profile.id)
        .limit(30);

      if (!active) return;

      const networkSet = new Set(networkUserIds);
      const score = (item: ChatPerson) => {
        const username = String(item.username || '').toLowerCase();
        const name = String(item.name || '').toLowerCase();
        const query = safe.toLowerCase();
        let points = 0;
        if (networkSet.has(item.id)) points += 1000;
        if (username === query) points += 80;
        else if (username.startsWith(query)) points += 40;
        else if (username.includes(query)) points += 20;
        if (name === query) points += 35;
        else if (name.startsWith(query)) points += 15;
        else if (name.includes(query)) points += 8;
        return points;
      };

      setPeopleResults(
        ((data || []) as ChatPerson[])
          .sort((a, b) => score(b) - score(a))
          .slice(0, 10)
      );
      setIsPeopleLoading(false);
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [networkUserIds, peopleQuery, profile?.id]);

  const requests = useMemo(() => {
    if (!profile?.id) return [];
    return conversations.filter((item) => item.request_for === profile.id);
  }, [conversations, profile?.id]);

  const chats = useMemo(() => {
    if (!profile?.id) return [];
    return conversations.filter((item) => item.request_for !== profile.id);
  }, [conversations, profile?.id]);

  const currentList = viewMode === 'requests' ? requests : chats;
  const activeConversation = conversations.find((item) => item.id === activeConversationId) || null;
  const peerProfile = getPeerProfile(activeConversation, profile?.id);

  useEffect(() => {
    if (!activeConversationId && currentList.length > 0) {
      setActiveConversationId(currentList[0].id);
    }
  }, [activeConversationId, currentList]);

  async function loadMessages(conversationId: string) {
    if (!profile?.id) return;
    setIsLoadingMessages(true);
    const { data } = await getDirectConversationMessages(conversationId, profile.id);
    setIsLoadingMessages(false);
    if (!data) return;
    setMessages((data.messages || []) as ChatMessage[]);
    await markDirectConversationRead(conversationId, profile.id);
  }

  async function openOrCreateThread(peer: ChatPerson, contextType: 'product' | 'roommate' | 'general' = 'general', contextTitle = 'Direct chat') {
    if (!profile?.id) return;

    const inNetwork = networkUserIds.includes(peer.id);
    const { data, error } = await ensureDirectConversation({
      initiatorId: profile.id,
      peerId: peer.id,
      contextType,
      contextTitle,
      requestFor: inNetwork ? null : peer.id,
    } as any);

    if (error || !data) return;

    setViewMode('chats');
    setActiveConversationId(data.id);
    setSearchParams({ conversation: data.id });
    await loadMessages(data.id);
  }

  async function acceptRequest(conversationId: string) {
    if (!profile?.id) return;
    const { data } = await acceptDirectConversationRequest(conversationId, profile.id);
    if (!data) return;
    setViewMode('chats');
    setActiveConversationId(conversationId);
    setSearchParams({ conversation: conversationId });
    await loadMessages(conversationId);
  }

  async function sendMessage() {
    if (!profile?.id || !activeConversation || !peerProfile?.id || !draft.trim()) return;
    setIsSending(true);
    const { error } = await sendDirectMessage({
      conversationId: activeConversation.id,
      senderId: profile.id,
      receiverId: peerProfile.id,
      message: draft.trim(),
    });
    setIsSending(false);
    if (error) return;
    setDraft('');
    await loadMessages(activeConversation.id);
  }

  if (!profile?.id) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">Please log in to access chat.</div>;
  }

  return (
    <div className="h-full min-h-full bg-[var(--bg-primary)]">
      <div className="grid h-[calc(100vh-60px)] grid-cols-1 md:grid-cols-[360px_1fr] md:pt-0">
        <aside className="border-r border-[var(--border)] bg-[var(--bg)] p-4">
          <h1 className="font-syne text-[28px] font-extrabold tracking-tight text-[var(--text-primary)]">Chat</h1>

          <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[#8A93A3]" />
              <input
                value={peopleQuery}
                onChange={(event) => setPeopleQuery(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Search by username or name"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setViewMode('chats')}
              className={`rounded-md px-3 py-2 text-sm font-bold ${viewMode === 'chats' ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'}`}
            >
              Chats ({chats.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('requests')}
              className={`rounded-md px-3 py-2 text-sm font-bold ${viewMode === 'requests' ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'}`}
            >
              Requests ({requests.length})
            </button>
          </div>

          {peopleQuery.trim().length >= 2 ? (
            <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg)] p-2">
              <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7C8697]">People</div>
              {isPeopleLoading ? (
                <div className="px-2 py-3 text-xs text-[#7D8695]">Searching...</div>
              ) : peopleResults.length ? (
                peopleResults.map((person) => {
                  const inNetwork = networkUserIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => openOrCreateThread(person, 'general', 'Direct chat')}
                      className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-[#F4F7FF]"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#12161F]">{person.name}</p>
                        <p className="text-xs text-[#7D8695]">@{person.username || 'student'}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${inNetwork ? 'bg-[#FEF9C3] text-[#A16207]' : 'bg-[#F2F2F2] text-[var(--text-secondary)]'}`}>
                        {inNetwork ? 'Network' : 'Other'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-3 text-xs text-[#7D8695]">No matching users found.</div>
              )}
            </div>
          ) : null}

          <div className="mt-4 h-[calc(100%-230px)] overflow-y-auto">
            {isLoadingConversations ? (
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-sm text-[#6D7684]">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : currentList.length === 0 ? (
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-sm text-[#6D7684]">
                {viewMode === 'requests' ? 'No pending requests.' : 'No conversations yet.'}
              </div>
            ) : (
              currentList.map((conversation) => {
                const isActive = conversation.id === activeConversation?.id;
                const peer = getPeerProfile(conversation, profile.id);
                const unreadCount = conversation.participant_a === profile.id ? conversation.participant_a_unread : conversation.participant_b_unread;

                return (
                  <div key={conversation.id} className={`mb-2 rounded-[10px] border px-3 py-2.5 ${isActive ? 'border-[#EAB308] bg-[#FFFBEB]' : 'border-[#E7EAF1] bg-[var(--bg)] hover:bg-[#F8FAFF]'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        setSearchParams({ conversation: conversation.id });
                        void loadMessages(conversation.id);
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-bold text-[#12161F]">{peer?.name || 'Student'}</p>
                        {unreadCount ? (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-[var(--yellow)] px-2 py-1 text-[10px] font-black text-[var(--text-primary)]">{unreadCount}</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[#7D8695]">{conversation.context_title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-[#99A2B3]">{conversation.last_message || 'Start the conversation'}</p>
                    </button>
                    {viewMode === 'requests' ? (
                      <button
                        type="button"
                        onClick={() => acceptRequest(conversation.id)}
                        className="mt-2 rounded-md bg-[var(--text-primary)] px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Accept request
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex h-full flex-col bg-[var(--bg-primary)]">
          {activeConversation && peerProfile ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 md:px-5">
                <div>
                  <button
                    type="button"
                    onClick={() => navigate(peerProfile.id === profile.id ? '/student/profile' : `/student/profile/${peerProfile.id}`)}
                    className="text-left text-base font-bold text-[#12161F] hover:underline"
                  >
                    {peerProfile.name}
                  </button>
                  <p className="text-xs text-[#7D8695]">{activeConversation.context_title}</p>
                </div>
                <Link to="/student/campus-exchange" className="rounded-md border border-[#E4E8F0] px-3 py-1.5 text-xs font-bold text-[#2B3341]">Campus Exchange</Link>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[#DCE2EC] bg-[var(--bg)] p-6 text-center text-sm text-[#6D7684]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[#DCE2EC] bg-[var(--bg)] p-6 text-center text-sm text-[#6D7684]">
                    <div>
                      <MessageCircle className="mx-auto h-5 w-5 text-[#98A1B1]" />
                      <p className="mt-2">No messages yet. Start chatting now.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.sender_id === profile.id;
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-[var(--text-primary)] text-white' : 'border border-[#E7EAF1] bg-[var(--bg)] text-[#12161F]'}`}>
                          <p className="select-text">{message.message}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-[#8E97A7]'}`}>{new Date(message.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-[#E7EAF1] bg-[var(--bg)] p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    className="w-full rounded-full border border-[#E4E8F0] bg-[#FAFBFF] px-4 py-2.5 text-sm outline-none"
                    placeholder="Type a message"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={isSending || !draft.trim()}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--yellow)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] hover:brightness-95 disabled:opacity-60"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[#6D7684]">Search a user and open a conversation to start chatting.</div>
          )}
        </section>
      </div>
    </div>
  );
};