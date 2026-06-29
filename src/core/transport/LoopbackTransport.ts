import { Emitter } from '../events/emitter';
import { isNetMessage, type NetMessage, type PeerId } from '../events/protocol';
import { createId } from '../utils/id';
import type { ConnectOptions, Transport, TransportEvents, TransportState } from './types';

/**
 * In-process transport: multiple instances in the same JS runtime exchange
 * messages through a shared {@link LoopbackHub}. It carries the exact same
 * protocol as the networked transports, so the whole stack (lobby, sync, games)
 * can be exercised and unit-tested without a server. A configurable latency
 * lets tests simulate real conditions.
 */
interface Room {
  hostId: PeerId;
  peers: Map<PeerId, LoopbackTransport>;
}

class LoopbackHub {
  private rooms = new Map<string, Room>();

  join(t: LoopbackTransport, room: string, create: boolean): { selfId: PeerId; hostId: PeerId; peers: PeerId[] } {
    let r = this.rooms.get(room);
    if (!r) {
      if (!create) throw new Error(`Lobby "${room}" existiert nicht`);
      r = { hostId: t.selfId!, peers: new Map() };
      this.rooms.set(room, r);
    }
    const existing = [...r.peers.keys()];
    r.peers.set(t.selfId!, t);
    // Announce the newcomer to everyone already present.
    for (const peer of r.peers.values()) {
      if (peer !== t) peer.events.emit('peerJoin', { id: t.selfId! });
    }
    return { selfId: t.selfId!, hostId: r.hostId, peers: existing };
  }

  route(from: LoopbackTransport, room: string, msg: NetMessage): void {
    const r = this.rooms.get(room);
    if (!r) return;
    const deliver = (peer: LoopbackTransport) => {
      const latency = from.latencyMs;
      const payload: NetMessage = { ...msg, from: from.selfId! };
      if (latency > 0) setTimeout(() => peer.events.emit('message', payload), latency);
      else queueMicrotask(() => peer.events.emit('message', payload));
    };
    const to = msg.to ?? 'all';
    if (to === 'all') {
      for (const peer of r.peers.values()) if (peer !== from) deliver(peer);
    } else if (to === 'host') {
      const host = r.peers.get(r.hostId);
      if (host && host !== from) deliver(host);
    } else {
      const peer = r.peers.get(to);
      if (peer) deliver(peer);
    }
  }

  leave(t: LoopbackTransport, room: string): void {
    const r = this.rooms.get(room);
    if (!r) return;
    r.peers.delete(t.selfId!);
    for (const peer of r.peers.values()) peer.events.emit('peerLeave', { id: t.selfId! });
    if (r.peers.size === 0) {
      this.rooms.delete(room);
      return;
    }
    // Host migration: if the host left, promote the next peer.
    if (r.hostId === t.selfId) {
      const next = [...r.peers.keys()][0];
      r.hostId = next;
      for (const peer of r.peers.values()) peer.events.emit('host', { id: next });
    }
  }
}

/** Shared hub — module singleton so loopback peers find each other. */
const hub = new LoopbackHub();

export class LoopbackTransport implements Transport {
  readonly kind = 'loopback' as const;
  readonly events = new Emitter<TransportEvents>();
  state: TransportState = 'idle';
  selfId: PeerId | null = null;
  rttMs: number | null = null;
  latencyMs: number;
  private room = '';

  constructor(options?: { latencyMs?: number }) {
    this.latencyMs = options?.latencyMs ?? 0;
  }

  private setState(s: TransportState) {
    this.state = s;
    this.events.emit('state', s);
  }

  async connect(opts: ConnectOptions): Promise<void> {
    this.selfId = createId(10);
    this.room = opts.room;
    this.setState('connecting');
    const { hostId, peers } = hub.join(this, opts.room, !!opts.create);
    this.rttMs = this.latencyMs * 2;
    this.setState('connected');
    this.events.emit('open', { selfId: this.selfId, hostId, peers });
  }

  send(msg: NetMessage): void {
    if (!isNetMessage(msg) || this.state !== 'connected') return;
    hub.route(this, this.room, msg);
  }

  close(): void {
    if (this.state === 'closed') return;
    hub.leave(this, this.room);
    this.setState('closed');
    this.events.clear();
  }
}
