import { useEffect } from 'react';

/**
 * Keeps a lightweight WebSocket connection open for the lifetime of the
 * authenticated session so the backend's online-presence tracking
 * (wsServer.js onlineUsers) reflects the whole app, not just the
 * Messaging page. Mount once, high in the authenticated tree.
 */
export function usePresenceWS(userId: string | null | undefined) {
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
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', userId }));
      };
      ws.onclose = () => {
        if (unmounted) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [userId]);
}
