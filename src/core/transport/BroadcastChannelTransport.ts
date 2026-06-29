import { Emitter } from '../events/emitter';
import { isNetMessage, type NetMessage, type PeerId } from '../events/protocol';
import { createId } from '../utils/id';
import type { ConnectOptions, Transport, TransportEvents, TransportState } from './types';

const DISCOVERY_MS = 350;
const HEARTBEAT_MS = 2000;
const TIMEOUT_MS = 6000;

type Presence =
  | { t: 'hello'; from: PeerId; reply: boolean }
  | { t: 'bye'; from: PeerId }
  | { t: 'msg'; from: PeerId; msg: NetMessage };

/**
 * Server-less transport for the desktop browser: peers in different tabs of the
 * same origin discover each other over a `BroadcastChannel`, elect a host
 * deterministically (smallest id) and relay messages locally. Perfect for
 * testing cross-client play on web with zero infrastructure. Web-only —
 * the factory falls back to loopback on native.
 */
export class BroadcastChannelTransport implements Transport {
  readonly kind = 'broadcast' as const;
  readonly events = new Emitter<TransportEvents>();
  state: TransportState = 'idle';
  selfId: PeerId | null = null;
  rttMs: number | null = 0;

  private channel: BroadcastChannel | null = null;
  private peers = new Map<PeerId, number>();
  private hostId: PeerId | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  static get supported(): boolean {
    return typeof globalThis !== 'undefined' && typeof (globalThis as any).BroadcastChannel === 'function';
  }

  private setState(s: TransportState) {
    this.state = s;
    this.events.emit('state', s);
  }

  private post(msg: Presence) {
    this.channel?.postMessage(msg);
  }

  private electHost(): PeerId {
    const ids = [this.selfId!, ...this.peers.keys()].sort();
    return ids[0];
  }

  private updateHost() {
    const next = this.electHost();
    if (next !== this.hostId) {
      this.hostId = next;
      this.events.emit('host', { id: next });
    }
  }

  private room = '';

  connect(opts: ConnectOptions): Promise<void> {
    if (!BroadcastChannelTransport.supported) {
      return Promise.reject(new Error('BroadcastChannel wird hier nicht unterstützt'));
    }
    this.selfId = createId(10);
    this.room = opts.room;
    this.setState('connecting');
    this.channel = new BroadcastChannel(`gamenight:${opts.room}`);
    this.channel.onmessage = (ev: MessageEvent) => this.onMessage(ev.data as Presence);

    this.post({ t: 'hello', from: this.selfId, reply: false });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.hostId = this.electHost();
        this.setState('connected');
        this.startHeartbeat();
        this.events.emit('open', { selfId: this.selfId!, hostId: this.hostId, peers: [...this.peers.keys()], code: this.room });
        resolve();
      }, DISCOVERY_MS);
    });
  }

  private onMessage(msg: Presence) {
    if (!msg || msg.from === this.selfId) return;
    switch (msg.t) {
      case 'hello': {
        const isNew = !this.peers.has(msg.from);
        this.peers.set(msg.from, Date.now());
        if (isNew) {
          if (!msg.reply) this.post({ t: 'hello', from: this.selfId!, reply: true });
          if (this.state === 'connected') {
            this.events.emit('peerJoin', { id: msg.from });
            this.updateHost();
          }
        }
        break;
      }
      case 'bye':
        if (this.peers.delete(msg.from)) {
          this.events.emit('peerLeave', { id: msg.from });
          this.updateHost();
        }
        break;
      case 'msg': {
        if (!isNetMessage(msg.msg)) return;
        const to = msg.msg.to ?? 'all';
        if (to === 'all' || (to === 'host' && this.hostId === this.selfId) || to === this.selfId) {
          this.events.emit('message', { ...msg.msg, from: msg.from });
        }
        break;
      }
    }
  }

  private startHeartbeat() {
    this.heartbeat = setInterval(() => {
      this.post({ t: 'hello', from: this.selfId!, reply: true });
      const now = Date.now();
      for (const [id, seen] of [...this.peers]) {
        if (now - seen > TIMEOUT_MS) {
          this.peers.delete(id);
          this.events.emit('peerLeave', { id });
          this.updateHost();
        }
      }
    }, HEARTBEAT_MS);
  }

  send(msg: NetMessage): void {
    if (this.state !== 'connected') return;
    this.post({ t: 'msg', from: this.selfId!, msg });
  }

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.post({ t: 'bye', from: this.selfId! });
    this.setState('closed');
    this.channel?.close();
    this.channel = null;
    this.events.clear();
  }
}
