import { Emitter } from '../events/emitter';
import type { PeerId } from '../events/protocol';
import { palette } from '../design/tokens';
import { createId } from '../utils/id';
import { LobbyTransportAdapter } from '../transport/adapters';
import type { PeerIdentity } from '../transport/types';
import type { NetworkClient } from '../network/NetworkClient';
import type {
  ChatMessage,
  LobbyControllerEvents,
  LobbyMember,
  LobbyState,
  LobbyStatus,
  StartPayload,
} from './types';

const SEAT_COLORS = [
  palette.violetBright,
  palette.cyan,
  palette.magenta,
  palette.gold,
  palette.green,
  palette.orange,
  palette.blue,
  palette.lime,
];

const GRACE_MS = 120_000; // keep a disconnected member's slot for 2 minutes

interface HelloData {
  persistentId: string;
  name: string;
  avatarEmoji: string;
  color: string;
  platform: PeerIdentity['platform'];
  ready: boolean;
  /** The shared, explicit host pointer (creator or last manual transfer). */
  hostOverride: string | null;
  reply: boolean;
}

/**
 * Application-level lobby logic over a {@link NetworkClient}. Owns presence,
 * the ready system, host authority + transfer, kick, chat/emotes and a
 * host-authoritative 2-minute reconnection grace. Members are keyed by a stable
 * `persistentId` so a reconnecting player (new transport id) reclaims their slot.
 */
export class LobbyController {
  readonly events = new Emitter<LobbyControllerEvents>();
  private lobby: LobbyTransportAdapter;
  private members = new Map<string, LobbyMember>();
  private chat: ChatMessage[] = [];
  /**
   * Explicit host pointer (set by the creator, or a manual transfer). Host
   * election is otherwise *computed* deterministically, so every client always
   * converges on the same host — even after an abrupt host disconnect.
   */
  private hostOverride: string | null = null;
  private status: LobbyStatus = 'connecting';
  private grace = new Map<string, ReturnType<typeof setTimeout>>();
  private offs: Array<() => void> = [];
  private code = '';
  private prevAllReady = false;

  constructor(
    private net: NetworkClient,
    private identity: PeerIdentity,
    private maxPlayers = 8,
  ) {
    this.lobby = new LobbyTransportAdapter(net);
  }

  /**
   * The effective host's persistentId, computed identically on every client:
   * the explicit override if that member is connected, otherwise the connected
   * member with the smallest persistentId (a deterministic, convergent rule).
   */
  private get effectiveHost(): string | null {
    const connected = [...this.members.values()].filter((m) => m.connected);
    if (this.hostOverride) {
      const o = this.members.get(this.hostOverride);
      if (o && o.connected) return this.hostOverride;
    }
    if (connected.length === 0) return null;
    return connected.map((m) => m.persistentId).sort()[0];
  }

  /** The host's *current* peer id (for authoritative routing). */
  get hostPeerId(): PeerId | null {
    const host = this.effectiveHost;
    return host ? this.members.get(host)?.peerId ?? null : null;
  }

  get isHost(): boolean {
    return this.effectiveHost === this.identity.persistentId;
  }

  async connect(code: string, create: boolean): Promise<void> {
    this.code = code.toUpperCase();
    if (create) this.hostOverride = this.identity.persistentId;
    this.offs.push(
      this.net.events.on('open', () => this.onOpen()),
      this.net.events.on('peerLeave', ({ id }) => this.onPeerLeave(id)),
      this.net.events.on('reconnected', () => this.broadcastHello(false)),
      this.lobby.on((type, data, from) => this.onLobby(type, data as Record<string, unknown>, from)),
    );
    await this.net.connect({ room: this.code, identity: this.identity, create });
  }

  private onOpen(): void {
    this.status = 'lobby';
    this.upsertSelf();
    this.broadcastHello(false);
    this.emitChange();
  }

