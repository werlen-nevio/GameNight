// src/core/events/emitter.ts
var Emitter = class {
  listeners = {};
  /** Subscribe. Returns an unsubscribe function. */
  on(type, fn) {
    (this.listeners[type] ??= /* @__PURE__ */ new Set()).add(fn);
    return () => this.off(type, fn);
  }
  /** Subscribe for a single emission. */
  once(type, fn) {
    const off = this.on(type, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }
  off(type, fn) {
    this.listeners[type]?.delete(fn);
  }
  emit(type, payload) {
    const set = this.listeners[type];
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.warn("[Emitter] listener error", err);
      }
    }
  }
  /** Remove all listeners (e.g. on teardown). */
  clear() {
    this.listeners = {};
  }
};

// src/core/design/tokens.ts
var palette = {
  // Night canvas — deep indigo/violet, the brand's "party at night" mood.
  night0: "#070417",
  night1: "#0B0720",
  night2: "#140B33",
  night3: "#1C1147",
  night4: "#271861",
  // Brand violet
  violet: "#9D5CFF",
  violetBright: "#B385FF",
  violetDeep: "#6C2BD9",
  // Accents
  magenta: "#FF4D8D",
  magentaDeep: "#D6246A",
  cyan: "#22E0D6",
  cyanDeep: "#0FB5AD",
  blue: "#3B82F6",
  lime: "#A8E63A",
  // Functional
  gold: "#FFD23F",
  goldDeep: "#E0A21B",
  green: "#2BD576",
  greenDeep: "#15A85A",
  red: "#FF5470",
  redDeep: "#D62b48",
  orange: "#FF8A3D",
  // Neutrals (warm-tinted to sit nicely on the violet canvas)
  white: "#FFFFFF",
  ink: "#0A0614",
  cloud: "#F4F1FF",
  fog: "#CFC7E6",
  mist: "#9A92B8",
  slate: "#6A6388",
  shadow: "#04020C"
};
var elevation = {
  none: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  sm: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  md: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  lg: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16
  }
};

