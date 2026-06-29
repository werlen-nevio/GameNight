/*
 * GameNight reference relay server.
 *
 * A deliberately "dumb" WebSocket relay: it assigns peer ids, tracks room
 * membership and forwards opaque GameNight protocol messages. It understands
 * nothing about lobbies or games, so it works unchanged for every game mode —
 * and can be swapped for WebRTC, Photon, Colyseus, Steam or a dedicated server
 * without touching client gameplay code.
 *
 * Wire protocol: see src/core/transport/relayProtocol.ts
 *
 * Run:  node server/relay.js           (PORT env, default 8080)
 * Then: EXPO_PUBLIC_RELAY_URL=ws://localhost:8080 npm run web
 */
'use strict';

const { WebSocketServer } = require('ws');

function newId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/** Creates (but does not necessarily listen on) the relay server. */
function createRelayServer(options = {}) {
  const wss = new WebSocketServer({ port: options.port ?? 8080, host: options.host });
  /** room code -> { hostId, peers: Map<peerId, ws> } */
  const rooms = new Map();

  function send(ws, msg) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  function broadcast(room, msg, exceptId) {
    for (const [id, ws] of room.peers) if (id !== exceptId) send(ws, msg);
  }

  wss.on('connection', (ws) => {
    ws.peerId = null;
    ws.room = null;

    ws.on('message', (raw) => {
      let m;
      try {
        m = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (m.t) {
        case 'hello': {
          const code = String(m.room || '').toUpperCase();
          let room = rooms.get(code);
          if (!room) {
            room = { hostId: null, peers: new Map() };
            rooms.set(code, room);
          }
          const id = newId();
          ws.peerId = id;
          ws.room = code;
          if (!room.hostId) room.hostId = id;
          const existing = [...room.peers.keys()];
          room.peers.set(id, ws);
          send(ws, { t: 'welcome', selfId: id, hostId: room.hostId, peers: existing });
          broadcast(room, { t: 'join', id }, id);
          break;
        }
        case 'relay': {
          const room = rooms.get(ws.room);
          if (!room || !ws.peerId) break;
          const payload = { t: 'msg', from: ws.peerId, msg: m.msg };
          const to = m.to ?? 'all';
          if (to === 'all') broadcast(room, payload, ws.peerId);
          else if (to === 'host') {
            const host = room.peers.get(room.hostId);
            if (host && room.hostId !== ws.peerId) send(host, payload);
          } else {
            const peer = room.peers.get(to);
            if (peer) send(peer, payload);
          }
          break;
        }
        case 'ping':
          send(ws, { t: 'pong', ts: m.ts });
          break;
        case 'bye':
          ws.close();
          break;
      }
    });

    ws.on('close', () => {
      const room = rooms.get(ws.room);
      if (!room || !ws.peerId) return;
      room.peers.delete(ws.peerId);
      broadcast(room, { t: 'leave', id: ws.peerId });
      if (room.peers.size === 0) {
        rooms.delete(ws.room);
      } else if (room.hostId === ws.peerId) {
        room.hostId = [...room.peers.keys()][0];
        broadcast(room, { t: 'host', id: room.hostId });
      }
    });
  });

  return wss;
}

module.exports = { createRelayServer };

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  createRelayServer({ port });
  // eslint-disable-next-line no-console
  console.log(`GameNight relay listening on ws://localhost:${port}`);
}
