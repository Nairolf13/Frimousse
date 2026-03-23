import { useEffect, useRef } from 'react';

type Entry = {
  id: string;
  nannySignature: string | null;
  nannySignedAt: string | null;
  parentSignature: string | null;
  parentSignedAt: string | null;
  [key: string]: unknown;
};

type SignatureEvent = {
  type: 'entry_signed';
  sheetId: string;
  entry: Entry;
  sheetStatus?: string;
};

type Options = {
  sheetId: string | null;
  onSignature: (event: SignatureEvent) => void;
};

export function usePresenceSheetWS({ sheetId, onSignature }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const onSignatureRef = useRef(onSignature);
  onSignatureRef.current = onSignature;

  useEffect(() => {
    if (!sheetId) return;

    // Derive WS URL from VITE_API_URL (replace http(s) with ws(s) and strip /api suffix)
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
        ws.send(JSON.stringify({ type: 'join', sheetId }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SignatureEvent;
          if (msg.type === 'entry_signed') {
            onSignatureRef.current(msg);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (!unmounted) {
          // Reconnect after 3 seconds
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
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
  }, [sheetId]);
}
