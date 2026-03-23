import { useEffect, useRef, useCallback } from 'react';

export type WSMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

type TypingEvent = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

type PresenceEvent = {
  userId: string;
  online: boolean;
};

type Options = {
  userId: string | null;
  conversationId: string | null;
  onMessage: (msg: WSMessage) => void;
  onMessageUpdated: (msg: WSMessage) => void;
  onMessageDeleted: (conversationId: string, messageId: string) => void;
  onTyping: (e: TypingEvent) => void;
  onPresence: (e: PresenceEvent) => void;
  onOnlineList: (userIds: string[]) => void;
  onUnreadUpdate?: (conversationId: string) => void;
};

export function useMessagingWS({
  userId,
  conversationId,
  onMessage,
  onMessageUpdated,
  onMessageDeleted,
  onTyping,
  onPresence,
  onOnlineList,
  onUnreadUpdate,
}: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const callbacks = useRef({ onMessage, onMessageUpdated, onMessageDeleted, onTyping, onPresence, onOnlineList, onUnreadUpdate });
  callbacks.current = { onMessage, onMessageUpdated, onMessageDeleted, onTyping, onPresence, onOnlineList, onUnreadUpdate };

  const prevConvRef = useRef<string | null>(null);

  const sendRaw = useCallback((data: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendTyping = useCallback(
    (convId: string, isTyping: boolean) => {
      sendRaw({ type: 'typing', conversationId: convId, isTyping });
    },
    [sendRaw]
  );

  useEffect(() => {
    if (!userId) return;

    const apiUrl: string = import.meta.env.VITE_API_URL || '';
    const wsBase = apiUrl
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:')
      .replace(/\/api\/?$/, '');
    const url = `${wsBase}/ws`;

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Authenticate
        ws.send(JSON.stringify({ type: 'auth', userId }));
        // Re-join conversation if one is selected
        if (prevConvRef.current) {
          ws.send(JSON.stringify({ type: 'join_conv', conversationId: prevConvRef.current }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'new_message') {
            callbacks.current.onMessage(msg.message as WSMessage);
            if (msg.conversationId !== prevConvRef.current) {
              callbacks.current.onUnreadUpdate?.(msg.conversationId);
            }
          } else if (msg.type === 'message_updated') {
            callbacks.current.onMessageUpdated(msg.message as WSMessage);
          } else if (msg.type === 'message_deleted') {
            callbacks.current.onMessageDeleted(msg.conversationId as string, msg.messageId as string);
          } else if (msg.type === 'typing') {
            callbacks.current.onTyping(msg as TypingEvent);
          } else if (msg.type === 'presence') {
            callbacks.current.onPresence(msg as PresenceEvent);
          } else if (msg.type === 'online_list') {
            callbacks.current.onOnlineList(msg.userIds as string[]);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (!unmounted) reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => { ws.close(); };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [userId]);

  // Join / leave conversation rooms
  useEffect(() => {
    const prev = prevConvRef.current;
    if (prev && prev !== conversationId) {
      sendRaw({ type: 'leave_conv', conversationId: prev });
    }
    if (conversationId) {
      sendRaw({ type: 'join_conv', conversationId });
    }
    prevConvRef.current = conversationId;
  }, [conversationId, sendRaw]);

  return { sendTyping };
}
