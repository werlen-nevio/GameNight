/*
 * GameNight production relay server.
 *
 * A game-agnostic WebSocket relay with: HMAC session tokens, heartbeats,
 * per-connection rate limiting, strict message validation, permessage-deflate
 * compression, lobby lifecycle (create/destroy/password/privacy), presence +
 * friend invites, matchmaking queues, a cloud-save KV store, structured logging
 * and /health + /metrics endpoints.
 *
 * Modular by design (see server/lib/*) — no giant manager class. Stateless
 * tokens + per-node metrics make it horizontally scalable behind a sticky LB
 * (or a shared Redis for cross-node rooms/presence — swap rooms/presence/kv).
 *
 * Run:  node server/relay.js              (PORT env, default 8080)
 * Wire: EXPO_PUBLIC_RELAY_URL=ws://localhost:8080 npm run web
 */
'use strict';

const http = require('http');
const { WebSocketServer } = require('ws');

const log = require('./lib/log');
const metrics = require('./lib/metrics');
const protocol = require('./lib/protocol');
const { RateLimiter } = require('./lib/ratelimit');
const { Rooms } = require('./lib/rooms');
const { Presence } = require('./lib/presence');
const { Matchmaker } = require('./lib/matchmaking');
const { KvStore } = require('./lib/kvstore');
const auth = require('./lib/auth');

const HEARTBEAT_MS = 30_000;

function createRelayServer(options = {}) {
  const rooms = new Rooms();
  const presence = new Presence();
  const matchmaker = new Matchmaker();
  const kv = new KvStore({ file: options.kvFile || process.env.KV_FILE || null });

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...metrics.snapshot() }));
    } else if (req.url === '/metrics') {
      res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' });
      res.end(metrics.prometheus());
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const wss = new WebSocketServer({ server, perMessageDeflate: true, maxPayload: protocol.MAX_MESSAGE_BYTES });

  const send = (ws, msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.limiter = new RateLimiter();
    ws.peerId = null;
    ws.room = null;
    ws.account = null;
    metrics.inc('connections');

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      metrics.inc('messages_in');
      const text = raw.toString();
      if (!ws.limiter.allow(text.length)) {
        if (ws.limiter.shouldDisconnect) {
          send(ws, { t: 'error', reason: 'rate_limited', code: 429 });
          ws.close();
        }
        return;
      }

      const result = protocol.parse(text);
      if (!result.ok) {
        metrics.inc('messages_invalid');
        send(ws, { t: 'error', reason: result.error, code: 400 });
        return;
      }
      dispatch(ws, result.msg);
    });

    ws.on('close', () => {
      rooms.leave(ws);
      matchmaker.remove(ws);
      presence.offline(ws);
    });

    ws.on('error', () => {});
  });

  function dispatch(ws, m) {
    switch (m.t) {
      case 'auth': {
        const verified = m.token ? auth.verifyToken(m.token) : null;
        const persistentId = verified?.sub || m.persistentId || 'P' + Math.random().toString(36).slice(2, 12);
        const token = auth.issueToken(persistentId, m.provider || verified?.provider || 'guest');
        presence.online(ws, persistentId, m.name);
        send(ws, { t: 'authed', persistentId, token });
        break;
      }
      case 'hello': {
        if (auth.AUTH_REQUIRED && !ws.account && !auth.verifyToken(m.token)) {
          send(ws, { t: 'error', reason: 'auth_required', code: 401 });
          return;
        }
        const res = rooms.join(ws, m);
        if (!res.ok) {
          send(ws, { t: 'error', reason: res.error, code: 403 });
          return;
        }
        send(ws, { t: 'welcome', selfId: res.peerId, hostId: res.hostId, peers: res.peers, reconnectToken: res.reconnectToken });
        if (ws.account) presence.setState(ws.account, 'in_lobby', res.code);
        break;
      }
      case 'relay':
        rooms.route(ws, m.to, m.msg);
        break;
      case 'ping':
        send(ws, { t: 'pong', ts: m.ts });
        break;
      case 'queue':
        matchmaker.enqueue(ws, m.qtype, m.modeId);
        break;
      case 'dequeue':
        matchmaker.dequeue(m.ticketId);
        break;
      case 'watch':
        presence.watch(ws, m.ids);
        break;
      case 'invite':
        presence.invite(ws.account, m.to, m.lobbyCode, ws.displayName);
        break;
      case 'kvget':
        if (!ws.account) return send(ws, { t: 'error', reason: 'auth_required', code: 401 });
        send(ws, { t: 'kv', key: m.key, value: kv.get(ws.account, m.key) });
        break;
      case 'kvset':
        if (!ws.account) return send(ws, { t: 'error', reason: 'auth_required', code: 401 });
        kv.set(ws.account, m.key, m.value);
        send(ws, { t: 'kvok', key: m.key });
        break;
      case 'bye':
        ws.close();
        break;
    }
  }

  // Heartbeat: terminate connections that stop responding to pings.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        /* ignore */
      }
    }
  }, HEARTBEAT_MS);
  if (heartbeat.unref) heartbeat.unref();

  if (options.port != null) server.listen(options.port, options.host);

  return {
    wss,
    server,
    rooms,
    presence,
    matchmaker,
    close() {
      clearInterval(heartbeat);
      wss.close();
      server.close();
    },
  };
}

module.exports = { createRelayServer };

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  createRelayServer({ port });
  log.info('relay listening', { port, authRequired: auth.AUTH_REQUIRED });
  // eslint-disable-next-line no-console
  console.log(`GameNight relay listening on ws://localhost:${port}  (/health, /metrics)`);
}