  private upsertSelf(): void {
    const existing = this.members.get(this.identity.persistentId);
    const member: LobbyMember = {
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
      joinedAt: existing?.joinedAt ?? Date.now(),
    };
    this.members.set(member.persistentId, member);
  }

  private colorFor(index: number): string {
    return SEAT_COLORS[index % SEAT_COLORS.length];
  }

  private helloPayload(reply: boolean): HelloData {
    const me = this.members.get(this.identity.persistentId);
    return {
      persistentId: this.identity.persistentId,
      name: this.identity.name,
      avatarEmoji: this.identity.avatarEmoji,
      color: me?.color ?? this.identity.color ?? this.colorFor(0),
      platform: this.identity.platform,
      ready: me?.ready ?? false,
      hostOverride: this.hostOverride,
      reply,
    };
  }

  private broadcastHello(reply: boolean): void {
    if (this.members.get(this.identity.persistentId)) this.upsertSelf();
    this.lobby.send('hello', this.helloPayload(reply));
  }

  // ---- inbound lobby messages ---------------------------------------------

  private onLobby(type: string, data: Record<string, unknown>, from: PeerId): void {
    switch (type) {
      case 'hello':
        this.handleHello(data as unknown as HelloData, from);
        break;
      case 'ready':
        this.applyReady(data.persistentId as string, data.ready as boolean);
        break;
      case 'kick':
        this.handleKick(data.persistentId as string);
        break;
      case 'host':
        this.hostOverride = data.persistentId as string;
        this.emitChange();
        break;
      case 'start':
        this.handleStart(data as unknown as StartPayload);
        break;
      case 'chat':
        this.handleChat(data as unknown as ChatMessage);
        break;
      case 'emote':
        this.events.emit('emote', {
          persistentId: data.persistentId as string,
          emoteId: data.emoteId as string,
          at: (data.at as number) ?? Date.now(),
        });
        break;
      case 'leave':
        this.removeMember(data.persistentId as string);
        break;
    }
  }

  private handleHello(data: HelloData, from: PeerId): void {
    const existing = this.members.get(data.persistentId);
    const reclaim = !!existing && !existing.connected;
    const member: LobbyMember = {
      peerId: from,
      persistentId: data.persistentId,
      name: data.name,
      avatarEmoji: data.avatarEmoji,
      color: data.color || existing?.color || this.colorFor(this.members.size),
      platform: data.platform,
      isHost: false, // derived in snapshot()
      isYou: data.persistentId === this.identity.persistentId,
      ready: data.ready ?? existing?.ready ?? false,
      connected: true,
      rttMs: existing?.rttMs ?? null,
      joinedAt: existing?.joinedAt ?? Date.now(),
    };
    this.members.set(member.persistentId, member);

    if (reclaim) this.clearGrace(data.persistentId);
    if (data.hostOverride) this.hostOverride = data.hostOverride;
    // Tell the newcomer who we are (one round only).
    if (!data.reply) this.broadcastHello(true);
    this.emitChange();
  }

  // ---- ready / kick / host / start ----------------------------------------

  setReady(ready: boolean): void {
    const me = this.members.get(this.identity.persistentId);
    if (!me) return;
    me.ready = ready;
    this.lobby.send('ready', { persistentId: me.persistentId, ready });
    this.emitChange();
  }

  private applyReady(persistentId: string, ready: boolean): void {
    const m = this.members.get(persistentId);
    if (!m) return;
    m.ready = ready;
    this.emitChange();
  }

  kick(persistentId: string): void {
    if (!this.isHost || persistentId === this.identity.persistentId) return;
    this.lobby.send('kick', { persistentId });
    this.removeMember(persistentId);
  }

  private handleKick(persistentId: string): void {
    if (persistentId === this.identity.persistentId) {
      this.events.emit('kicked', {});
      this.dispose();
      return;
    }
    this.removeMember(persistentId);
  }

