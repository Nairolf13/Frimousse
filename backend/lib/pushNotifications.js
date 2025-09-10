const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DEBUG = !!process.env.PUSH_DEBUG;

// Remove local dev origins and configured FRONTEND_URL from notification text
function sanitizeText(str) {
  if (!str) return str;
  let out = String(str);
  // Remove explicit FRONTEND_URL if set
  if (process.env.FRONTEND_URL) {
    out = out.split(process.env.FRONTEND_URL).join('');
  }
  // Remove common local hosts (http(s)://localhost[:port], 127.0.0.1)
  out = out.replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/g, '');
  // Trim leftover whitespace and stray slashes
  out = out.replace(/\s+/g, ' ').trim();
  out = out.replace(/\/(\s|$)/g, ' $1').trim();
  return out;
}

async function sendFeedPostNotification({ postId, centerId, authorId, authorName, text, action = 'created' }) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || 'mailto:notifications@lesfrimousses.com';

  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not configured - skipping push sends');
    return;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);

  // find users for the center (excluding the author)
  const users = await prisma.user.findMany({ where: { centerId }, select: { id: true, name: true } });
  const userIds = users.map(u => u.id).filter(id => id && id !== authorId);
  if (userIds.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  // Defensive: exclude any subscription whose endpoint matches one of the author's endpoints
  let authorEndpoints = new Set();
  try {
    if (authorId) {
      const authorSubsAll = await prisma.pushSubscription.findMany({ where: { userId: authorId } });
      for (const a of authorSubsAll) {
        if (a.subscription && a.subscription.endpoint) authorEndpoints.add(a.subscription.endpoint);
      }
      // filter out any subs that point to the author's endpoints
      const beforeCount = subs.length;
      const filtered = subs.filter(s => !(s.subscription && s.subscription.endpoint && authorEndpoints.has(s.subscription.endpoint)));
      subs.splice(0, subs.length, ...filtered);
    }
  } catch (e) {
    // ignore
  }
  if (!subs || subs.length === 0) return;

  const rawTitle = `${authorName || 'Un membre'} ${action === 'created' ? 'a publié' : 'a mis à jour'} une publication`;
  const title = sanitizeText(rawTitle);
  const rawBody = text ? (text.length > 120 ? text.slice(0, 117) + '...' : text) : 'Nouvelle publication sur le fil';
  const body = sanitizeText(rawBody);
  const payloadObj = { title, body, icon: '/imgs/LogoFrimousse-192.png', badge: '/imgs/LogoFrimousse-512.png', tag: 'frimousse-feed', data: { url: `/feed/${postId}`, postId } };
  const payload = JSON.stringify(payloadObj);

  // Persist notifications for target users so they appear in the in-app Notifications section
  try {
    const toStore = Object.assign({ icon: '/imgs/LogoFrimousse-192.png', badge: '/imgs/LogoFrimousse-512.png' }, payloadObj || {});
    const createRows = userIds.map(u => ({ userId: u, title: String(toStore.title || 'Notification'), body: toStore.body || null, data: toStore }));
    try {
      await prisma.notification.createMany({ data: createRows });
    } catch (e) {
      for (const r of createRows) {
        try { await prisma.notification.create({ data: r }); } catch (e2) { if (DEBUG) console.error('[push] notif create failed for', r.userId, e2 && e2.message ? e2.message : e2); }
      }
    }
  } catch (e) {
    if (DEBUG) console.error('[push] failed to persist feed notifications', e && e.message ? e.message : e);
  }

  for (const s of subs) {
    try {
      if (DEBUG) {
        try { console.debug('[push] about to send to sub=', s.id, 'endpoint=', (s.subscription && s.subscription.endpoint) ? s.subscription.endpoint.slice(0,120) + '...' : '', 'payloadLen=', payload ? payload.length : 0); } catch(e){}
      }
      const res = await webpush.sendNotification(s.subscription, payload);
      if (DEBUG) {
        try { console.debug('[push] sendNotification result for sub=', s.id, 'res=', res && res.statusCode ? res.statusCode : (res ? JSON.stringify(res) : 'ok')); } catch(e){}
      }
    } catch (err) {
      const statusCode = (err && err.statusCode) || (err && err.status) || null;
  console.error('Failed to send push to', s.id, statusCode || '', err && err.body ? err.body : (err && err.message) || err);
      if (statusCode === 404 || statusCode === 410) {
        try {
          await prisma.pushSubscription.delete({ where: { id: s.id } });
          console.log('Deleted invalid subscription');
        } catch (delErr) {
          console.error('Failed to delete subscription');
        }
      }
    }
  }
}

