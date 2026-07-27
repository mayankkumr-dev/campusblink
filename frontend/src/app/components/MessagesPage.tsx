import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  Search,
  Send,
  MoreHorizontal,
  Trash2,
  Edit3,
  Copy,
  CheckCircle2,
  X,
  Check,
  CheckSquare,
  Smile,
  Paperclip,
  Image as ImageIcon,
  MessageCircle,
  ArrowLeft,
  Info
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import * as messagesApi from '../../api/messages';
import { supabase } from '../../lib/supabase';

interface MsgItem {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
  deletedBy: string[];
  editedAt: string | null;
}

interface CtxMenu { msgId: string; isMe: boolean; x: number; y: number; }
interface BottomSheetState { msgId: string; isMe: boolean; }
interface DeleteModalState { ids: string[]; canDeleteForEveryone: boolean; }

// ─── ContextMenuPopover ───────────────────────────────────────────────────────
const CtxMenuPopover: React.FC<{
  menu: CtxMenu;
  onClose: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onSelect: () => void;
}> = ({ menu, onClose, onCopy, onEdit, onDelete, onSelect }) => {
  const btnClass = 'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-elevated transition-colors text-left';
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute bg-white dark:bg-surface rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] border border-gray-100 dark:border-border-subtle py-1.5 w-[188px] overflow-hidden"
        style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 220) }}
        onClick={e => e.stopPropagation()}
      >
        <button className={btnClass} onClick={() => { onCopy(); onClose(); }}>
          <Copy className="h-4 w-4 text-gray-400 dark:text-text-secondary" /> Copy
        </button>
        {menu.isMe && (
          <button className={btnClass} onClick={() => { onEdit?.(); onClose(); }}>
            <Edit3 className="h-4 w-4 text-gray-400 dark:text-text-secondary" /> Edit
          </button>
        )}
        <button className={`${btnClass} text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40`} onClick={() => { onDelete(); onClose(); }}>
          <Trash2 className="h-4 w-4" /> Delete
        </button>
        <div className="my-1 border-t border-gray-100 dark:border-border-subtle" />
        <button className={btnClass} onClick={() => { onSelect(); onClose(); }}>
          <CheckSquare className="h-4 w-4 text-gray-400 dark:text-text-secondary" /> Select
        </button>
      </div>
    </div>
  );
};

