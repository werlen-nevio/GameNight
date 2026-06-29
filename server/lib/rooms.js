'use strict';

const crypto = require('crypto');
const log = require('./log');
const metrics = require('./metrics');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const newPeerId = () => crypto.randomBytes(6).toString('hex').toUpperCase();

// Unambiguous, uppercase charset (no 0/O/1/I/L) for share codes.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LEN = 8; // 31^8 ≈ 8.5e11 — practically un-enumerable, esp. with TTL + rate limits

const DEFAULT_TTL_MS = Number(process.env.LOBBY_TTL_MS || 6 * 60 * 60 * 1000); // 6h

/**
 * Secure, server-authoritative lobby registry.
 *
 * - Every lobby has an internal **128-bit id** that is NEVER sent to clients.
 * - Clients only ever see a short, server-generated **share code** (collision-
 *   safe, high-entropy alphabet), which maps to the internal id server-side.
 * - Lobbies **expire** (TTL) and the share code can be **rotated**; a sweeper
 *   reaps expired/empty rooms. Codes are un-enumerable in practice and join
 *   attempts are rate-limited at the connection layer.
 */
class Rooms {
  constructor(opts = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    /** internalId -> room */
    this.rooms = new Map();
    /** shareCode -> internalId */
    this.codeIndex = new Map();
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

  /** Generates a unique share code (retries on the astronomically rare collision). */
  generateCode() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const bytes = crypto.randomBytes(CODE_LEN);
      let code = '';
      for (let i = 0; i < CODE_LEN; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
      if (!this.codeIndex.has(code)) return code;
    }
    // Fallback: append entropy (still collision-checked).
    return this.generateCode() + CODE_ALPHABET[crypto.randomBytes(1)[0] % CODE_ALPHABET.length];
  }

  resolve(shareCode) {
    const internalId = this.codeIndex.get(String(shareCode).toUpperCase());
    if (!internalId) return null;
    const room = this.rooms.get(internalId);
    if (!room) return null;
    if (room.expiresAt && room.expiresAt < Date.now()) {
      this.destroy(room);
      return null;
    }
    return room;
  }

  /** Joins (create=server-assigns a fresh code) or joins by share code. */
  join(ws, opts) {
    let room;
    if (opts.create) {
      const internalId = crypto.randomBytes(16).toString('hex'); // 128-bit, never exposed
      const code = this.generateCode();
      room = {
        internalId,
        code,
        hostId: null,
        privacy: opts.privacy === 'private' || opts.privacy === 'invite' ? opts.privacy : 'public',
        passwordHash: opts.password ? sha(opts.password) : null,
        peers: new Map(),
        createdAt: Date.now(),
        expiresAt: Date.now() + this.ttlMs,
      };
      this.rooms.set(internalId, room);
      this.codeIndex.set(code, internalId);
      metrics.inc('lobbies_created');
      metrics.setGauge('lobbies_active', this.rooms.size);
      log.info('lobby created', { code, privacy: room.privacy });
    } else {
      room = this.resolve(opts.room);
      if (!room) {
        metrics.inc('join_failed');
        return { ok: false, error: 'lobby_not_found' };
      }
      if (room.passwordHash && room.passwordHash !== sha(opts.password || '')) {
        metrics.inc('join_failed');
        return { ok: false, error: 'wrong_password' };
      }
    }

    const id = newPeerId();
    ws.peerId = id;
    ws.roomId = room.internalId;
    const reconnectToken = crypto.randomBytes(12).toString('hex');
    const existing = [...room.peers.keys()];
    room.peers.set(id, { ws, persistentId: opts.persistentId || null, reconnectToken });
    if (!room.hostId) room.hostId = id;
    // Keep the lobby alive while in use.
    room.expiresAt = Date.now() + this.ttlMs;

    this.broadcast(room, { t: 'join', id }, id);
    metrics.inc('joins');
    metrics.setGauge('peers_active', this.totalPeers());

    return { ok: true, code: room.code, peerId: id, hostId: room.hostId, peers: existing, reconnectToken };
  }

  route(ws, to, msg) {
    const room = ws.roomId ? this.rooms.get(ws.roomId) : null;
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

  /** Host-only: rotate the share code, invalidating the old one. */
  rotate(ws) {
    const room = ws.roomId ? this.rooms.get(ws.roomId) : null;
    if (!room || room.hostId !== ws.peerId) return null;
    this.codeIndex.delete(room.code);
    room.code = this.generateCode();
    this.codeIndex.set(room.code, room.internalId);
    log.info('lobby code rotated', { code: room.code });
    return room.code;
  }

  leave(ws) {
    const room = ws.roomId ? this.rooms.get(ws.roomId) : null;
    if (!room || !ws.peerId) return;
    room.peers.delete(ws.peerId);
    this.broadcast(room, { t: 'leave', id: ws.peerId });
    if (room.peers.size === 0) {
      this.destroy(room);
    } else if (room.hostId === ws.peerId) {
      room.hostId = [...room.peers.keys()][0];
      this.broadcast(room, { t: 'host', id: room.hostId });
    }
    metrics.setGauge('peers_active', this.totalPeers());
  }

  destroy(room) {
    this.codeIndex.delete(room.code);
    this.rooms.delete(room.internalId);
    metrics.setGauge('lobbies_active', this.rooms.size);
    log.info('lobby destroyed', { code: room.code });
  }

  /** Reaps expired (or expired-empty) lobbies. Call on an interval. */
  sweepExpired() {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      if (room.expiresAt && room.expiresAt < now) this.destroy(room);
    }
  }

  totalPeers() {
    let n = 0;
    for (const r of this.rooms.values()) n += r.peers.size;
    return n;
  }

  publicLobbies() {
    return [...this.rooms.values()]
      .filter((r) => r.privacy === 'public' && !r.passwordHash)
      .map((r) => ({ code: r.code, players: r.peers.size }));
  }
}

module.exports = { Rooms };
