'use strict';

const crypto = require('crypto');
const metrics = require('./metrics');
const log = require('./log');

const newCode = () => {
  const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let s = '';
  for (let i = 0; i < 6; i++) s += A[crypto.randomBytes(1)[0] % A.length];
  return s;
};

/**
 * Server-side matchmaking. Players enqueue for a queue type; the matcher forms
 * a group and hands every member a shared lobby code (the first is host). The
 * formed lobby uses the normal lobby flow, so late-join, roles and the game
 * loop all work unchanged.
 *
 * `public`/`quick`/`ranked` use this queue. `private`/`invite` resolve to a code
 * on the client. `reconnect` is handled by rejoining a known code directly.
 */
class Matchmaker {
  constructor(opts = {}) {
    this.groupTarget = opts.groupTarget ?? 4;
    this.queues = new Map(); // qtype -> [ { ws, ticketId, persistentId, modeId } ]
  }

  send(ws, msg) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  enqueue(ws, qtype, modeId) {
    const ticketId = crypto.randomBytes(8).toString('hex');
    const q = this.queues.get(qtype) ?? [];
    q.push({ ws, ticketId, persistentId: ws.account || null, modeId: modeId || null });
    this.queues.set(qtype, q);
    ws.ticketId = ticketId;
    this.send(ws, { t: 'queued', ticketId, qtype });
    metrics.inc('matchmaking_enqueued');
    this.tryMatch(qtype);
    return ticketId;
  }

  tryMatch(qtype) {
    const q = this.queues.get(qtype);
    if (!q) return;
    while (q.length >= 2) {
      const group = q.splice(0, Math.min(this.groupTarget, q.length));
      const lobbyCode = newCode();
      group.forEach((e, i) => {
        this.send(e.ws, { t: 'matched', ticketId: e.ticketId, lobbyCode, host: i === 0 });
        e.ws.ticketId = null;
      });
      metrics.inc('matches_formed');
      log.info('match formed', { qtype, size: group.length, lobbyCode });
    }
  }

  dequeue(ticketId) {
    for (const [qtype, q] of this.queues) {
      const idx = q.findIndex((e) => e.ticketId === ticketId);
      if (idx >= 0) {
        q.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  remove(ws) {
    for (const q of this.queues.values()) {
      const idx = q.findIndex((e) => e.ws === ws);
      if (idx >= 0) q.splice(idx, 1);
    }
  }
}

module.exports = { Matchmaker };
