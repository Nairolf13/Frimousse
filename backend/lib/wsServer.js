/**
 * WebSocket server for real-time presence sheet signature events.
 * Clients join a "room" identified by sheetId.
 * When a signature is saved, the server broadcasts the updated entry
 * to all clients watching that sheet.
 */
const { WebSocketServer, OPEN } = require('ws');

let wss = null;

// Map: sheetId -> Set of WebSocket clients
const rooms = new Map();

function init(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.sheetId = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        // Client sends { type: 'join', sheetId: '...' } to subscribe
        if (msg.type === 'join' && msg.sheetId) {
          // Leave previous room
          if (ws.sheetId && rooms.has(ws.sheetId)) {
            rooms.get(ws.sheetId).delete(ws);
          }
          ws.sheetId = msg.sheetId;
          if (!rooms.has(msg.sheetId)) rooms.set(msg.sheetId, new Set());
          rooms.get(msg.sheetId).add(ws);
        }
      } catch { /* ignore malformed messages */ }
    });

    ws.on('close', () => {
      if (ws.sheetId && rooms.has(ws.sheetId)) {
        rooms.get(ws.sheetId).delete(ws);
        if (rooms.get(ws.sheetId).size === 0) rooms.delete(ws.sheetId);
      }
    });

    ws.on('error', () => { /* ignore */ });
  });
}

/**
 * Broadcast a signature event to all clients watching a sheet.
 * @param {string} sheetId
 * @param {object} entry - the updated PresenceEntry
 * @param {string} [newSheetStatus] - new sheet status if it changed (e.g. 'signed')
 */
function broadcastSignature(sheetId, entry, newSheetStatus) {
  if (!rooms.has(sheetId)) return;
  const payload = JSON.stringify({
    type: 'entry_signed',
    sheetId,
    entry,
    ...(newSheetStatus ? { sheetStatus: newSheetStatus } : {}),
  });
  for (const client of rooms.get(sheetId)) {
    if (client.readyState === OPEN) {
      client.send(payload);
    }
  }
}

module.exports = { init, broadcastSignature };
