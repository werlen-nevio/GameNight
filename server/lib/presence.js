'use strict';

const metrics = require('./metrics');

/**
 * Presence + invite routing keyed by stable persistentId. A player's account
 * connection registers here; friends "watch" ids and receive live state
 * updates; invites are forwarded to a target's online connections.
 */
class Presence {
  constructor() {
    this.byId = new Map(); // persistentId -> { state, lobbyCode, conns:Set<ws> }
    this.watchers = new Map(); // ws -> Set<persistentId>
  }

  send(ws, msg) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  online(ws, persistentId, name) {
    ws.account = persistentId;
    ws.displayName = name;
    let e = this.byId.get(persistentId);
    if (!e) {
      e = { state: 'online', lobbyCode: null, conns: new Set(), name };
      this.byId.set(persistentId, e);
    }
    e.conns.add(ws);
    e.state = e.lobbyCode ? 'in_lobby' : 'online';
    if (name) e.name = name;
    metrics.setGauge('presence_online', this.byId.size);
    this.notify(persistentId);
  }

  setState(persistentId, state, lobbyCode) {
    const e = this.byId.get(persistentId);
    if (!e) return;
    e.state = state;
    e.lobbyCode = lobbyCode ?? null;
    this.notify(persistentId);
  }

  offline(ws) {
    const id = ws.account;
    this.watchers.delete(ws);
    if (!id) return;
    const e = this.byId.get(id);
    if (!e) return;
    e.conns.delete(ws);
    if (e.conns.size === 0) {
      this.byId.delete(id);
      e.state = 'offline';
    }
    metrics.setGauge('presence_online', this.byId.size);
    this.notify(id, e);
  }

  watch(ws, ids) {
    this.watchers.set(ws, new Set(ids));
    // Immediately report current state of watched ids.
    for (const id of ids) {
      const e = this.byId.get(id);
      this.send(ws, { t: 'presence', id, state: e ? e.state : 'offline', lobbyCode: e?.lobbyCode ?? null });
    }
  }

  notify(persistentId, removed) {
    const e = removed ?? this.byId.get(persistentId);
    const update = {
      t: 'presence',
      id: persistentId,
      state: e ? e.state : 'offline',
      lobbyCode: e?.lobbyCode ?? null,
    };
    for (const [ws, ids] of this.watchers) if (ids.has(persistentId)) this.send(ws, update);
  }

  invite(fromId, toId, lobbyCode, fromName) {
    const target = this.byId.get(toId);
    if (!target) return false;
    for (const ws of target.conns) this.send(ws, { t: 'invited', from: fromId, name: fromName, lobbyCode });
    metrics.inc('invites_sent');
    return true;
  }
}

module.exports = { Presence };