// src/core/utils/id.ts
var ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}
function createId(size = 12) {
  let out = "";
  for (let i = 0; i < size; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

// src/core/events/protocol.ts
var PROTOCOL_VERSION = 1;
function message(channel, type, data, opts) {
  return {
    v: PROTOCOL_VERSION,
    channel,
    type,
    data,
    to: opts?.to,
    seq: opts?.seq,
    ts: opts?.ts ?? Date.now()
  };
}
function isNetMessage(value) {
  if (!value || typeof value !== "object") return false;
  const m = value;
  return m.v === PROTOCOL_VERSION && typeof m.channel === "string" && typeof m.type === "string";
}

// src/core/transport/adapters.ts
var LobbyTransportAdapter = class {
  constructor(transport) {
    this.transport = transport;
  }
  transport;
  get selfId() {
    return this.transport.selfId;
  }
  send(type, data, to = "all") {
    this.transport.send(message("lobby", type, data, { to }));
  }
  on(handler) {
    return this.transport.events.on("message", (msg) => {
      if (msg.channel !== "lobby" || !msg.from) return;
      handler(msg.type, msg.data, msg.from);
    });
  }
};

// src/core/lobby/LobbyController.ts
var SEAT_COLORS = [
  palette.violetBright,
  palette.cyan,
  palette.magenta,
  palette.gold,
  palette.green,
  palette.orange,
  palette.blue,
  palette.lime
];
var GRACE_MS = 12e4;
var LobbyController = class {
  constructor(net, identity, maxPlayers = 8) {
    this.net = net;
    this.identity = identity;
    this.maxPlayers = maxPlayers;
    this.lobby = new LobbyTransportAdapter(net);
  }
  net;
  identity;
  maxPlayers;
  events = new Emitter();
  lobby;
  members = /* @__PURE__ */ new Map();
  chat = [];
  /**
   * Explicit host pointer (set by the creator, or a manual transfer). Host
   * election is otherwise *computed* deterministically, so every client always
   * converges on the same host — even after an abrupt host disconnect.
   */
  hostOverride = null;
  status = "connecting";
  grace = /* @__PURE__ */ new Map();
  offs = [];
  code = "";
  prevAllReady = false;
  /**
   * The effective host's persistentId, computed identically on every client:
   * the explicit override if that member is connected, otherwise the connected
   * member with the smallest persistentId (a deterministic, convergent rule).
   */
  get effectiveHost() {
    const connected = [...this.members.values()].filter((m) => m.connected);
    if (this.hostOverride) {
      const o = this.members.get(this.hostOverride);
      if (o && o.connected) return this.hostOverride;
    }
    if (connected.length === 0) return null;
    return connected.map((m) => m.persistentId).sort()[0];
  }
  /** The host's *current* peer id (for authoritative routing). */
  get hostPeerId() {
    const host = this.effectiveHost;
    return host ? this.members.get(host)?.peerId ?? null : null;
  }
  get isHost() {
    return this.effectiveHost === this.identity.persistentId;
  }
  async connect(code, create) {
    this.code = code.toUpperCase();
    if (create) this.hostOverride = this.identity.persistentId;
    this.offs.push(
      this.net.events.on("open", () => this.onOpen()),
      this.net.events.on("peerLeave", ({ id }) => this.onPeerLeave(id)),
      this.net.events.on("reconnected", () => this.broadcastHello(false)),
      this.lobby.on((type, data, from) => this.onLobby(type, data, from))
    );
    await this.net.connect({ room: this.code, identity: this.identity, create });
  }
  onOpen() {
    this.status = "lobby";
    this.upsertSelf();
    this.broadcastHello(false);
    this.emitChange();
  }
  upsertSelf() {
    const existing = this.members.get(this.identity.persistentId);
    const member = {
      peerId: this.net.selfId ?? createId(),
      persistentId: this.identity.persistentId,
      name: this.identity.name,
      avatarEmoji: this.identity.avatarEmoji,
      color: this.identity.color ?? this.colorFor(this.members.size),
      platform: this.identity.platform,
      isHost: this.isHost,
      isYou: true,
      ready: existing?.ready ?? false,
      connected: true,
      rttMs: this.net.rttMs,
      joinedAt: existing?.joinedAt ?? Date.now()
    };
    this.members.set(member.persistentId, member);
  }
  colorFor(index) {
    return SEAT_COLORS[index % SEAT_COLORS.length];
  }
  helloPayload(reply) {
    const me = this.members.get(this.identity.persistentId);
    return {
      persistentId: this.identity.persistentId,
      name: this.identity.name,
      avatarEmoji: this.identity.avatarEmoji,
      color: me?.color ?? this.identity.color ?? this.colorFor(0),
      platform: this.identity.platform,
      ready: me?.ready ?? false,
      hostOverride: this.hostOverride,
      reply
    };
  }
  broadcastHello(reply) {
    if (this.members.get(this.identity.persistentId)) this.upsertSelf();
    this.lobby.send("hello", this.helloPayload(reply));
  }
  // ---- inbound lobby messages ---------------------------------------------
  onLobby(type, data, from) {
    switch (type) {
      case "hello":
        this.handleHello(data, from);
        break;
      case "ready":
        this.applyReady(data.persistentId, data.ready);
        break;
      case "kick":
        this.handleKick(data.persistentId);
        break;
      case "host":
        this.hostOverride = data.persistentId;
        this.emitChange();
        break;
      case "start":
        this.handleStart(data);
        break;
      case "chat":
        this.handleChat(data);
        break;
      case "emote":
        this.events.emit("emote", {
          persistentId: data.persistentId,
          emoteId: data.emoteId,
          at: data.at ?? Date.now()
        });
        break;
      case "leave":
        this.removeMember(data.persistentId);
        break;
    }
  }
  handleHello(data, from) {
    const existing = this.members.get(data.persistentId);
    const reclaim = !!existing && !existing.connected;
    const member = {
      peerId: from,
      persistentId: data.persistentId,
      name: data.name,
      avatarEmoji: data.avatarEmoji,
      color: data.color || existing?.color || this.colorFor(this.members.size),
      platform: data.platform,
      isHost: false,
      // derived in snapshot()
      isYou: data.persistentId === this.identity.persistentId,
      ready: data.ready ?? existing?.ready ?? false,
      connected: true,
      rttMs: existing?.rttMs ?? null,
      joinedAt: existing?.joinedAt ?? Date.now()
    };
    this.members.set(member.persistentId, member);
    if (reclaim) this.clearGrace(data.persistentId);
    if (data.hostOverride) this.hostOverride = data.hostOverride;
    if (!data.reply) this.broadcastHello(true);
    this.emitChange();
  }
  // ---- ready / kick / host / start ----------------------------------------
  setReady(ready) {
    const me = this.members.get(this.identity.persistentId);
    if (!me) return;
    me.ready = ready;
    this.lobby.send("ready", { persistentId: me.persistentId, ready });
    this.emitChange();
  }
  applyReady(persistentId, ready) {
    const m = this.members.get(persistentId);
    if (!m) return;
    m.ready = ready;
    this.emitChange();
  }
  kick(persistentId) {
    if (!this.isHost || persistentId === this.identity.persistentId) return;
    this.lobby.send("kick", { persistentId });
    this.removeMember(persistentId);
  }
  handleKick(persistentId) {
    if (persistentId === this.identity.persistentId) {
      this.events.emit("kicked", {});
      this.dispose();
      return;
    }
    this.removeMember(persistentId);
  }
  transferHost(persistentId) {
    if (!this.isHost || !this.members.has(persistentId)) return;
    this.hostOverride = persistentId;
    this.lobby.send("host", { persistentId });
    this.emitChange();
  }
  startGame(payload) {
    if (!this.isHost) return;
    this.status = "in_game";
    this.lobby.send("start", payload);
    this.events.emit("started", payload);
    this.emitChange();
  }
  handleStart(payload) {
    this.status = "in_game";
    this.events.emit("started", payload);
    this.emitChange();
  }
  /** Called when the match ends to bring everyone back to the lobby. */
  returnToLobby() {
    this.status = "lobby";
    const me = this.members.get(this.identity.persistentId);
    if (me) me.ready = false;
    if (me) this.lobby.send("ready", { persistentId: me.persistentId, ready: false });
    this.emitChange();
  }
  // ---- chat / emotes ------------------------------------------------------
  sendChat(text) {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    const msg = {
      id: createId(8),
      persistentId: this.identity.persistentId,
      name: this.identity.name,
      text: trimmed,
      at: Date.now()
    };
    this.handleChat(msg);
    this.lobby.send("chat", msg);
  }
  handleChat(msg) {
    this.chat = [...this.chat, msg].slice(-100);
    this.events.emit("chat", msg);
    this.emitChange();
  }
  sendEmote(emoteId) {
    const at = Date.now();
    this.events.emit("emote", { persistentId: this.identity.persistentId, emoteId, at });
    this.lobby.send("emote", { persistentId: this.identity.persistentId, emoteId, at });
  }
  // ---- presence / reconnection grace --------------------------------------
  onPeerLeave(peerId) {
    const member = [...this.members.values()].find((m) => m.peerId === peerId);
    if (!member || member.isYou) return;
    member.connected = false;
    this.emitChange();
    if (this.isHost && !this.grace.has(member.persistentId)) {
      this.grace.set(
        member.persistentId,
        setTimeout(() => {
          this.grace.delete(member.persistentId);
          this.lobby.send("leave", { persistentId: member.persistentId });
          this.removeMember(member.persistentId);
        }, GRACE_MS)
      );
    }
  }
  clearGrace(persistentId) {
    const t = this.grace.get(persistentId);
    if (t) {
      clearTimeout(t);
      this.grace.delete(persistentId);
    }
  }
  removeMember(persistentId) {
    if (persistentId === this.identity.persistentId) return;
    this.clearGrace(persistentId);
    if (this.members.delete(persistentId)) {
      if (this.hostOverride === persistentId) this.hostOverride = null;
      this.emitChange();
    }
  }
  // ---- snapshot -----------------------------------------------------------
  /** Updates measured RTTs from the transport (called periodically by the store). */
  pollRtt() {
    const me = this.members.get(this.identity.persistentId);
    if (me) me.rttMs = this.net.rttMs;
    this.emitChange();
  }
  snapshot() {
    const host = this.effectiveHost;
    const members = [...this.members.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((m) => ({ ...m, isHost: m.persistentId === host }));
    const connected = members.filter((m) => m.connected);
    const allReady = connected.length > 1 && connected.every((m) => m.ready);
    return {
      code: this.code,
      status: this.status,
      selfPersistentId: this.identity.persistentId,
      hostPersistentId: host,
      members,
      chat: this.chat,
      maxPlayers: this.maxPlayers,
      allReady
    };
  }
  emitChange() {
    const state = this.snapshot();
    this.events.emit("change", state);
    if (state.allReady && !this.prevAllReady) this.events.emit("allReady", {});
    this.prevAllReady = state.allReady;
  }
  leave() {
    this.lobby.send("leave", { persistentId: this.identity.persistentId });
    this.dispose();
  }
  dispose() {
    this.status = "closed";
    this.grace.forEach((t) => clearTimeout(t));
    this.grace.clear();
    this.offs.forEach((off) => off());
    this.offs = [];
    this.net.close();
  }
};

// src/core/transport/LoopbackTransport.ts
var LoopbackHub = class {
  rooms = /* @__PURE__ */ new Map();
  join(t, room, create) {
    let r = this.rooms.get(room);
    if (!r) {
      if (!create) throw new Error(`Lobby "${room}" existiert nicht`);
      r = { hostId: t.selfId, peers: /* @__PURE__ */ new Map() };
      this.rooms.set(room, r);
    }
    const existing = [...r.peers.keys()];
    r.peers.set(t.selfId, t);
    for (const peer of r.peers.values()) {
      if (peer !== t) peer.events.emit("peerJoin", { id: t.selfId });
    }
    return { selfId: t.selfId, hostId: r.hostId, peers: existing };
  }
  route(from, room, msg) {
    const r = this.rooms.get(room);
    if (!r) return;
    const deliver = (peer) => {
      const latency = from.latencyMs;
      const payload = { ...msg, from: from.selfId };
      if (latency > 0) setTimeout(() => peer.events.emit("message", payload), latency);
      else queueMicrotask(() => peer.events.emit("message", payload));
    };
    const to = msg.to ?? "all";
    if (to === "all") {
      for (const peer of r.peers.values()) if (peer !== from) deliver(peer);
    } else if (to === "host") {
      const host = r.peers.get(r.hostId);
      if (host && host !== from) deliver(host);
    } else {
      const peer = r.peers.get(to);
      if (peer) deliver(peer);
    }
  }
  leave(t, room) {
    const r = this.rooms.get(room);
    if (!r) return;
    r.peers.delete(t.selfId);
    for (const peer of r.peers.values()) peer.events.emit("peerLeave", { id: t.selfId });
    if (r.peers.size === 0) {
      this.rooms.delete(room);
      return;
    }
    if (r.hostId === t.selfId) {
      const next = [...r.peers.keys()][0];
      r.hostId = next;
      for (const peer of r.peers.values()) peer.events.emit("host", { id: next });
    }
  }
};
var hub = new LoopbackHub();
var LoopbackTransport = class {
  kind = "loopback";
  events = new Emitter();
  state = "idle";
  selfId = null;
  rttMs = null;
  latencyMs;
  room = "";
  constructor(options) {
    this.latencyMs = options?.latencyMs ?? 0;
  }
  setState(s) {
    this.state = s;
    this.events.emit("state", s);
  }
  async connect(opts) {
    this.selfId = createId(10);
    this.room = opts.room;
    this.setState("connecting");
    const { hostId, peers } = hub.join(this, opts.room, !!opts.create);
    this.rttMs = this.latencyMs * 2;
    this.setState("connected");
    this.events.emit("open", { selfId: this.selfId, hostId, peers });
  }
  send(msg) {
    if (!isNetMessage(msg) || this.state !== "connected") return;
    hub.route(this, this.room, msg);
  }
  close() {
    if (this.state === "closed") return;
    hub.leave(this, this.room);
    this.setState("closed");
    this.events.clear();
  }
};

// scratchpad/lobby-test.ts
var pass = 0;
var fail = 0;
var ok = (c, m) => c ? (pass++, console.log("  \u2713", m)) : (fail++, console.log("  \u2717", m));
var tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
function make(pid, name) {
  const net = new LoopbackTransport();
  const ctrl = new LobbyController(net, {
    name,
    avatarEmoji: "\u{1F642}",
    platform: "web",
    persistentId: pid
  });
  return { net, ctrl };
}
async function run() {
  console.log("Join + deterministic host (creator)");
  const a = make("AAA", "Alice");
  await a.ctrl.connect("ROOM", true);
  const b = make("BBB", "Bob");
  await b.ctrl.connect("ROOM", false);
  const c = make("CCC", "Cara");
  await c.ctrl.connect("ROOM", false);
  await tick(40);
  const hostOf = (x) => x.ctrl.snapshot().hostPersistentId;
  ok(hostOf(a) === "AAA" && hostOf(b) === "AAA" && hostOf(c) === "AAA", "all agree host = creator AAA");
  ok(a.ctrl.isHost && !b.ctrl.isHost && !c.ctrl.isHost, "only creator is host");
  ok(a.ctrl.snapshot().members.length === 3, "all three members present");
  console.log("Ready propagation");
  b.ctrl.setReady(true);
  await tick(30);
  const bOnA = a.ctrl.snapshot().members.find((m) => m.persistentId === "BBB");
  ok(bOnA?.ready === true, "Bob's ready is seen by host");
  console.log("Manual host transfer");
  a.ctrl.transferHost("CCC");
  await tick(30);
  ok(hostOf(a) === "CCC" && hostOf(b) === "CCC" && hostOf(c) === "CCC", "all agree host transferred to CCC");
  ok(c.ctrl.isHost && !a.ctrl.isHost, "CCC is now host");
  console.log("Abrupt host (CCC) disconnect \u2192 convergent migration, no softlock");
  c.net.close();
  await tick(40);
  const ha = hostOf(a), hb = hostOf(b);
  ok(ha === hb, "A and B converge on the same new host");
  ok(ha === "AAA", "fallback host is smallest connected id (AAA)");
  ok(a.ctrl.isHost && !b.ctrl.isHost, "exactly one new host (A)");
  ok(a.ctrl.hostPeerId === a.net.selfId, "new host peerId resolves to A");
  console.log("Graceful leave removes slot");
  b.ctrl.leave();
  await tick(40);
  ok(a.ctrl.snapshot().members.find((m) => m.persistentId === "BBB") === void 0, "Bob removed after leave");
  console.log(`
RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