// ─── Bottom Sheet (mobile) ────────────────────────────────────────────────────
const BottomSheet: React.FC<{
  sheet: BottomSheetState;
  onClose: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onSelect: () => void;
}> = ({ sheet, onClose, onCopy, onEdit, onDelete, onSelect }) => {
  const btnClass = 'w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-semibold text-gray-800 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-elevated active:bg-gray-100 dark:active:bg-surface transition-colors text-left';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white dark:bg-surface rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.2)] border-t border-gray-100 dark:border-border-subtle overflow-hidden"
        style={{ animation: 'slideUp 0.22s cubic-bezier(0.4,0,0.2,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-border-subtle rounded-full" />
        </div>
        <div className="px-4 pb-10 pt-2 space-y-0.5">
          <button className={btnClass} onClick={() => { onCopy(); onClose(); }}>
            <Copy className="h-5 w-5 text-gray-400 dark:text-text-secondary" /> Copy
          </button>
          {sheet.isMe && (
            <button className={btnClass} onClick={() => { onEdit?.(); onClose(); }}>
              <Edit3 className="h-5 w-5 text-gray-400 dark:text-text-secondary" /> Edit
            </button>
          )}
          <button className={`${btnClass} !text-red-500`} onClick={() => { onDelete(); onClose(); }}>
            <Trash2 className="h-5 w-5" /> Delete
          </button>
          <div className="my-1 border-t border-gray-100 dark:border-border-subtle" />
          <button className={btnClass} onClick={() => { onSelect(); onClose(); }}>
            <CheckSquare className="h-5 w-5 text-gray-400 dark:text-text-secondary" /> Select
          </button>
          <button className={`${btnClass} !text-gray-400 dark:!text-text-secondary justify-center`} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────
const DeleteModal: React.FC<{
  modal: DeleteModalState;
  onClose: () => void;
  onDelete: (deleteFor: 'me' | 'everyone') => void;
}> = ({ modal, onClose, onDelete }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-5"
    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-surface rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-border-subtle w-full max-w-[320px] p-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 rounded-2xl flex items-center justify-center mb-4">
        <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-text-primary mb-1">
        Delete {modal.ids.length > 1 ? `${modal.ids.length} Messages` : 'Message'}
      </h3>
      <p className="text-sm text-gray-400 dark:text-text-secondary mb-5 leading-relaxed">
        {modal.canDeleteForEveryone
          ? 'Remove from just your view, or delete for everyone in this conversation.'
          : 'You can only remove this from your own view.'}
      </p>
      <div className="space-y-2.5">
        <button
          className="w-full py-3 text-sm font-bold text-gray-700 dark:text-text-primary bg-gray-50 dark:bg-surface-elevated hover:bg-gray-100 dark:hover:bg-surface rounded-2xl border border-gray-200 dark:border-border-subtle transition-colors"
          onClick={() => onDelete('me')}
        >
          Delete for me
        </button>
        {modal.canDeleteForEveryone && (
          <button
            className="w-full py-3 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-2xl border border-red-100 dark:border-red-900/40 transition-colors"
            onClick={() => onDelete('everyone')}
          >
            Delete for everyone
          </button>
        )}
        <button
          className="w-full py-2.5 text-sm font-semibold text-gray-400 dark:text-text-secondary hover:text-gray-600 dark:hover:text-text-primary transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ─── MessagesPage Main Component ──────────────────────────────────────────────
export const MessagesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialChatId = searchParams.get('chat');
  const userParam = searchParams.get('user');

  const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary');
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');

  const {
    activeConversations,
    requestConversations,
    profiles,
    setProfiles,
    messages: storeMessages,
    fetchConversations,
    fetchMessagesForChat,
    addMessage,
    removeMessages,
    updateMessage,
    removeConversation,
    setupRealtimeSubscription
  } = useChatStore();

  const { user, profile } = useAuthStore() as any;
  const currentUserId = user?.id || profile?.id || profile?._id || '';

  const messages = (activeChatId ? (storeMessages[activeChatId] || []) : []) as MsgItem[];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [contextMenu, setContextMenu] = useState<CtxMenu | null>(null);
  const [bottomSheet, setBottomSheet] = useState<BottomSheetState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);

  const [newChatUserId, setNewChatUserId] = useState<string | null>(userParam);
  const [newChatProfile, setNewChatProfile] = useState<{ id: string; name: string; avatar: string; subtitle?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Initial Load & Realtime Sub
  useEffect(() => {
    if (currentUserId) {
      fetchConversations(currentUserId);
      const unsub = setupRealtimeSubscription(currentUserId);
      return () => { unsub(); };
    }
  }, [currentUserId, fetchConversations, setupRealtimeSubscription]);

  // 2. Sync Query Param "chat"
  useEffect(() => {
    if (initialChatId) {
      setActiveChatId(initialChatId);
      setNewChatUserId(null);
      setNewChatProfile(null);
    }
  }, [initialChatId]);

  // 3. Fetch Messages when activeChatId changes
  useEffect(() => {
    if (activeChatId) {
      fetchMessagesForChat(activeChatId);
    }
  }, [activeChatId, fetchMessagesForChat]);

  // 4. Fetch target user profile if userParam is present
  useEffect(() => {
    if (userParam) {
      setNewChatUserId(userParam);
      supabase.from('profiles').select('*').eq('id', userParam).single().then(res => {
        if (res.data) {
          const u = res.data;
          const p = {
            id: u.id || userParam,
            name: u.name || u.fullName || 'User',
            avatar: u.avatar_url || u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            subtitle: u.department ? `${u.department} ${u.batch || ''}` : u.username || u.email
          };
          setNewChatProfile(p);
          setProfiles({ [p.id]: p });
        }
      }).catch(() => {});
    }
  }, [userParam, setProfiles]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper details getter
  const getChatDetails = (chat: any) => {
    const otherId = chat.participants?.find((p: string) => p !== currentUserId) || chat.participants?.[0];
    const prof = profiles[otherId];

    return {
      id: chat._id,
      otherUserId: otherId,
      name: prof?.name || prof?.fullName || 'Campus Member',
      avatar: prof?.avatar_url || prof?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      lastMessage: chat.lastMessage || '',
      timestamp: chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      isRequest: chat.isRequest,
      requestFor: chat.requestFor,
      acceptedBy: chat.acceptedBy
    };
  };

  const activeConv = (activeConversations.concat(requestConversations)).find(c => c._id === activeChatId);
  const activeChatDetails = activeConv ? getChatDetails(activeConv) : null;
  const newChatDetails = newChatProfile;

  const currentConversations = activeTab === 'primary' ? activeConversations : requestConversations;
  const filteredConvs = currentConversations.filter(c => {
    const d = getChatDetails(c);
    return d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const rightPaneOpen = !!(activeChatId || newChatUserId);
  const visibleMessages = messages.filter(m => !m.deletedBy?.includes(currentUserId));

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    if (newChatUserId && !activeChatId) {
      try {
        const res = await messagesApi.sendMessage(newChatUserId, text);
        if (res?.message) {
          const newMsg = res.message;
          const convId = newMsg.conversationId;
          setActiveChatId(convId);
          setNewChatUserId(null);
          setNewChatProfile(null);
          setSearchParams({ chat: convId });
          if (currentUserId) {
            await fetchConversations(currentUserId);
            await fetchMessagesForChat(convId);
          }
        }
      } catch (err) {
        console.error('Failed to send new chat message', err);
      }
      return;
    }

    if (!activeChatId || !activeChatDetails) return;

    try {
      const tempId = `temp-${Date.now()}`;
      const tempMsg: MsgItem = {
        _id: tempId,
        conversationId: activeChatId,
        senderId: currentUserId,
        receiverId: activeChatDetails.otherUserId,
        text,
        isRead: false,
        createdAt: new Date().toISOString(),
        deletedBy: [],
        editedAt: null
      };
      addMessage(activeChatId, tempMsg);

      const res = await messagesApi.sendMessage(activeChatDetails.otherUserId, text);
      if (res?.message) {
        removeMessages(activeChatId, [tempId], currentUserId);
        addMessage(activeChatId, res.message);
        if (currentUserId) fetchConversations(currentUserId);
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (msg) navigator.clipboard.writeText(msg.text);
  };

  const handleStartEdit = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (msg) { setEditingId(msgId); setEditText(msg.text); }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim() || !activeChatId) return;
    const msgId = editingId;
    const text = editText.trim();
    setEditingId(null);
    try {
      updateMessage(activeChatId, msgId, { text, editedAt: new Date().toISOString() });
      await messagesApi.editMessageApi(msgId, text);
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  };

  const openDeleteModal = (ids: string[]) => {
    const allMine = ids.every(id => {
      const m = messages.find(item => item._id === id);
      return m?.senderId === currentUserId;
    });
    setDeleteModal({ ids, canDeleteForEveryone: allMine });
  };

  const handleDelete = async (deleteFor: 'me' | 'everyone') => {
    if (!deleteModal || !activeChatId) return;
    const { ids } = deleteModal;
    setDeleteModal(null);
    try {
      removeMessages(activeChatId, ids, currentUserId);
      await messagesApi.deleteMessages(ids, deleteFor);
      if (currentUserId) fetchConversations(currentUserId);
    } catch (err) {
      console.error('Failed to delete messages', err);
    }
  };

  const handleAccept = async () => {
    if (!activeChatId) return;
    try {
      await messagesApi.acceptRequest(activeChatId);
      setActiveTab('primary');
      if (currentUserId) fetchConversations(currentUserId);
    } catch (err) {
      console.error('Failed to accept request', err);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeChatId) return;
    try {
      removeConversation(activeChatId);
      setActiveChatId(null);
      setSearchParams({}, { replace: true });
      await messagesApi.deleteConversation(activeChatId);
      if (currentUserId) fetchConversations(currentUserId);
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const enterSelectionMode = (firstId: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([firstId]));
  };

  const toggleSelect = (msgId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleOpenMenu = (e: React.MouseEvent, msg: MsgItem) => {
    e.stopPropagation();
    const isMe = msg.senderId === currentUserId;
    if (window.innerWidth < 768) {
      setBottomSheet({ msgId: msg._id, isMe });
    } else {
      setContextMenu({ msgId: msg._id, isMe, x: e.clientX, y: e.clientY });
    }
  };

  const handleLongPressStart = (msg: MsgItem) => {
    longPressTimer.current = setTimeout(() => {
      enterSelectionMode(msg._id);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const iAmTheSenderWaiting = activeConv?.isRequest && activeConv?.requestFor !== currentUserId;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-background text-gray-900 dark:text-text-primary font-sans transition-colors">

      {/* ── OVERLAYS ────────────────────────────────────────────────────── */}
      {contextMenu && (
        <CtxMenuPopover
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCopy={() => handleCopy(contextMenu.msgId)}
          onEdit={contextMenu.isMe ? () => handleStartEdit(contextMenu.msgId) : undefined}
          onDelete={() => openDeleteModal([contextMenu.msgId])}
          onSelect={() => enterSelectionMode(contextMenu.msgId)}
        />
      )}
      {bottomSheet && (
        <BottomSheet
          sheet={bottomSheet}
          onClose={() => setBottomSheet(null)}
          onCopy={() => handleCopy(bottomSheet.msgId)}
          onEdit={bottomSheet.isMe ? () => handleStartEdit(bottomSheet.msgId) : undefined}
          onDelete={() => openDeleteModal([bottomSheet.msgId])}
          onSelect={() => enterSelectionMode(bottomSheet.msgId)}
        />
      )}
      {deleteModal && (
        <DeleteModal
          modal={deleteModal}
          onClose={() => setDeleteModal(null)}
          onDelete={handleDelete}
        />
      )}

      {/* ── LEFT PANE ───────────────────────────────────────────────────── */}
      <div className={`flex flex-col w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-gray-200 dark:border-border-subtle bg-white dark:bg-surface transition-colors ${rightPaneOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-6 pt-6 pb-4 bg-gray-50/80 dark:bg-surface-elevated/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 dark:border-border-subtle transition-colors">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-text-secondary">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text" placeholder="Search conversations..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-surface-elevated hover:bg-white dark:hover:bg-surface focus:bg-gray-50 dark:focus:bg-surface text-gray-900 dark:text-text-primary text-sm rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:ring-4 focus:ring-accent-blue-soft border border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-text-secondary"
            />
          </div>
        </div>

        <div className="flex items-center px-6 py-2 gap-6 border-b border-gray-200 dark:border-border-subtle bg-gray-50 dark:bg-surface-elevated transition-colors">
          {(['primary', 'requests'] as const).map(tab => (
            <button key={tab}
              onClick={() => { setActiveTab(tab); setActiveChatId(null); setNewChatUserId(null); setNewChatProfile(null); setSearchParams({}, { replace: true }); }}
              className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-1.5 capitalize ${activeTab === tab ? 'text-gray-900 dark:text-text-primary' : 'text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary'}`}
            >
              {tab}
              {tab === 'requests' && requestConversations.length > 0 && (
                <span className="flex items-center justify-center bg-accent-blue-soft text-accent-blue text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {requestConversations.length}
                </span>
              )}
              {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 dark:bg-text-primary rounded-t-full" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
          {newChatDetails && (
            <div className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white dark:bg-surface-elevated shadow-sm border border-accent-blue/30 mb-2">
              <img src={newChatDetails.avatar} alt={newChatDetails.name} className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-border-subtle" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-text-primary font-syne truncate">{newChatDetails.name}</h3>
                <p className="text-xs text-accent-blue font-semibold">New conversation</p>
              </div>
            </div>
          )}
          {filteredConvs.length === 0 && !newChatDetails ? (
            <div className="text-center mt-10 text-gray-500 dark:text-text-secondary text-sm font-medium">No conversations yet.</div>
          ) : filteredConvs.map(chat => {
            const details = getChatDetails(chat);
            const isSenderWaiting = !!(chat.isRequest && chat.requestFor !== currentUserId);
            return (
              <button key={details.id}
                onClick={() => { setActiveChatId(details.id); setNewChatUserId(null); setNewChatProfile(null); exitSelectionMode(); setSearchParams({ chat: details.id }); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left mb-1 ${activeChatId === details.id ? 'bg-white dark:bg-surface-elevated shadow-sm border border-gray-200 dark:border-border-subtle' : 'hover:bg-white dark:hover:bg-surface-elevated border border-transparent'}`}
              >
                <img src={details.avatar} alt={details.name} className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-border-subtle shadow-sm flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm truncate pr-2 font-syne font-bold text-gray-900/90 dark:text-text-primary">{details.name}</h3>
                    <span className="text-[11px] font-semibold flex-shrink-0 text-gray-500/70 dark:text-text-secondary">{details.timestamp}</span>
                  </div>
                  {isSenderWaiting ? (
                    <p className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                      Pending acceptance
                    </p>
                  ) : (
                    <p className="text-xs truncate font-medium text-gray-500 dark:text-text-secondary">{details.lastMessage || 'No messages yet'}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANE ──────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-background relative ${!rightPaneOpen ? 'hidden md:flex' : 'flex'}`}>

        {/* Empty state */}
        {!rightPaneOpen && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 rounded-full bg-accent-blue-soft/30 dark:bg-accent-blue-soft/20 flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-accent-blue stroke-[1.5]" />
            </div>
            <h2 className="font-syne text-2xl font-extrabold text-gray-900 dark:text-text-primary mb-2">Campus Messages</h2>
            <p className="text-gray-500 dark:text-text-secondary text-sm font-medium max-w-sm text-center">Select a conversation or check your message requests.</p>
          </div>
        )}

        {/* New Chat Compose */}
        {newChatDetails && !activeChatDetails && (
          <>
            <div className="h-[72px] flex items-center justify-between px-6 border-b border-gray-200 dark:border-border-subtle bg-gray-50/90 dark:bg-surface-elevated/90 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => { setNewChatUserId(null); setNewChatProfile(null); }} className="md:hidden h-9 w-9 flex items-center justify-center rounded-full bg-white dark:bg-surface-elevated text-gray-500 dark:text-text-secondary hover:bg-white dark:hover:bg-surface transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <img src={newChatDetails.avatar} alt={newChatDetails.name} className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-border-subtle" />
                <div>
                  <h2 className="font-syne text-base font-bold text-gray-900 dark:text-text-primary leading-tight">{newChatDetails.name}</h2>
                  {newChatDetails.subtitle && <p className="text-xs text-gray-500 dark:text-text-secondary">{newChatDetails.subtitle}</p>}
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/30 dark:bg-surface/30">
              <img src={newChatDetails.avatar} alt={newChatDetails.name} className="w-16 h-16 rounded-full object-cover border-2 border-accent-blue-soft mb-4" />
              <h3 className="font-syne font-extrabold text-gray-900 dark:text-text-primary text-lg mb-1">{newChatDetails.name}</h3>
              <p className="text-sm text-gray-500 dark:text-text-secondary text-center max-w-xs">Send a message to start the conversation!</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-surface-elevated border-t border-gray-200 dark:border-border-subtle flex-shrink-0">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1 bg-white dark:bg-surface border border-gray-200 dark:border-border-subtle rounded-3xl flex items-center shadow-sm focus-within:ring-4 focus-within:ring-accent-blue-soft focus-within:border-accent-blue transition-all px-2 overflow-hidden">
                  <button className="h-9 w-9 flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-text-secondary"><Smile className="h-5 w-5" /></button>
                  <textarea ref={textareaRef} autoFocus placeholder={`Message ${newChatDetails.name}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm font-medium text-gray-900 dark:text-text-primary py-3.5 px-2 outline-none max-h-[120px] scrollbar-hide min-h-[48px] placeholder:text-gray-400 dark:placeholder:text-text-secondary"
                    rows={1} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                  />
                </div>
                <button onClick={handleSend} disabled={!inputText.trim()}
                  className={`h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${inputText.trim() ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:bg-blue-700' : 'bg-white dark:bg-surface text-gray-500 dark:text-text-secondary'}`}>
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Active Conversation */}
        {activeChatDetails && (
          <>
            {/* Chat Header */}
            <div className={`h-[72px] flex items-center justify-between px-6 border-b border-gray-200 dark:border-border-subtle backdrop-blur-md sticky top-0 z-10 flex-shrink-0 transition-colors ${isSelectionMode ? 'bg-blue-50 dark:bg-accent-blue-soft/20' : 'bg-gray-50/90 dark:bg-surface-elevated/90'}`}>
              {isSelectionMode ? (
                <>
                  <div className="flex items-center gap-4">
                    <button onClick={exitSelectionMode} className="h-9 w-9 flex items-center justify-center rounded-full bg-white dark:bg-surface-elevated text-gray-500 dark:text-text-secondary hover:bg-white dark:hover:bg-surface transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                    <span className="font-syne font-bold text-gray-900 dark:text-text-primary text-base">{selectedIds.size} selected</span>
                  </div>
                  <button
                    onClick={() => selectedIds.size > 0 && openDeleteModal(Array.from(selectedIds))}
                    disabled={selectedIds.size === 0}
                    className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${selectedIds.size > 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60' : 'text-gray-500/40 dark:text-text-secondary/40'}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setActiveChatId(null); setSearchParams({}, { replace: true }); }} className="md:hidden h-9 w-9 flex items-center justify-center rounded-full bg-white dark:bg-surface-elevated text-gray-500 dark:text-text-secondary hover:bg-white dark:hover:bg-surface transition-colors">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <img src={activeChatDetails.avatar} alt={activeChatDetails.name} className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-border-subtle" />
                    <h2 className="font-syne text-base font-bold text-gray-900 dark:text-text-primary leading-tight">{activeChatDetails.name}</h2>
                  </div>
                  <button className="h-10 w-10 flex items-center justify-center rounded-full text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary hover:bg-white dark:hover:bg-surface-elevated transition-colors">
                    <Info className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-white/30 dark:bg-surface/30 flex flex-col gap-3"
              onClick={() => { if (contextMenu) setContextMenu(null); }}
            >
              {visibleMessages.length === 0 ? (
                <div className="text-center mt-10 text-gray-500 dark:text-text-secondary text-sm font-medium">Say hello! 👋</div>
              ) : visibleMessages.map(msg => {
                const isMe = msg.senderId === currentUserId;
                const isSelected = selectedIds.has(msg._id);
                const isEditing = editingId === msg._id;

                return (
                  <div key={msg._id}
                    className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                    onClick={isSelectionMode ? () => toggleSelect(msg._id) : undefined}
                    onTouchStart={!isSelectionMode ? () => handleLongPressStart(msg) : undefined}
                    onTouchEnd={handleLongPressEnd}
                    onTouchMove={handleLongPressEnd}
                  >
                    {/* Selection checkbox */}
                    {isSelectionMode && (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.15)]' : 'border-gray-300 dark:border-border-subtle bg-white dark:bg-surface-elevated'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    )}

                    {/* Bubble + hover menu */}
                    <div className={`relative group flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'} ${isSelectionMode && isSelected ? 'opacity-80' : ''}`}>
                      {isEditing ? (
                        /* Inline Edit */
                        <div className="bg-white dark:bg-surface-elevated border-2 border-blue-400 rounded-2xl px-3 py-2 shadow-md w-72">
                          <textarea
                            autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full text-sm resize-none outline-none border-none bg-transparent text-gray-900 dark:text-text-primary leading-relaxed" rows={2}
                          />
                          <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-border-subtle">
                            <button onClick={() => setEditingId(null)} className="text-xs font-semibold text-gray-400 dark:text-text-secondary hover:text-gray-600 dark:hover:text-text-primary transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={!editText.trim()} className="text-xs font-bold text-blue-600 dark:text-accent-blue hover:text-blue-700 transition-colors disabled:opacity-40">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`px-4 py-2.5 text-[15px] font-medium leading-relaxed break-words shadow-sm transition-all ${isSelectionMode && isSelected ? 'scale-[0.97]' : ''} ${isMe
                            ? 'bg-blue-600 text-white rounded-[22px] rounded-br-sm border border-blue-600'
                            : 'bg-white dark:bg-surface-elevated border border-gray-200 dark:border-border-subtle text-gray-900 dark:text-text-primary rounded-[22px] rounded-bl-sm'
                          }`}>
                            {msg.text}
                          </div>
                          {msg.editedAt && (
                            <span className="text-[10px] text-gray-500/50 dark:text-text-secondary/50 mt-0.5 px-1">Edited</span>
                          )}
                        </>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[10px] font-semibold text-gray-500/60 dark:text-text-secondary/60">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && msg.isRead && <CheckCircle2 className="h-3 w-3 text-accent-blue" />}
                      </div>

                      {/* Desktop hover 3-dots button */}
                      {!isSelectionMode && !isEditing && (
                        <button
                          className={`absolute top-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7 rounded-full bg-white dark:bg-surface-elevated shadow-md border border-gray-100 dark:border-border-subtle flex items-center justify-center ${isMe ? '-left-9' : '-right-9'}`}
                          onClick={e => handleOpenMenu(e, msg)}
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-text-secondary" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input / Waiting Banner */}
            {iAmTheSenderWaiting ? (
              <div className="p-4 bg-gray-50 dark:bg-surface-elevated border-t border-gray-200 dark:border-border-subtle flex-shrink-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 bg-white dark:bg-surface border border-gray-200 dark:border-border-subtle rounded-2xl px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-500 dark:text-text-secondary">
                      Waiting for <span className="font-bold text-gray-900 dark:text-text-primary">{activeChatDetails.name}</span> to accept your request...
                    </p>
                  </div>
                  <button onClick={handleDeleteConversation} className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 transition-colors flex-shrink-0">
                    Cancel
                  </button>
                </div>
              </div>
            ) : activeTab === 'requests' && !iAmTheSenderWaiting ? (
              <div className="p-4 bg-gray-50 dark:bg-surface-elevated border-t border-gray-200 dark:border-border-subtle flex-shrink-0">
                <div className="max-w-4xl mx-auto flex gap-3">
                  <button onClick={handleDeleteConversation}
                    className="flex-1 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold py-3 rounded-2xl text-sm transition-colors border border-red-100 dark:border-red-900/30">
                    Delete Request
                  </button>
                  <button onClick={handleAccept}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-[0_4px_14px_rgba(37,99,235,0.2)]">
                    Accept Request
                  </button>
                </div>
              </div>
            ) : activeTab === 'primary' && !isSelectionMode ? (
              <div className="p-4 bg-gray-50 dark:bg-surface-elevated border-t border-gray-200 dark:border-border-subtle flex-shrink-0">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                  <button className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full text-gray-500 dark:text-text-secondary hover:text-accent-blue hover:bg-accent-blue-soft/30 transition-colors">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <div className="flex-1 bg-white dark:bg-surface border border-gray-200 dark:border-border-subtle rounded-3xl flex items-center shadow-sm focus-within:ring-4 focus-within:ring-accent-blue-soft focus-within:border-accent-blue transition-all px-2 overflow-hidden">
                    <button className="h-9 w-9 flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary transition-colors">
                      <Smile className="h-5 w-5" />
                    </button>
                    <textarea
                      placeholder="Type a message..." rows={1} value={inputText}
                      onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm font-medium text-gray-900 dark:text-text-primary py-3.5 px-2 outline-none max-h-[120px] scrollbar-hide min-h-[48px] placeholder:text-gray-400 dark:placeholder:text-text-secondary"
                    />
                    <button className="h-9 w-9 flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary transition-colors">
                      <ImageIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <button onClick={handleSend} disabled={!inputText.trim()}
                    className={`h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${inputText.trim() ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:bg-blue-700' : 'bg-white dark:bg-surface text-gray-500 dark:text-text-secondary'}`}>
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
