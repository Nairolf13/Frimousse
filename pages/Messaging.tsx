import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useMessagingWS } from '../src/hooks/useMessagingWS';
import type { WSMessage } from '../src/hooks/useMessagingWS';
import { HiOutlineSearch, HiOutlinePaperAirplane, HiOutlineX, HiOutlineChatAlt2, HiOutlinePhotograph, HiOutlineEmojiHappy } from 'react-icons/hi';
import { useSearchParams } from 'react-router-dom';

// ─── Emoji picker ─────────────────────────────────────────────────────────────
const EMOJI_LIST = [
  '😀','😂','😍','🥰','😊','😎','🤔','😅','😭','😤',
  '👍','👎','❤️','🔥','🎉','✅','⭐','🙏','💪','👏',
  '😴','🤗','😇','🥳','😬','🤝','👋','🫂','💯','🚀',
  '📸','🎈','🎂','🍕','⚽','🌟','💡','📝','🔔','✨',
];

function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
  return (
    <div className="absolute bottom-14 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-64">
      <div className="grid grid-cols-10 gap-1">
        {EMOJI_LIST.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSelect(e)}
            className="text-xl hover:bg-gray-100 rounded-lg p-0.5 transition-colors leading-none"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = {
  id: string;
  name: string;
  role: string;
  centerId?: string | null;
};

type Center = {
  id: string;
  name: string;
};

type Participant = {
  userId: string;
  user: { id: string; name: string; role: string };
  lastReadAt: string | null;
};

type ConvMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

type Conversation = {
  id: string;
  participants: Participant[];
  messages: ConvMessage[];
  lastMessageAt: string | null;
  unreadCount: number;
};

// ─── Swipeable item (swipe left to delete) ───────────────────────────────────

const SWIPE_THRESHOLD = 60;
const DELETE_REVEAL = 72;

function SwipeableItem({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const startXRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0 && !swiped) return;
    if (dx < 0) {
      const raw = swiped ? DELETE_REVEAL + (-dx) : -dx;
      setOffset(Math.min(raw, DELETE_REVEAL));
    } else if (swiped) {
      const raw = DELETE_REVEAL - dx;
      setOffset(Math.max(0, raw));
    }
  }

  function onTouchEnd() {
    startXRef.current = null;
    if (offset >= SWIPE_THRESHOLD) {
      setOffset(DELETE_REVEAL);
      setSwiped(true);
    } else {
      setOffset(0);
      setSwiped(false);
    }
  }

  function close() {
    setOffset(0);
    setSwiped(false);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Contenu qui glisse vers la gauche */}
      <div
        style={{ transform: `translateX(-${offset}px)`, transition: offset === 0 || offset === DELETE_REVEAL ? 'transform 0.2s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (swiped) close(); }}
      >
        {children}
      </div>
      {/* Bouton rouge positionné à droite du contenu, révélé par le glissement */}
      <div
        className="absolute inset-y-0 flex items-center justify-center bg-red-500"
        style={{ width: DELETE_REVEAL, right: -DELETE_REVEAL, transform: `translateX(-${offset}px)`, transition: offset === 0 || offset === DELETE_REVEAL ? 'transform 0.2s ease' : 'none' }}
      >
        <button
          onClick={() => { close(); onDelete(); }}
          className="flex flex-col items-center justify-center w-full h-full text-white gap-1"
          aria-label="Supprimer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px] font-semibold">Supprimer</span>
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoleLabel(role: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'super-admin') return 'Super Admin';
  if (role === 'parent') return 'Parent';
  return 'Nounou';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatFullTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  online,
  size = 'md',
}: {
  name: string;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div className="relative inline-block flex-shrink-0">
      <div
        className={`${dims} rounded-full bg-gradient-to-br from-[#0b5566] to-[#1a8fa6] flex items-center justify-center font-bold text-white select-none`}
      >
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-400' : 'bg-gray-300'}`}
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Messaging() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-height: 600px) and (orientation: landscape)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New conversation
  const [showNewConv, setShowNewConv] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [creatingConv, setCreatingConv] = useState(false);
  const [centers, setCenters] = useState<Center[]>([]);
  const [centerFilter, setCenterFilter] = useState<string>('');

  // Message context menu (long press)
  type ContextMenu = { msgId: string; x: number; y: number; isMe: boolean };
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit mode
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Media upload
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; file: File } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);

  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Online users
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Search filter in conversation list
  const [convSearch, setConvSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);

  // ── Selected conversation object ──
  const selectedConv = conversations.find((c) => c.id === selectedConvId) ?? null;
  const otherParticipant = selectedConv?.participants.find((p) => p.userId !== user?.id)?.user ?? null;

  // ── WS ──
  const { sendTyping } = useMessagingWS({
    userId: user?.id ?? null,
    conversationId: selectedConvId,
    onMessage: useCallback(
      (msg: WSMessage) => {
        if (msg.conversationId === selectedConvId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg as ConvMessage];
          });
          // Mark as read
          fetchWithRefresh(`/api/messaging/conversations/${msg.conversationId}/read`, {
            method: 'POST',
            credentials: 'include',
          }).catch(() => null);
        }
        // Update conversation list preview + unread
        setConversations((prev) =>
          prev.map((c) =>
            c.id === msg.conversationId
              ? {
                  ...c,
                  messages: [msg as ConvMessage],
                  lastMessageAt: msg.createdAt,
                  unreadCount: msg.conversationId === selectedConvId ? 0 : c.unreadCount + 1,
                }
              : c
          )
        );
      },
      [selectedConvId]
    ),
    onMessageUpdated: useCallback((msg: WSMessage) => {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: msg.content } : m));
    }, []),
    onMessageDeleted: useCallback((_convId: string, messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }, []),
    onTyping: useCallback(
      ({ conversationId, userId: tUserId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
        if (conversationId !== selectedConvId) return;
        if (tUserId === user?.id) return;
        setTypingUsers((prev) => ({ ...prev, [tUserId]: isTyping }));
        if (typingTimers.current[tUserId]) clearTimeout(typingTimers.current[tUserId]);
        if (isTyping) {
          typingTimers.current[tUserId] = setTimeout(() => {
            setTypingUsers((prev) => ({ ...prev, [tUserId]: false }));
          }, 4000);
        }
      },
      [selectedConvId, user?.id]
    ),
    onPresence: useCallback(({ userId: pUserId, online }: { userId: string; online: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(pUserId);
        else next.delete(pUserId);
        return next;
      });
    }, []),
    onOnlineList: useCallback((ids: string[]) => {
      setOnlineUserIds(new Set(ids));
    }, []),
    onUnreadUpdate: useCallback((convId: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: c.unreadCount + 1 } : c))
      );
    }, []),
  });

  // ── Delete conversation ──
  const handleDeleteConv = async (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (selectedConvId === convId) setSelectedConvId(null);
    await fetchWithRefresh(`/api/messaging/conversations/${convId}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
  };

  // ── Load conversations ──
  useEffect(() => {
    setLoadingConvs(true);
    fetchWithRefresh('/api/messaging/conversations', { credentials: 'include' })
      .then((r) => (r && r.ok ? r.json() : []))
      .then((data) => {
        const convs = Array.isArray(data) ? data : [];
        setConversations(convs);
      })
      .finally(() => setLoadingConvs(false));
  }, []);

  // ── Auto-open conversation from ?convId= (notification click) ──
  useEffect(() => {
    const convId = searchParams.get('convId');
    if (!convId) return;
    setSelectedConvId(convId);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // ── Load messages when conversation changes ──
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    fetchWithRefresh(`/api/messaging/conversations/${selectedConvId}/messages`, { credentials: 'include' })
      .then((r) => (r && r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.messages)) setMessages(data.messages);
      })
      .finally(() => setLoadingMessages(false));
    // Mark as read
    fetchWithRefresh(`/api/messaging/conversations/${selectedConvId}/read`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    // Reset unread count locally
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConvId ? { ...c, unreadCount: 0 } : c))
    );
  }, [selectedConvId]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Load contacts for new conv picker ──
  useEffect(() => {
    if (!showNewConv) return;
    fetchWithRefresh('/api/messaging/contacts', { credentials: 'include' })
      .then((r) => (r && r.ok ? r.json() : []))
      .then((data) => setContacts(Array.isArray(data) ? data : []));
    // Load centers for super-admin filter
    const isSuperAdmin = user?.role && typeof user.role === 'string' && user.role.toLowerCase().includes('super');
    if (isSuperAdmin) {
      fetchWithRefresh('/api/centers', { credentials: 'include' })
        .then((r) => (r && r.ok ? r.json() : []))
        .then((data) => setCenters(Array.isArray(data) ? data : []));
    }
  }, [showNewConv, user?.role]);

  // ── Long press handlers ──
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, msg: ConvMessage, isMe: boolean) => {
    const touch = 'touches' in e ? e.touches[0] : e as React.MouseEvent;
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ msgId: msg.id, x, y, isMe });
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // ── Delete message ──
  const handleDeleteMessage = async (msgId: string) => {
    setContextMenu(null);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    await fetchWithRefresh(`/api/messaging/messages/${msgId}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
  };

  // ── Edit message submit ──
  const handleEditSubmit = async () => {
    if (!editingMsgId || !editContent.trim()) return;
    const id = editingMsgId;
    const content = editContent.trim();
    setEditingMsgId(null);
    setEditContent('');
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content } : m));
    await fetchWithRefresh(`/api/messaging/messages/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => null);
  };

  // ── File selection ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaPreview({ url, type, file });
    e.target.value = '';
  };

  // ── Send message ──
  const handleSend = async () => {
    if (!input.trim() && !mediaPreview) return;
    if (!selectedConvId || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    setShowEmoji(false);
    isTypingRef.current = false;
    sendTyping(selectedConvId, false);

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload media if any
    if (mediaPreview) {
      setUploadingMedia(true);
      try {
        const formData = new FormData();
        formData.append('file', mediaPreview.file);
        const r = await fetchWithRefresh('/api/messaging/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (r && r.ok) {
          const data = await r.json();
          mediaUrl = data.url;
          mediaType = data.mediaType;
        }
      } finally {
        setUploadingMedia(false);
        setMediaPreview(null);
      }
    }

    try {
      const r = await fetchWithRefresh(`/api/messaging/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, mediaUrl, mediaType }),
      });
      if (r && r.ok) {
        const msg: ConvMessage = await r.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId
              ? { ...c, messages: [msg], lastMessageAt: msg.createdAt }
              : c
          )
        );
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') setShowEmoji(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!selectedConvId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(selectedConvId, true);
    }
    // Stop typing after 2s of inactivity
    clearTimeout((window as unknown as Record<string, unknown>).__typingTimer as ReturnType<typeof setTimeout>);
    (window as unknown as Record<string, unknown>).__typingTimer = setTimeout(() => {
      isTypingRef.current = false;
      if (selectedConvId) sendTyping(selectedConvId, false);
    }, 2000) as unknown;
  };

  // ── Create conversation ──
  const handleCreateConv = async (contactId: string) => {
    setCreatingConv(true);
    try {
      const r = await fetchWithRefresh('/api/messaging/conversations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: contactId }),
      });
      if (r && r.ok) {
        const conv: Conversation = await r.json();
        setConversations((prev) => {
          if (prev.some((c) => c.id === conv.id)) return prev;
          return [{ ...conv, unreadCount: 0 }, ...prev];
        });
        setSelectedConvId(conv.id);
        setShowNewConv(false);
        setContactSearch('');
      }
    } finally {
      setCreatingConv(false);
    }
  };

  // ── Helpers ──
  const getConvName = (conv: Conversation) => {
    const other = conv.participants.find((p) => p.userId !== user?.id);
    return other?.user.name ?? 'Conversation';
  };

  const getConvOtherUser = (conv: Conversation) => {
    return conv.participants.find((p) => p.userId !== user?.id)?.user ?? null;
  };

  const filteredConvs = conversations.filter((c) => {
    if (!convSearch) return true;
    return getConvName(c).toLowerCase().includes(convSearch.toLowerCase());
  });

  const filteredContacts = contacts.filter((c) => {
    if (contactSearch && !c.name.toLowerCase().includes(contactSearch.toLowerCase())) return false;
    if (centerFilter && c.centerId !== centerFilter) return false;
    return true;
  });

  const isOtherTyping =
    otherParticipant && typingUsers[otherParticipant.id];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={`flex bg-white overflow-hidden h-[calc(100vh-48px)] md:h-screen ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
      {/* ── Liste des conversations ── */}
      <div
        className={`${selectedConvId ? 'hidden' : 'flex'} flex-col w-full bg-white flex-shrink-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <button
            onClick={() => setShowNewConv(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-[#0b5566]"
            title="Nouveau message"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2">
            <HiOutlineSearch className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Rechercher un message"
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#0b5566] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <HiOutlineChatAlt2 className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">Aucun message</p>
              <p className="text-gray-400 text-xs mt-1">Commencez une nouvelle conversation</p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const other = getConvOtherUser(conv);
              const isOnline = other ? onlineUserIds.has(other.id) : false;
              const lastMsg = conv.messages[0];
              const isActive = conv.id === selectedConvId;
              return (
                <SwipeableItem key={conv.id} onDelete={() => handleDeleteConv(conv.id)}>
                  <button
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${isActive ? 'bg-[#0b5566]/5' : ''}`}
                  >
                    <Avatar name={other?.name ?? '?'} online={isOnline} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {other?.name ?? 'Inconnu'}
                        </span>
                        {lastMsg && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {lastMsg
                            ? (lastMsg.senderId === user?.id ? 'Vous : ' : '') + (lastMsg.mediaUrl && !lastMsg.content ? (lastMsg.mediaType === 'video' ? '🎥 Vidéo' : '📷 Photo') : lastMsg.content)
                            : getRoleLabel(other?.role ?? '')}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-[#0b5566] text-white text-xs flex items-center justify-center font-bold">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </SwipeableItem>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat pane ── */}
      <div className={`${!selectedConvId ? 'hidden' : 'flex'} flex-col flex-1 min-w-0`}>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
              <button
                onClick={() => setSelectedConvId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {otherParticipant && (
                <>
                  <Avatar
                    name={otherParticipant.name}
                    online={onlineUserIds.has(otherParticipant.id)}
                    size="md"
                  />
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{otherParticipant.name}</p>
                    <p className="text-xs text-gray-400">
                      {onlineUserIds.has(otherParticipant.id) ? (
                        <span className="text-green-500">En ligne</span>
                      ) : (
                        getRoleLabel(otherParticipant.role)
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#0b5566] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-gray-400 text-sm">Aucun message. Commencez la conversation !</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    const prevMsg = messages[i - 1];
                    const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);
                    const showTime =
                      !prevMsg ||
                      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000;
                    const isEditing = editingMsgId === msg.id;
                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="text-center text-xs text-gray-400 py-2">{formatFullTime(msg.createdAt)}</div>
                        )}
                        <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && (
                            <div className={`w-6 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                              <Avatar name={msg.sender.name} size="sm" />
                            </div>
                          )}
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-xs lg:max-w-md">
                              <input
                                autoFocus
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') { setEditingMsgId(null); setEditContent(''); } }}
                                className="flex-1 bg-gray-100 text-gray-900 text-sm px-3 py-2 rounded-2xl outline-none border border-[#0b5566]/30 focus:border-[#0b5566]"
                              />
                              <button onClick={handleEditSubmit} className="text-[#0b5566] text-xs font-semibold px-2">OK</button>
                              <button onClick={() => { setEditingMsgId(null); setEditContent(''); }} className="text-gray-400 text-xs px-1">✕</button>
                            </div>
                          ) : (
                            <div
                              className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl text-sm leading-relaxed select-none overflow-hidden ${
                                isMe
                                  ? 'bg-[#0b5566] text-white rounded-br-sm'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                              }`}
                              onTouchStart={(e) => handleLongPressStart(e, msg, isMe)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchMove={handleLongPressEnd}
                              onMouseDown={(e) => handleLongPressStart(e, msg, isMe)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY, isMe }); }}
                            >
                              {msg.mediaUrl && msg.mediaType === 'image' && (
                                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.mediaUrl} alt="image" className="max-w-full rounded-2xl" style={{ maxHeight: 260 }} />
                                </a>
                              )}
                              {msg.mediaUrl && msg.mediaType === 'video' && (
                                <video src={msg.mediaUrl} controls className="max-w-full rounded-2xl" style={{ maxHeight: 260 }} />
                              )}
                              {msg.content && (
                                <div className="px-4 py-2.5">{msg.content}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isOtherTyping && (
                    <div className="flex items-end gap-2 justify-start">
                      <div className="w-6 flex-shrink-0">
                        <Avatar name={otherParticipant?.name ?? '?'} size="sm" />
                      </div>
                      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
              {/* Media preview */}
              {mediaPreview && (
                <div className="mb-2 relative inline-block">
                  {mediaPreview.type === 'image' ? (
                    <img src={mediaPreview.url} alt="aperçu" className="h-24 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <video src={mediaPreview.url} className="h-24 rounded-xl border border-gray-200" />
                  )}
                  <button
                    onClick={() => setMediaPreview(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs"
                  >✕</button>
                </div>
              )}
              <div className="relative flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2">
                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setShowEmoji(v => !v)}
                  className="text-gray-400 hover:text-[#0b5566] transition-colors flex-shrink-0 mb-0.5"
                  title="Emoji"
                >
                  <HiOutlineEmojiHappy className="w-5 h-5" />
                </button>
                {/* File button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-[#0b5566] transition-colors flex-shrink-0 mb-0.5"
                  title="Joindre une image ou vidéo"
                >
                  <HiOutlinePhotograph className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez un message…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none max-h-32 py-1"
                  style={{ minHeight: '24px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !mediaPreview) || sending || uploadingMedia}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0b5566] text-white disabled:opacity-40 hover:bg-[#0a4a59] transition-colors flex-shrink-0 mb-0.5"
                >
                  {sending || uploadingMedia ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <HiOutlinePaperAirplane className="w-4 h-4 rotate-90" />
                  )}
                </button>
                {/* Emoji picker */}
                {showEmoji && (
                  <EmojiPicker onSelect={(e) => { setInput(v => v + e); setShowEmoji(false); inputRef.current?.focus(); }} />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">Entrée pour envoyer · Maj+Entrée pour un saut de ligne</p>
            </div>
      </div>

      {/* ── Context menu (long press on bubble) ── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 120),
              left: Math.min(Math.max(contextMenu.x - 80, 8), window.innerWidth - 176),
              minWidth: 160,
            }}
          >
            {contextMenu.isMe && (
              <button
                onClick={() => {
                  const msg = messages.find((m) => m.id === contextMenu.msgId);
                  if (msg) { setEditingMsgId(msg.id); setEditContent(msg.content); }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
            )}
            {contextMenu.isMe && (
              <button
                onClick={() => handleDeleteMessage(contextMenu.msgId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>
            )}
            {!contextMenu.isMe && (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                Vous ne pouvez pas modifier ce message
              </div>
            )}
          </div>
        </>
      )}

      {/* ── New conversation modal ── */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-base">Nouveau message</h2>
              <button
                onClick={() => { setShowNewConv(false); setContactSearch(''); setCenterFilter(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2">
                <HiOutlineSearch className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Rechercher une personne…"
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                />
              </div>
              {user?.role && typeof user.role === 'string' && user.role.toLowerCase().includes('super') && (
                <select
                  value={centerFilter}
                  onChange={(e) => setCenterFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30"
                >
                  <option value="">Tous les centres</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Aucun contact trouvé</p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleCreateConv(contact.id)}
                    disabled={creatingConv}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Avatar
                      name={contact.name}
                      online={onlineUserIds.has(contact.id)}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                      <p className="text-xs text-gray-400">{getRoleLabel(contact.role)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
