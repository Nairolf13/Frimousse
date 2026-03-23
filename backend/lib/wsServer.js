/**
 * WebSocket server.
 *
 * Handles two concerns:
 *   1. Presence sheets — real-time signature broadcasts (join by sheetId)
 *   2. Messaging      — real-time chat, typing indicators, online presence
 */
const { WebSocketServer, OPEN } = require('ws');

let wss = null;

// ─── Presence sheets rooms ───────────────────────────────────────────────────
// Map: sheetId -> Set<WebSocket>
const sheetRooms = new Map();

// ─── Messaging ───────────────────────────────────────────────────────────────
// Map: conversationId -> Set<WebSocket>
const convRooms = new Map();
// Map: userId -> Set<WebSocket>  (for online-presence tracking)
const userConnections = new Map();
// Set of currently-online userIds
const onlineUsers = new Set();

function init(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.sheetId = null;      // joined presence-sheet room
    ws.convIds = new Set(); // joined conversation rooms
    ws.userId = null;       // authenticated user id

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      // ── Presence sheet: join sheet room ──
      if (msg.type === 'join' && msg.sheetId) {
        if (ws.sheetId && sheetRooms.has(ws.sheetId)) {
          sheetRooms.get(ws.sheetId).delete(ws);
        }
        ws.sheetId = msg.sheetId;
        if (!sheetRooms.has(msg.sheetId)) sheetRooms.set(msg.sheetId, new Set());
        sheetRooms.get(msg.sheetId).add(ws);
        return;
      }

      // ── Messaging: authenticate ──
      if (msg.type === 'auth' && msg.userId) {
        const prevUserId = ws.userId;
        if (prevUserId && prevUserId !== msg.userId) {
          // clean up old identity
          removeUserConnection(ws, prevUserId);
        }
        ws.userId = msg.userId;
        if (!userConnections.has(msg.userId)) userConnections.set(msg.userId, new Set());
        userConnections.get(msg.userId).add(ws);
        if (!onlineUsers.has(msg.userId)) {
          onlineUsers.add(msg.userId);
          broadcastPresence(msg.userId, true);
        }
        // Send current online list to this client
        ws.send(JSON.stringify({ type: 'online_list', userIds: [...onlineUsers] }));
        return;
      }

      // ── Messaging: join conversation room ──
      if (msg.type === 'join_conv' && msg.conversationId) {
        if (!convRooms.has(msg.conversationId)) convRooms.set(msg.conversationId, new Set());
        convRooms.get(msg.conversationId).add(ws);
        ws.convIds.add(msg.conversationId);
        return;
      }

      // ── Messaging: leave conversation room ──
      if (msg.type === 'leave_conv' && msg.conversationId) {
        leaveConvRoom(ws, msg.conversationId);
        return;
      }

      // ── Messaging: typing indicator ──
      if (msg.type === 'typing' && msg.conversationId && ws.userId) {
        broadcastToConv(msg.conversationId, {
          type: 'typing',
          conversationId: msg.conversationId,
          userId: ws.userId,
          isTyping: !!msg.isTyping,
        }, ws);
        return;
      }
    });

    ws.on('close', () => {
      // Leave presence sheet room
      if (ws.sheetId && sheetRooms.has(ws.sheetId)) {
        sheetRooms.get(ws.sheetId).delete(ws);
        if (sheetRooms.get(ws.sheetId).size === 0) sheetRooms.delete(ws.sheetId);
      }
      // Leave conversation rooms
      for (const convId of ws.convIds) {
        leaveConvRoom(ws, convId);
      }
      // Remove online presence
      if (ws.userId) {
        removeUserConnection(ws, ws.userId);
      }
    });

    ws.on('error', () => { /* ignore */ });
  });
}

function leaveConvRoom(ws, convId) {
  if (convRooms.has(convId)) {
    convRooms.get(convId).delete(ws);
    if (convRooms.get(convId).size === 0) convRooms.delete(convId);
  }
  ws.convIds.delete(convId);
}

function removeUserConnection(ws, userId) {
  if (userConnections.has(userId)) {
    userConnections.get(userId).delete(ws);
    if (userConnections.get(userId).size === 0) {
      userConnections.delete(userId);
      onlineUsers.delete(userId);
      broadcastPresence(userId, false);
    }
  }
}

/** Broadcast an online/offline event to all connected clients */
function broadcastPresence(userId, isOnline) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'presence', userId, online: isOnline });
  for (const client of wss.clients) {
    if (client.readyState === OPEN) client.send(payload);
  }
}

/** Broadcast to all clients in a conversation room, optionally excluding one sender */
function broadcastToConv(conversationId, data, exclude = null) {
  if (!convRooms.has(conversationId)) return;
  const payload = JSON.stringify(data);
  for (const client of convRooms.get(conversationId)) {
    if (client !== exclude && client.readyState === OPEN) client.send(payload);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Broadcast a signature event to all clients watching a presence sheet.
 */
function broadcastSignature(sheetId, entry, newSheetStatus) {
  if (!sheetRooms.has(sheetId)) return;
  const payload = JSON.stringify({
    type: 'entry_signed',
    sheetId,
    entry,
    ...(newSheetStatus ? { sheetStatus: newSheetStatus } : {}),
  });
  for (const client of sheetRooms.get(sheetId)) {
    if (client.readyState === OPEN) client.send(payload);
  }
}

/**
 * Broadcast a new message to all clients watching that conversation.
 * Also pushes a `new_message` notification to participants who are NOT
 * currently in the conversation room (so their unread badge updates).
 */
function broadcastMessage(conversationId, message) {
  const payload = JSON.stringify({ type: 'new_message', conversationId, message });

  // Clients inside the conversation room get the full message
  if (convRooms.has(conversationId)) {
    for (const client of convRooms.get(conversationId)) {
      if (client.readyState === OPEN) client.send(payload);
    }
  }

  // Notify participants who are online but not in the room (badge update)
  if (wss) {
    for (const client of wss.clients) {
      if (client.readyState !== OPEN) continue;
      if (!client.userId) continue;
      if (client.userId === message.senderId) continue;
      if (client.convIds && client.convIds.has(conversationId)) continue;
      client.send(payload);
    }
  }
}

/**
 * Send a message to a specific user (all their connections).
 */
function sendToUser(userId, data) {
  if (!userConnections.has(userId)) return;
  const payload = JSON.stringify(data);
  for (const client of userConnections.get(userId)) {
    if (client.readyState === OPEN) client.send(payload);
  }
}

/**
 * Broadcast a message_updated or message_deleted event to all online participants.
 * Unlike broadcastToConv (room-only), this reaches users even if they haven't opened the conversation.
 */
function broadcastToParticipants(participantUserIds, data) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState !== OPEN) continue;
    if (!client.userId) continue;
    if (participantUserIds.includes(client.userId)) client.send(payload);
  }
}

module.exports = { init, broadcastSignature, broadcastMessage, broadcastToParticipants, sendToUser };
