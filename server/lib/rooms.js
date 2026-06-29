'use strict';

const crypto = require('crypto');
const log = require('./log');
const metrics = require('./metrics');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const newId = () => crypto.randomBytes(6).toString('hex').toUpperCase();

/**
 * Lobby lifecycle: creation, destruction, join (with optional password +
 * privacy), opaque message routing, host assignment + migration, and reconnect
 * tokens. The relay stays game-agnostic — it never inspects relayed payloads.
 */
class Rooms {
  constructor() {
    /** code -> { code, hostId, privacy, passwordHash, peers: Map, createdAt } */
    this.rooms = new Map();
  }

  send(ws, msg) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
      metrics.inc('messages_out');
    }
  }

  broadcast(room, msg, exceptId) {
    for (const [id, peer] of room.peers) if (id !== exceptId) this.send(peer.ws, msg);
  }

  /** Joins (or creates) a room. Returns a result describing the outcome. */
  join(ws, opts) {
    const code = String(opts.room).toUpperCase();
    let room = this.rooms.get(code);

    if (!room) {
      if (!opts.create) return { ok: false, error: 'lobby_not_found' };
      room = {
        code,
        hostId: null,
        privacy: opts.privacy === 'private' || opts.privacy === 'invite' ? opts.privacy : 'public',
        passwordHash: opts.password ? sha(opts.password) : null,
        peers: new Map(),
        createdAt: Date.now(),
      };
      this.rooms.set(code, room);
      metrics.inc('lobbies_created');
      metrics.setGauge('lobbies_active', this.rooms.size);
      log.info('lobby created', { code, privacy: room.privacy });
    } else if (room.passwordHash && room.passwordHash !== sha(opts.password || '')) {
      return { ok: false, error: 'wrong_password' };
    }

    const id = newId();
    ws.peerId = id;
    ws.room = code;
    const reconnectToken = crypto.randomBytes(12).toString('hex');
    const existing = [...room.peers.keys()];
    room.peers.set(id, { ws, persistentId: opts.persistentId || null, reconnectToken });
    if (!room.hostId) room.hostId = id;

    this.broadcast(room, { t: 'join', id }, id);
    metrics.inc('joins');
    metrics.setGauge('peers_active', this.totalPeers());

    return { ok: true, code, peerId: id, hostId: room.hostId, peers: existing, reconnectToken };
  }

  /** Routes an opaque message to all / host / a specific peer. */
  route(ws, to, msg) {
    const room = this.rooms.get(ws.room);
    if (!room || !ws.peerId) return;
    const payload = { t: 'msg', from: ws.peerId, msg };
    if (to === 'all') this.broadcast(room, payload, ws.peerId);
    else if (to === 'host') {
      const host = room.peers.get(room.hostId);
      if (host && room.hostId !== ws.peerId) this.send(host.ws, payload);
    } else {
      const peer = room.peers.get(to);
      if (peer) this.send(peer.ws, payload);
    }
    metrics.inc('messages_relayed');
  }

  /** Removes a peer; migrates host and destroys empty rooms. */
  leave(ws) {
    const room = this.rooms.get(ws.room);
    if (!room || !ws.peerId) return;
    room.peers.delete(ws.peerId);
    this.broadcast(room, { t: 'leave', id: ws.peerId });

    if (room.peers.size === 0) {
      this.rooms.delete(room.code);
      metrics.setGauge('lobbies_active', this.rooms.size);
      log.info('lobby destroyed', { code: room.code });
    } else if (room.hostId === ws.peerId) {
      room.hostId = [...room.peers.keys()][0];
      this.broadcast(room, { t: 'host', id: room.hostId });
    }
    metrics.setGauge('peers_active', this.totalPeers());
  }

  totalPeers() {
    let n = 0;
    for (const r of this.rooms.values()) n += r.peers.size;
    return n;
  }

  /** Public lobby listing for the browse/quick-play UI. */
  publicLobbies() {
    return [...this.rooms.values()]
      .filter((r) => r.privacy === 'public' && !r.passwordHash)
      .map((r) => ({ code: r.code, players: r.peers.size }));
  }
}

module.exports = { Rooms };
