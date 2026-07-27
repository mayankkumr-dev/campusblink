import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { getConversations, getMessages } from '../api/messages';

// Define the shape of our chat store
interface ChatState {
  activeConversations: any[];
  requestConversations: any[];
  profiles: Record<string, any>;
  messages: Record<string, any[]>; // Indexed by conversation ID
  isHydrated: boolean;
  
  // Actions
  setHydrated: (state: boolean) => void;
  setProfiles: (updater: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  fetchConversations: (userId: string) => Promise<void>;
  fetchMessagesForChat: (conversationId: string) => Promise<void>;
  addMessage: (conversationId: string, message: any) => void;
  updateMessage: (conversationId: string, messageId: string, updates: any) => void;
  removeMessages: (conversationId: string, messageIds: string[], deletedBy: string) => void;
  removeConversation: (conversationId: string) => void;
  setupRealtimeSubscription: (userId: string) => () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeConversations: [],
      requestConversations: [],
      profiles: {},
      messages: {},
      isHydrated: false,
      
      setHydrated: (state) => set({ isHydrated: state }),
      setProfiles: (updater) =>
        set((state) => ({
          profiles: typeof updater === 'function' ? updater(state.profiles) : { ...state.profiles, ...updater },
        })),

      fetchConversations: async (userId: string) => {
        if (!userId) return;
        
        try {
          // Attempt an optimized deep join query
          const { data: convData, error: convError } = await supabase
            .from('direct_conversations')
            .select(`
              *,
              participant_a_profile:profiles!participant_a(id, name, username, avatar_url),
              participant_b_profile:profiles!participant_b(id, name, username, avatar_url)
            `)
            .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
            .order('last_message_at', { ascending: false });

          let active: any[] = [];
          let requests: any[] = [];
          const newProfiles: Record<string, any> = { ...get().profiles };

          if (!convError && convData) {
            convData.forEach((conv: any) => {
              const otherId = conv.participant_a === userId ? conv.participant_b : conv.participant_a;
              const isParticipantA = conv.participant_a === userId;
              const iAccepted = isParticipantA ? conv.accepted_by_a : conv.accepted_by_b;
              const isRequest = conv.request_for === userId && !iAccepted;
              
              const acceptedBy = [
                ...(conv.accepted_by_a ? [conv.participant_a] : []),
                ...(conv.accepted_by_b ? [conv.participant_b] : []),
              ];
              
              const mapped = {
                _id: conv.id,
                participants: [userId, otherId],
                isRequest,
                requestFor: conv.request_for,
                acceptedBy,
                lastMessage: conv.last_message,
                lastMessageAt: conv.last_message_at,
              };

              if (isRequest) requests.push(mapped);
              else active.push(mapped);

              // Cache profiles from the deep join
              if (conv.participant_a_profile && conv.participant_a_profile.id !== userId) {
                newProfiles[conv.participant_a_profile.id] = conv.participant_a_profile;
              } else if (conv.participant_b_profile && conv.participant_b_profile.id !== userId) {
                newProfiles[conv.participant_b_profile.id] = conv.participant_b_profile;
              }
            });

            set({ activeConversations: active, requestConversations: requests, profiles: newProfiles });
            return;
          }
        } catch (e) {
          // Silent fallback if deep join fails
        }

        // Fallback to existing API logic if deep join fails (schema doesn't match perfectly)
        try {
          const data = await getConversations();
          set({ 
            activeConversations: data.active || [], 
            requestConversations: data.requests || [] 
          });

          // Fallback profile fetching
          const allConvs = [...(data.active || []), ...(data.requests || [])];
          const missingIds = new Set<string>();
          const stateProfiles = get().profiles;
          
          allConvs.forEach(c => {
            const otherId = c.participants.find((p: string) => p !== userId);
            if (otherId && !stateProfiles[otherId]) missingIds.add(otherId);
          });
          
          if (missingIds.size > 0) {
            const { getProfile } = await import('../api/auth');
            await Promise.all(Array.from(missingIds).map(async id => {
              const res = await getProfile(id);
              if (res.data) {
                set((state) => ({ profiles: { ...state.profiles, [id]: res.data } }));
              }
            }));
          }
        } catch (e) {
          console.error('Failed to fetch conversations', e);
        }
      },

      fetchMessagesForChat: async (conversationId: string) => {
        try {
          const msgs = await getMessages(conversationId);
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: msgs
            }
          }));
        } catch (e) {
          console.error('Failed to fetch messages', e);
        }
      },

      addMessage: (conversationId: string, message: any) => {
        set((state) => {
          const currentMsgs = state.messages[conversationId] || [];
          if (currentMsgs.some(m => m._id === message._id)) return state;
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...currentMsgs, message]
            }
          };
        });
      },

      updateMessage: (conversationId: string, messageId: string, updates: any) => {
        set((state) => {
          const currentMsgs = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: currentMsgs.map(m => m._id === messageId ? { ...m, ...updates } : m)
            }
          };
        });
      },

      removeMessages: (conversationId: string, messageIds: string[], deletedBy: string) => {
         set((state) => {
           const currentMsgs = state.messages[conversationId] || [];
           if (deletedBy === 'everyone') {
             return {
               messages: {
                 ...state.messages,
                 [conversationId]: currentMsgs.filter(m => !messageIds.includes(m._id))
               }
             };
           } else {
             return {
               messages: {
                 ...state.messages,
                 [conversationId]: currentMsgs.map(m => 
                   messageIds.includes(m._id) 
                    ? { ...m, deletedBy: [...(m.deletedBy || []), deletedBy] }
                    : m
                 )
               }
             };
           }
         });
      },

      removeConversation: (conversationId: string) => {
        set((state) => ({
          activeConversations: state.activeConversations.filter(c => c._id !== conversationId),
          requestConversations: state.requestConversations.filter(c => c._id !== conversationId),
          messages: Object.fromEntries(Object.entries(state.messages).filter(([k]) => k !== conversationId))
        }));
      },

      setupRealtimeSubscription: (userId: string) => {
        const channel = supabase
          .channel(`direct_messages:chatStore:${userId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `receiver_id=eq.${userId}`
          }, (payload) => {
            const m = payload.new;
            const formatted = {
              _id: m.id,
              conversationId: m.conversation_id,
              senderId: m.sender_id,
              receiverId: m.receiver_id,
              text: m.message,
              isRead: m.is_read,
              createdAt: m.created_at,
              deletedBy: m.deleted_by || [],
              editedAt: m.edited_at || null,
            };
            
            get().addMessage(formatted.conversationId, formatted);
            
            // Revalidate conversations to bump latest to top
            get().fetchConversations(userId);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }),
    {
      name: 'campus-blink-chat-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
