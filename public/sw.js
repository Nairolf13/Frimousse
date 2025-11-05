const SW_VERSION = '__SW_VERSION__'; // replace at build time if possible (or changes when file updated)

self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Notification', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Frimousse';
  const options = {
    body: data.body || '',
    // prefer bundled app icons
    icon: data.icon || '/imgs/LogoFrimousse-192.png',
    badge: data.badge || '/imgs/LogoFrimousse-512.png',
    data: data.data || {},
    tag: data.tag || undefined,
  };

  // Report back to backend that SW received the push (useful for remote debugging).
  const report = async () => {
    try {
      const endpoint = (data.data && data.data.url) ? data.data.url : '/';
  // POST to backend debug endpoint via relative path so the dev server proxy
  // or the same origin handles routing. Backend accepts this only when PUSH_DEBUG=true.
  await fetch('/api/push-subscriptions/debug/received', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, body: data.body, tag: data.tag, data: data.data || {}, endpoint, receivedAt: Date.now() })
      }).catch(()=>{});
    } catch (e) {
      // ignore
    }
  };

  // Also notify any open clients (pages) via postMessage so remote console can observe push receipt.
  const notifyClients = async () => {
    try {
      const all = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const c of all) {
        try {
          c.postMessage({ type: 'push-received', title: data.title, body: data.body, data: data.data || {}, receivedAt: Date.now() });
        } catch (e) {}
      }
    } catch (e) {}
  };

  event.waitUntil(Promise.all([self.registration.showNotification(title, options), report(), notifyClients()]));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Support immediate activation via message from page
self.addEventListener('message', (evt) => {
  if (!evt.data) return;
  if (evt.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Optional: notify clients that a new service worker is active and they should reload
async function notifyClientsOfUpdate() {
  try {
    const all = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const c of all) {
      try { c.postMessage({ type: 'RELOAD_FOR_UPDATE', version: SW_VERSION }); } catch (e) {}
    }
  } catch (e) {}
}

self.addEventListener('activate', (evt) => {
  evt.waitUntil((async () => {
    try { await clients.claim(); } catch (e) {}
    // notify pages that a new SW is active
    notifyClientsOfUpdate();
  })());
});
