import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  Search, MoreVertical, MoreHorizontal, Paperclip, Send, MessageCircle, Info,
  Image as ImageIcon, Smile, ArrowLeft, CheckCircle2, Check, Trash2, X,
  Copy, Edit3, CheckSquare,
} from 'lucide-react';
import { getAvatarDataUrl } from '../../lib/avatar';
import { useAuthStore } from '../../store/authStore';
import {
  getConversations, getMessages, sendMessage, acceptRequest,
  deleteMessages, deleteConversation, editMessageApi,
} from '../../api/messages';
import { getProfile } from '../../api/auth';
import { io as socketIOClient, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
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
  const btnClass = 'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left';
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute bg-white dark:bg-gray-900 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] border border-gray-100 dark:border-gray-700 py-1.5 w-[188px] overflow-hidden"
        style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 220) }}
        onClick={e => e.stopPropagation()}
      >
        <button className={btnClass} onClick={() => { onCopy(); onClose(); }}>
          <Copy className="h-4 w-4 text-gray-400" /> Copy
        </button>
        {menu.isMe && (
          <button className={btnClass} onClick={() => { onEdit?.(); onClose(); }}>
            <Edit3 className="h-4 w-4 text-gray-400" /> Edit
          </button>
        )}
        <button className={`${btnClass} text-red-500 hover:bg-red-50 dark:hover:bg-red-950`} onClick={() => { onDelete(); onClose(); }}>
          <Trash2 className="h-4 w-4" /> Delete
        </button>
        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
        <button className={btnClass} onClick={() => { onSelect(); onClose(); }}>
          <CheckSquare className="h-4 w-4 text-gray-400" /> Select
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
  const btnClass = 'w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 transition-colors text-left';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden"
        style={{ animation: 'slideUp 0.22s cubic-bezier(0.4,0,0.2,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="px-4 pb-10 pt-2 space-y-0.5">
          <button className={btnClass} onClick={() => { onCopy(); onClose(); }}>
            <Copy className="h-5 w-5 text-gray-400" /> Copy
          </button>
          {sheet.isMe && (
            <button className={btnClass} onClick={() => { onEdit?.(); onClose(); }}>
              <Edit3 className="h-5 w-5 text-gray-400" /> Edit
            </button>
          )}
          <button className={`${btnClass} !text-red-500`} onClick={() => { onDelete(); onClose(); }}>
            <Trash2 className="h-5 w-5" /> Delete
          </button>
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button className={btnClass} onClick={() => { onSelect(); onClose(); }}>
            <CheckSquare className="h-5 w-5 text-gray-400" /> Select
          </button>
          <button className={`${btnClass} !text-gray-400 justify-center`} onClick={onClose}>
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
    style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(6px)' }}
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-800 w-full max-w-[320px] p-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-12 h-12 bg-red-50 dark:bg-red-950 rounded-2xl flex items-center justify-center mb-4">
        <Trash2 className="h-5 w-5 text-red-500" />
      </div>
      <h3 className="font-syne text-base font-extrabold text-gray-900 dark:text-white mb-1">
        Delete {modal.ids.length > 1 ? `${modal.ids.length} Messages` : 'Message'}
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5 leading-relaxed">
        {modal.canDeleteForEveryone
          ? 'Remove from just your view, or delete for everyone in this conversation.'
          : 'You can only remove this from your own view.'}
      </p>
      <div className="space-y-2.5">
        <button
          className="w-full py-3 text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 transition-colors"
          onClick={() => onDelete('me')}
        >
          Delete for me
        </button>
        {modal.canDeleteForEveryone && (
          <button
            className="w-full py-3 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 rounded-2xl border border-red-100 dark:border-red-900 transition-colors"
            onClick={() => onDelete('everyone')}
          >
            Delete for everyone
          </button>
        )}
        <button
          className="w-full py-2.5 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ─── MessagesPage ─────────────────────────────────────────────────────────────
export const MessagesPage: React.FC = () => {
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Conversation state
  const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [activeConversations, setActiveConversations] = useState<any[]>([]);
  const [requestConversations, setRequestConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<MsgItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  // New chat compose
  const [newChatUserId, setNewChatUserId] = useState<string | null>(null);
  const [newChatProfile, setNewChatProfile] = useState<any | null>(null);

  // Message interactions
  const [contextMenu, setContextMenu] = useState<CtxMenu | null>(null);
  const [bottomSheet, setBottomSheet] = useState<BottomSheetState | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Load conversations ───────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setActiveConversations(data.active);
      setRequestConversations(data.requests);
      const allConvs = [...data.active, ...data.requests];
      const missingIds = new Set<string>();
      allConvs.forEach(c => {
        const otherId = c.participants.find((p: string) => p !== profile?.id);
        if (otherId && !profiles[otherId]) missingIds.add(otherId);
      });
      if (missingIds.size > 0) {
        await Promise.all(Array.from(missingIds).map(async id => {
          const res = await getProfile(id);
          if (res.data) setProfiles(prev => ({ ...prev, [id]: res.data }));
        }));
      }
      return data;
    } catch {
      toast.error('Failed to load conversations');
      return { active: [], requests: [] };
    }
  }, [profile?.id]);

  // ── Handle ?newChat=<userId> ─────────────────────────────────────────────
  useEffect(() => {
    const newChatId = searchParams.get('newChat');
    if (!newChatId || !profile?.id) return;
    const init = async () => {
      const res = await getProfile(newChatId);
      const targetProfile = res.data;
      if (!targetProfile) { toast.error('User not found'); return; }
      setProfiles(prev => ({ ...prev, [newChatId]: targetProfile }));
      const data = await loadConversations();
      const allConvs = [...(data.active || []), ...(data.requests || [])];
      const existing = allConvs.find(c => c.participants.includes(newChatId));
      if (existing) {
        setActiveChatId(existing._id);
        setActiveTab(data.requests?.some((r: any) => r._id === existing._id) ? 'requests' : 'primary');
        setNewChatUserId(null); setNewChatProfile(null);
        setSearchParams({ chat: existing._id }, { replace: true });
      } else {
        setNewChatUserId(newChatId); setNewChatProfile(targetProfile); setActiveChatId(null);
        setSearchParams({}, { replace: true });
      }
    };
    init();
  }, [searchParams.get('newChat'), profile?.id]);

  useEffect(() => { if (profile?.id) loadConversations(); }, [profile?.id]);

  // ── Sync URL ?chat= with activeChatId ────────────────────────────────────
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && chatId !== activeChatId) {
      setActiveChatId(chatId);
      if (requestConversations.some(c => c._id === chatId)) {
        setActiveTab('requests');
      } else if (activeConversations.some(c => c._id === chatId)) {
        setActiveTab('primary');
      }
    } else if (!chatId && activeChatId && !newChatUserId) {
      setActiveChatId(null);
    }
  }, [searchParams.get('chat'), activeConversations, requestConversations, activeChatId, newChatUserId]);

  // ── Socket.io ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    const socket = socketIOClient(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', { withCredentials: true });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('joinRoom', profile.id));
    socket.on('newMessage', (data) => {
      if (data.conversationId === activeChatId) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      loadConversations();
    });
    socket.on('newMessageRequest', () => loadConversations());
    return () => { socket.disconnect(); };
  }, [profile?.id, activeChatId]);

  // ── Load messages when chat changes ─────────────────────────────────────
  useEffect(() => {
    if (activeChatId) {
      getMessages(activeChatId)
        .then(msgs => {
          setMessages(msgs);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
        })
        .catch(() => toast.error('Failed to fetch messages'));
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim()) return;

    if (newChatUserId) {
      const text = inputText; setInputText('');
      try {
        const data = await sendMessage(newChatUserId, text);
        setNewChatUserId(null); setNewChatProfile(null);
        const freshData = await loadConversations();
        const allConvs = [...(freshData.active || []), ...(freshData.requests || [])];
        const newConv = allConvs.find(c => c.participants.includes(newChatUserId));
        if (newConv) { setActiveChatId(newConv._id); setMessages([data.message]); setSearchParams({ chat: newConv._id }, { replace: true }); }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (e: any) { toast.error(e.message || 'Failed to send'); }
      return;
    }

    if (!activeChatId) return;
    const activeChat = activeConversations.find(c => c._id === activeChatId) || requestConversations.find(c => c._id === activeChatId);
    if (!activeChat) return;
    const receiverId = activeChat.participants.find((p: string) => p !== profile?.id);
    if (!receiverId) return;

    const text = inputText; setInputText('');
    try {
      const data = await sendMessage(receiverId, text);
      setMessages(prev => [...prev, data.message]);
      loadConversations();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) { toast.error(e.message || 'Failed to send'); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Accept / Delete request ──────────────────────────────────────────────
  const handleAccept = async () => {
    if (!activeChatId) return;
    try {
      await acceptRequest(activeChatId);
      toast.success('Request accepted');
      setActiveTab('primary');
      await loadConversations();
    } catch (e: any) { toast.error(e.message || 'Failed to accept'); }
  };

  const handleDeleteConversation = async () => {
    if (!activeChatId) return;
    try {
      await deleteConversation(activeChatId);
      setActiveChatId(null);
      setSearchParams({}, { replace: true });
      setMessages([]);
      await loadConversations();
      toast.success('Conversation deleted');
    } catch (e: any) { toast.error(e.message || 'Failed to delete conversation'); }
  };

  // ── Long press (mobile) ──────────────────────────────────────────────────
  const handleLongPressStart = (msg: MsgItem) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setBottomSheet({ msgId: msg._id, isMe: msg.senderId === profile?.id });
    }, 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  // ── Desktop context menu ─────────────────────────────────────────────────
  const handleOpenMenu = (e: React.MouseEvent, msg: MsgItem) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isMe = msg.senderId === profile?.id;
    const x = isMe ? rect.left - 200 : rect.right + 8;
    const y = rect.top;
    setContextMenu({
      msgId: msg._id, isMe,
      x: Math.max(8, Math.min(x, window.innerWidth - 200)),
      y: Math.max(8, Math.min(y, window.innerHeight - 240)),
    });
  };

  // ── Copy ─────────────────────────────────────────────────────────────────
  const handleCopy = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (!msg) return;
    navigator.clipboard.writeText(msg.text).then(() => toast.success('Copied'));
  };

  // ── Inline edit ──────────────────────────────────────────────────────────
  const handleStartEdit = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (!msg) return;
    setEditingId(msgId);
    setEditText(msg.text);
    setContextMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      const updated = await editMessageApi(editingId, editText.trim());
      setMessages(prev => prev.map(m => m._id === editingId ? { ...m, text: updated.text, editedAt: updated.editedAt } : m));
      setEditingId(null);
    } catch (e: any) { toast.error(e.message || 'Failed to edit'); }
  };

  // ── Selection mode ───────────────────────────────────────────────────────
  const enterSelectionMode = (msgId: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([msgId]));
  };
  const exitSelectionMode = () => { setIsSelectionMode(false); setSelectedIds(new Set()); };

  const toggleSelect = (msgId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const openDeleteModal = (ids: string[]) => {
    const allOwn = ids.every(id => messages.find(m => m._id === id)?.senderId === profile?.id);
    setDeleteModal({ ids, canDeleteForEveryone: allOwn });
  };

  const handleDelete = async (deleteFor: 'me' | 'everyone') => {
    if (!deleteModal) return;
    const { ids } = deleteModal;
    try {
      await deleteMessages(ids, deleteFor);
      if (deleteFor === 'everyone') {
        setMessages(prev => prev.filter(m => !ids.includes(m._id)));
      } else {
        setMessages(prev => prev.map(m =>
          ids.includes(m._id)
            ? { ...m, deletedBy: [...(m.deletedBy || []), profile!.id] }
            : m
        ));
      }
      setDeleteModal(null);
      exitSelectionMode();
      toast.success(`Deleted ${ids.length > 1 ? `${ids.length} messages` : 'message'}`);
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
  };

  // ── Derived values ───────────────────────────────────────────────────────
  const displayConvs = activeTab === 'primary' ? activeConversations : requestConversations;
  const filteredConvs = displayConvs.filter(c => {
    const otherId = c.participants.find((p: string) => p !== profile?.id);
    const p = profiles[otherId];
    if (!p) return true;
    return p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatDetails = (chat: any) => {
    const otherId = chat.participants.find((p: string) => p !== profile?.id);
    const p = profiles[otherId];
    return {
      id: chat._id, otherId,
      name: p?.name || p?.username || 'Unknown User',
      avatar: p?.avatar_url || getAvatarDataUrl({ name: p?.name || 'User', seed: otherId }),
      lastMessage: chat.lastMessage,
      timestamp: chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      unread: 0,
    };
  };

  const activeChat = activeConversations.find(c => c._id === activeChatId) || requestConversations.find(c => c._id === activeChatId);
  const activeChatDetails = activeChat ? getChatDetails(activeChat) : null;
  const iAmTheSenderWaiting = !!(activeChat?.isRequest && activeChat?.requestFor !== profile?.id);
  const newChatDetails = newChatUserId && newChatProfile ? {
    name: newChatProfile.name || newChatProfile.username || 'User',
    avatar: newChatProfile.avatar_url || getAvatarDataUrl({ name: newChatProfile.name || 'User', seed: newChatUserId }),
    subtitle: newChatProfile.college || '',
  } : null;
  const rightPaneOpen = !!activeChatDetails || !!newChatDetails;

  // Messages visible to current user (filter deleted-for-me)
  const visibleMessages = messages.filter(m => !(m.deletedBy || []).includes(profile?.id || ''));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[100dvh] w-full overflow-hidden bg-background text-text-primary font-sans">

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
      <div className={`flex flex-col w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-border-subtle bg-surface ${rightPaneOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-6 pt-6 pb-4 bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-syne text-2xl font-extrabold text-text-primary tracking-tight">Messages</h1>
            <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-surface-elevated transition-colors text-text-secondary">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text" placeholder="Search conversations..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface hover:bg-surface-elevated focus:bg-background text-text-primary text-sm rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:ring-4 focus:ring-accent-blue-soft border border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex items-center px-6 py-2 gap-6 border-b border-border-subtle bg-background">
          {(['primary', 'requests'] as const).map(tab => (
            <button key={tab}
              onClick={() => { setActiveTab(tab); setActiveChatId(null); setNewChatUserId(null); setNewChatProfile(null); setSearchParams({}, { replace: true }); }}
              className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-1.5 capitalize ${activeTab === tab ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {tab}
              {tab === 'requests' && requestConversations.length > 0 && (
                <span className="flex items-center justify-center bg-accent-blue-soft text-accent-blue text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {requestConversations.length}
                </span>
              )}
              {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-text-primary rounded-t-full" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
          {newChatDetails && (
            <div className="w-full flex items-center gap-4 p-3 rounded-2xl bg-surface shadow-sm border border-accent-blue/30 mb-2">
              <img src={newChatDetails.avatar} alt={newChatDetails.name} className="h-12 w-12 rounded-full object-cover border border-border-subtle" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-text-primary font-syne truncate">{newChatDetails.name}</h3>
                <p className="text-xs text-accent-blue font-semibold">New conversation</p>
              </div>
            </div>
          )}
          {filteredConvs.length === 0 && !newChatDetails ? (
            <div className="text-center mt-10 text-text-secondary text-sm font-medium">No conversations yet.</div>
          ) : filteredConvs.map(chat => {
            const details = getChatDetails(chat);
            const isSenderWaiting = !!(chat.isRequest && chat.requestFor !== profile?.id);
            return (
              <button key={details.id}
                onClick={() => { setActiveChatId(details.id); setNewChatUserId(null); setNewChatProfile(null); exitSelectionMode(); setSearchParams({ chat: details.id }); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left mb-1 ${activeChatId === details.id ? 'bg-surface shadow-sm border border-border-subtle' : 'hover:bg-surface border border-transparent'}`}
              >
                <img src={details.avatar} alt={details.name} className="h-12 w-12 rounded-full object-cover border border-border-subtle shadow-sm flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm truncate pr-2 font-syne font-bold text-text-primary/90">{details.name}</h3>
                    <span className="text-[11px] font-semibold flex-shrink-0 text-text-secondary/70">{details.timestamp}</span>
                  </div>
                  {isSenderWaiting ? (
                    <p className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                      Pending acceptance
                    </p>
                  ) : (
                    <p className="text-xs truncate font-medium text-text-secondary">{details.lastMessage || 'No messages yet'}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANE ──────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col bg-background relative ${!rightPaneOpen ? 'hidden md:flex' : 'flex'}`}>

        {/* Empty state */}
        {!rightPaneOpen && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 rounded-full bg-accent-blue-soft flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-accent-blue stroke-[1.5]" />
            </div>
            <h2 className="font-syne text-2xl font-extrabold text-text-primary mb-2">Campus Messages</h2>
            <p className="text-text-secondary text-sm font-medium max-w-sm text-center">Select a conversation or check your message requests.</p>
          </div>
        )}

        {/* New Chat Compose */}
        {newChatDetails && !activeChatDetails && (
          <>
            <div className="h-[72px] flex items-center justify-between px-6 border-b border-border-subtle bg-background/90 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => { setNewChatUserId(null); setNewChatProfile(null); }} className="md:hidden h-9 w-9 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:bg-surface-elevated transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <img src={newChatDetails.avatar} alt={newChatDetails.name} className="h-10 w-10 rounded-full object-cover border border-border-subtle" />
                <div>
                  <h2 className="font-syne text-base font-bold text-text-primary leading-tight">{newChatDetails.name}</h2>
                  {newChatDetails.subtitle && <p className="text-xs text-text-secondary">{newChatDetails.subtitle}</p>}
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface/30">
              <img src={newChatDetails.avatar} alt={newChatDetails.name} className="w-16 h-16 rounded-full object-cover border-2 border-accent-blue-soft mb-4" />
              <h3 className="font-syne font-extrabold text-text-primary text-lg mb-1">{newChatDetails.name}</h3>
              <p className="text-sm text-text-secondary text-center max-w-xs">Send a message to start the conversation!</p>
            </div>
            <div className="p-4 bg-background border-t border-border-subtle flex-shrink-0">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1 bg-surface border border-border-subtle rounded-3xl flex items-center shadow-sm focus-within:ring-4 focus-within:ring-accent-blue-soft focus-within:border-accent-blue transition-all px-2 overflow-hidden">
                  <button className="h-9 w-9 flex-shrink-0 flex items-center justify-center text-text-secondary"><Smile className="h-5 w-5" /></button>
                  <textarea ref={textareaRef} autoFocus placeholder={`Message ${newChatDetails.name}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm font-medium text-text-primary py-3.5 px-2 outline-none max-h-[120px] scrollbar-hide min-h-[48px]"
                    rows={1} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                  />
                </div>
                <button onClick={handleSend} disabled={!inputText.trim()}
                  className={`h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${inputText.trim() ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:bg-blue-700' : 'bg-surface text-text-secondary'}`}>
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
            <div className={`h-[72px] flex items-center justify-between px-6 border-b border-border-subtle backdrop-blur-md sticky top-0 z-10 flex-shrink-0 transition-colors ${isSelectionMode ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-background/90'}`}>
              {isSelectionMode ? (
                <>
                  <div className="flex items-center gap-4">
                    <button onClick={exitSelectionMode} className="h-9 w-9 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:bg-surface-elevated transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                    <span className="font-syne font-bold text-text-primary text-base">{selectedIds.size} selected</span>
                  </div>
                  <button
                    onClick={() => selectedIds.size > 0 && openDeleteModal(Array.from(selectedIds))}
                    disabled={selectedIds.size === 0}
                    className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${selectedIds.size > 0 ? 'bg-red-50 dark:bg-red-950 text-red-500 hover:bg-red-100 dark:hover:bg-red-900' : 'text-text-secondary/40'}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setActiveChatId(null); setSearchParams({}, { replace: true }); }} className="md:hidden h-9 w-9 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:bg-surface-elevated transition-colors">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <img src={activeChatDetails.avatar} alt={activeChatDetails.name} className="h-10 w-10 rounded-full object-cover border border-border-subtle" />
                    <h2 className="font-syne text-base font-bold text-text-primary leading-tight">{activeChatDetails.name}</h2>
                  </div>
                  <button className="h-10 w-10 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-surface transition-colors">
                    <Info className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-surface/30 flex flex-col gap-3"
              onClick={() => { if (contextMenu) setContextMenu(null); }}
            >
                  {visibleMessages.length === 0 ? (
                    <div className="text-center mt-10 text-text-secondary text-sm font-medium">Say hello! 👋</div>
                  ) : visibleMessages.map(msg => {
                    const isMe = msg.senderId === profile?.id;
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
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.15)]' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}

                        {/* Bubble + hover menu */}
                        <div className={`relative group flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'} ${isSelectionMode && isSelected ? 'opacity-80' : ''}`}>
                          {isEditing ? (
                            /* Inline Edit */
                            <div className="bg-white dark:bg-gray-800 border-2 border-blue-400 rounded-2xl px-3 py-2 shadow-md w-72">
                              <textarea
                                autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === 'Escape') setEditingId(null); }}
                                className="w-full text-sm resize-none outline-none border-none bg-transparent text-gray-900 dark:text-white leading-relaxed" rows={2}
                              />
                              <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={() => setEditingId(null)} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                                <button onClick={handleSaveEdit} disabled={!editText.trim()} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-40">Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`px-4 py-2.5 text-[15px] font-medium leading-relaxed break-words shadow-sm transition-all ${isSelectionMode && isSelected ? 'scale-[0.97]' : ''} ${isMe
                                ? 'bg-blue-600 text-white rounded-[22px] rounded-br-sm border border-blue-600'
                                : 'bg-surface border border-border-subtle text-text-primary rounded-[22px] rounded-bl-sm'
                              }`}>
                                {msg.text}
                              </div>
                              {msg.editedAt && (
                                <span className="text-[10px] text-text-secondary/50 mt-0.5 px-1">Edited</span>
                              )}
                            </>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center gap-1.5 mt-1 px-1">
                            <span className="text-[10px] font-semibold text-text-secondary/60">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && msg.isRead && <CheckCircle2 className="h-3 w-3 text-accent-blue" />}
                          </div>

                          {/* Desktop hover 3-dots button */}
                          {!isSelectionMode && !isEditing && (
                            <button
                              className={`absolute top-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700 flex items-center justify-center ${isMe ? '-left-9' : '-right-9'}`}
                              onClick={e => handleOpenMenu(e, msg)}
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
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
              <div className="p-4 bg-background border-t border-border-subtle flex-shrink-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 bg-surface border border-border-subtle rounded-2xl px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    <p className="text-sm font-medium text-text-secondary">
                      Waiting for <span className="font-bold text-text-primary">{activeChatDetails.name}</span> to accept your request...
                    </p>
                  </div>
                  <button onClick={handleDeleteConversation} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                    Cancel
                  </button>
                </div>
              </div>
            ) : activeTab === 'requests' && !iAmTheSenderWaiting ? (
              <div className="p-4 bg-background border-t border-border-subtle flex-shrink-0">
                <div className="max-w-4xl mx-auto flex gap-3">
                  <button onClick={handleDeleteConversation}
                    className="flex-1 bg-red-50 dark:bg-red-950 hover:bg-red-100 text-red-600 font-bold py-3 rounded-2xl text-sm transition-colors border border-red-100 dark:border-red-900">
                    Delete Request
                  </button>
                  <button onClick={handleAccept}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-[0_4px_14px_rgba(37,99,235,0.2)]">
                    Accept Request
                  </button>
                </div>
              </div>
            ) : activeTab === 'primary' && !isSelectionMode ? (
              <div className="p-4 bg-background border-t border-border-subtle flex-shrink-0">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                  <button className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full text-text-secondary hover:text-accent-blue hover:bg-accent-blue-soft transition-colors">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <div className="flex-1 bg-surface border border-border-subtle rounded-3xl flex items-center shadow-sm focus-within:ring-4 focus-within:ring-accent-blue-soft focus-within:border-accent-blue transition-all px-2 overflow-hidden">
                    <button className="h-9 w-9 flex-shrink-0 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                      <Smile className="h-5 w-5" />
                    </button>
                    <textarea
                      placeholder="Type a message..." rows={1} value={inputText}
                      onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm font-medium text-text-primary py-3.5 px-2 outline-none max-h-[120px] scrollbar-hide min-h-[48px]"
                    />
                    <button className="h-9 w-9 flex-shrink-0 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                      <ImageIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <button onClick={handleSend} disabled={!inputText.trim()}
                    className={`h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${inputText.trim() ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:bg-blue-700' : 'bg-surface text-text-secondary'}`}>
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
