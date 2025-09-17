// Lightweight cross-tab rate-limit synchronization helper.
// Uses BroadcastChannel when available, falls back to localStorage events.
type RateLimitRecord = {
  key: string; // identifier for the endpoint (e.g. '/api/centers/1')
  until: number; // timestamp ms until which requests should be suppressed
};

const BC_NAME = 'frimousse-rate-limit';
const LS_KEY = '__frimousse_rate_limit__';

let bc: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) bc = new BroadcastChannel(BC_NAME);
} catch {
  bc = null;
}

function broadcast(record: RateLimitRecord) {
  const payload = JSON.stringify(record);
  if (bc) {
  try { bc.postMessage(record); } catch { /* ignore */ }
  } else if (typeof window !== 'undefined' && window.localStorage) {
  try { window.localStorage.setItem(LS_KEY, payload); } catch { /* ignore */ }
  }
}

function listen(cb: (r: RateLimitRecord) => void) {
  if (bc) {
    const handler = (ev: MessageEvent) => cb(ev.data as RateLimitRecord);
    bc.addEventListener('message', handler as EventListener);
    return () => { bc?.removeEventListener('message', handler as EventListener); };
  }

  if (typeof window !== 'undefined') {
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key || ev.key !== LS_KEY) return;
  try { const data = JSON.parse(String(ev.newValue || 'null')); if (data && data.key) cb(data as RateLimitRecord); } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage as EventListener);
    return () => { window.removeEventListener('storage', onStorage as EventListener); };
  }

  return () => {};
}

// Public API
export function publishRateLimit(key: string, untilMs: number) {
  broadcast({ key, until: untilMs });
}

export function subscribeRateLimit(handler: (r: RateLimitRecord) => void) {
  return listen(handler);
}

export function now() { return Date.now(); }