  transferHost(persistentId: string): void {
    if (!this.isHost || !this.members.has(persistentId)) return;
    this.hostOverride = persistentId;
    this.lobby.send('host', { persistentId });
    this.emitChange();
  }

  startGame(payload: StartPayload): void {
    if (!this.isHost) return;
    this.status = 'in_game';
    this.lobby.send('start', payload);
    this.events.emit('started', payload);
    this.emitChange();
  }

  private handleStart(payload: StartPayload): void {
    this.status = 'in_game';
    this.events.emit('started', payload);
    this.emitChange();
  }

  /** Called when the match ends to bring everyone back to the lobby. */
  returnToLobby(): void {
    this.status = 'lobby';
    const me = this.members.get(this.identity.persistentId);
    if (me) me.ready = false;
    if (me) this.lobby.send('ready', { persistentId: me.persistentId, ready: false });
    this.emitChange();
  }

  // ---- chat / emotes ------------------------------------------------------

  sendChat(text: string): void {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    const msg: ChatMessage = {
      id: createId(8),
      persistentId: this.identity.persistentId,
      name: this.identity.name,
      text: trimmed,
      at: Date.now(),
    };
    this.handleChat(msg);
    this.lobby.send('chat', msg);
  }

  private handleChat(msg: ChatMessage): void {
    this.chat = [...this.chat, msg].slice(-100);
    this.events.emit('chat', msg);
    this.emitChange();
  }

  sendEmote(emoteId: string): void {
    const at = Date.now();
    this.events.emit('emote', { persistentId: this.identity.persistentId, emoteId, at });
    this.lobby.send('emote', { persistentId: this.identity.persistentId, emoteId, at });
  }

  // ---- presence / reconnection grace --------------------------------------

  private onPeerLeave(peerId: PeerId): void {
    const member = [...this.members.values()].find((m) => m.peerId === peerId);
    if (!member || member.isYou) return;
    member.connected = false;
    this.emitChange();
    // The host authoritatively removes the slot once the grace window lapses.
    if (this.isHost && !this.grace.has(member.persistentId)) {
      this.grace.set(
        member.persistentId,
        setTimeout(() => {
          this.grace.delete(member.persistentId);
          this.lobby.send('leave', { persistentId: member.persistentId });
          this.removeMember(member.persistentId);
        }, GRACE_MS),
      );
    }
  }

  private clearGrace(persistentId: string): void {
    const t = this.grace.get(persistentId);
    if (t) {
      clearTimeout(t);
      this.grace.delete(persistentId);
    }
  }

  private removeMember(persistentId: string): void {
    if (persistentId === this.identity.persistentId) return;
    this.clearGrace(persistentId);
    if (this.members.delete(persistentId)) {
      // Drop a stale override; the computed fallback then elects the new host.
      if (this.hostOverride === persistentId) this.hostOverride = null;
      this.emitChange();
    }
  }

  // ---- snapshot -----------------------------------------------------------

  /** Updates measured RTTs from the transport (called periodically by the store). */
  pollRtt(): void {
    const me = this.members.get(this.identity.persistentId);
    if (me) me.rttMs = this.net.rttMs;
    this.emitChange();
  }

  snapshot(): LobbyState {
    const host = this.effectiveHost;
    const members = [...this.members.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((m) => ({ ...m, isHost: m.persistentId === host }));
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
      allReady,
    };
  }

  private emitChange(): void {
    const state = this.snapshot();
    this.events.emit('change', state);
    if (state.allReady && !this.prevAllReady) this.events.emit('allReady', {});
    this.prevAllReady = state.allReady;
  }

  leave(): void {
    this.lobby.send('leave', { persistentId: this.identity.persistentId });
    this.dispose();
  }

  dispose(): void {
    this.status = 'closed';
    this.grace.forEach((t) => clearTimeout(t));
    this.grace.clear();
    this.offs.forEach((off) => off());
    this.offs = [];
    this.net.close();
  }
}