async function _sendToUser(userId, payloadObj) {
  if (!userId) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || 'mailto:notifications@lesfrimousses.com';
  // Persist notification in DB for this user even if push sending is disabled
  try {
    const toStore = Object.assign({ icon: '/imgs/LogoFrimousse-192.png', badge: '/imgs/LogoFrimousse-512.png' }, payloadObj || {});
    await prisma.notification.create({ data: { userId, title: String(toStore.title || 'Notification'), body: toStore.body || null, data: toStore } });
  } catch (e) {
    if (DEBUG) console.error('[push] failed to persist notification for user', userId, e && e.message ? e.message : e);
  }

  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(contact, publicKey, privateKey);
  if (DEBUG) console.debug('[push] _sendToUser userId=', userId);
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (DEBUG) console.debug('[push] _sendToUser found subs=', subs && subs.length ? subs.length : 0, 'for user', userId);
  if (!subs || subs.length === 0) return;
  // Deduplicate subscriptions by endpoint (multiple DB rows for same device cause duplicate notifications)
  const grouped = new Map();
  for (const s of subs) {
    const endpoint = s && s.subscription && s.subscription.endpoint ? s.subscription.endpoint : JSON.stringify(s.subscription || {});
    const prev = grouped.get(endpoint);
    // prefer the most recently created row when duplicates exist
    if (!prev || (s.createdAt && prev.createdAt && new Date(s.createdAt) > new Date(prev.createdAt))) grouped.set(endpoint, s);
  }
  const uniqueSubs = Array.from(grouped.values());
  if (DEBUG && uniqueSubs.length !== subs.length) console.debug('[push] _sendToUser deduped subs', subs.length, '->', uniqueSubs.length, 'for user', userId);
  // Ensure icon and badge fallbacks so notifications show the app logo when provided
  const safePayloadObj = Object.assign({ icon: '/imgs/LogoFrimousse-192.png', badge: '/imgs/LogoFrimousse-512.png' }, payloadObj || {});
  const payload = JSON.stringify(safePayloadObj);
  for (const s of uniqueSubs) {
    try {
      const res = await webpush.sendNotification(s.subscription, payload);
      if (DEBUG) {
        try { console.debug('[push] notifyUsers sent sub=', s.id, 'endpoint=', (s.subscription && s.subscription.endpoint) ? s.subscription.endpoint.slice(0,80) + '...' : '', 'res=', res && res.statusCode ? res.statusCode : 'ok'); } catch(e) {}
      }
    } catch (err) {
      const statusCode = (err && err.statusCode) || (err && err.status) || null;
  console.error('Failed to send push to', s.id, statusCode || '', err && err.body ? err.body : (err && err.message) || err);
      if (statusCode === 404 || statusCode === 410) {
        try { await prisma.pushSubscription.delete({ where: { id: s.id } }); } catch (delErr) { console.error('Failed to delete subscription', s.id, delErr); }
      }
    }
  }
}

async function sendLikeNotification({ postId, likerId, likerName }) {
  // notify owner of the post (author)
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) return;
  if (post.authorId === likerId) return; // don't notify self
  // no debug logs
  const name = likerName || "Quelqu'un";
  const rawTitle = `${name} a aimé votre publication`;
  const title = sanitizeText(rawTitle);
  const rawSnippet = post.text ? (post.text.length > 120 ? post.text.slice(0, 117) + '...' : post.text) : 'Votre publication a été aimée';
  const body = sanitizeText(rawSnippet);
  await _sendToUser(post.authorId, { title, body, tag: 'frimousse-like', data: { url: `/feed/${postId}`, postId } });
}

async function sendCommentNotification({ postId, commenterId, commenterName, commentText }) {
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) return;

  // Build a recipient set: post author, previous commenters, likers (treated as followers)
  const recipientIds = new Set();

  // Post author
  if (post.authorId && post.authorId !== commenterId) recipientIds.add(post.authorId);

  // Previous commenters
  try {
    const comments = await prisma.feedComment.findMany({ where: { postId }, select: { authorId: true } });
    for (const c of comments) {
      if (c.authorId && c.authorId !== commenterId) recipientIds.add(c.authorId);
    }
  } catch (e) {
  }

  // Likers 
  try {
    const likes = await prisma.feedLike.findMany({ where: { postId }, select: { userId: true } });
    for (const l of likes) {
      if (l.userId && l.userId !== commenterId) recipientIds.add(l.userId);
    }
  } catch (e) {
  }

  // Remove commenter if present (safety)
  if (recipientIds.has(commenterId)) recipientIds.delete(commenterId);

  const titleAuthorRaw = `${commenterName || "Quelqu'un"} a commenté votre publication`;
  const titleParticipantRaw = `${commenterName || "Quelqu'un"} a ajouté un nouveau commentaire`;
  const titleAuthor = sanitizeText(titleAuthorRaw);
  const titleParticipant = sanitizeText(titleParticipantRaw);
  const rawSnippet = commentText ? (commentText.length > 120 ? commentText.slice(0,117) + '...' : commentText) : 'Nouveau commentaire';
  const body = sanitizeText(rawSnippet);

  // Send to each recipient (do not await sequentially to keep background fast)
  for (const uid of recipientIds) {
    (async () => {
      try {
        const isAuthor = uid === post.authorId;
        const payload = {
          title: isAuthor ? titleAuthor : titleParticipant,
          body,
          tag: 'frimousse-comment',
          data: { url: `/feed/${postId}`, postId }
        };
        await _sendToUser(uid, payload);
      } catch (err) {
        console.error('Error sending comment notification to', uid, err && err.message ? err.message : err);
      }
    })();
  }
}

// Send a single payload to multiple users (userIds array)
async function notifyUsers(userIds, payloadObj) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || 'mailto:notifications@lesfrimousses.com';
  // Persist notifications in DB for all target users even if push sending is disabled
  try {
    const toStore = Object.assign({ icon: '/imgs/LogoFrimousse-192.png', badge: '/imgs/LogoFrimousse-512.png' }, payloadObj || {});
    const createRows = userIds.map(u => ({ userId: u, title: String(toStore.title || 'Notification'), body: toStore.body || null, data: toStore }));
    // createMany is faster; ignore errors if DB doesn't support it in some envs
    try {
      await prisma.notification.createMany({ data: createRows });
    } catch (e) {
      // fallback: create individually
      for (const r of createRows) {
        try { await prisma.notification.create({ data: r }); } catch (e2) { if (DEBUG) console.error('[push] notif create failed for', r.userId, e2 && e2.message ? e2.message : e2); }
      }
    }
  } catch (e) {
    if (DEBUG) console.error('[push] failed to persist notifications', e && e.message ? e.message : e);
  }

  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(contact, publicKey, privateKey);

  if (DEBUG) console.debug('[push] notifyUsers target userIds=', userIds);
  // collect subscriptions for these users
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  if (DEBUG) console.debug('[push] notifyUsers found subs=', subs && subs.length ? subs.length : 0);
  if (!subs || subs.length === 0) return;
  // Deduplicate subscriptions by endpoint to avoid sending multiple notifications to the same device
  const grouped = new Map();
  for (const s of subs) {
    const endpoint = s && s.subscription && s.subscription.endpoint ? s.subscription.endpoint : JSON.stringify(s.subscription || {});
    const prev = grouped.get(endpoint);
    if (!prev || (s.createdAt && prev.createdAt && new Date(s.createdAt) > new Date(prev.createdAt))) grouped.set(endpoint, s);
  }
  const uniqueSubs = Array.from(grouped.values());
  if (DEBUG && uniqueSubs.length !== subs.length) console.debug('[push] notifyUsers deduped subs', subs.length, '->', uniqueSubs.length);

  const safePayloadObj = Object.assign({ icon: '/imgs/LogoFrimousse-192.png', badge: '/imgs/LogoFrimousse-512.png' }, payloadObj || {});
  const payload = JSON.stringify(safePayloadObj);

  for (const s of uniqueSubs) {
    try {
      await webpush.sendNotification(s.subscription, payload);
    } catch (err) {
      const statusCode = (err && err.statusCode) || (err && err.status) || null;
      console.error('Failed to send push to', s.id, statusCode || '', err && err.body ? err.body : (err && err.message) || err);
      if (statusCode === 404 || statusCode === 410) {
        try { await prisma.pushSubscription.delete({ where: { id: s.id } }); } catch (delErr) { console.error('Failed to delete subscription', s.id, delErr); }
      }
    }
  }
}

module.exports = { sendFeedPostNotification, sendLikeNotification, sendCommentNotification, notifyUsers };

