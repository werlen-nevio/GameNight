import { Emitter } from '../events/emitter';
import { isNetMessage, type NetMessage, type PeerId } from '../events/protocol';
import type { RelayClientMessage, RelayServerMessage } from './relayProtocol';
import type { ConnectOptions, Transport, TransportEvents, TransportState } from './types';

const PING_INTERVAL_MS = 3000;

/**
 * Real networked transport over a WebSocket relay. Works in the browser and on
 * native (both expose a global `WebSocket`). It only needs a relay URL — a
 * reference server lives in `server/relay.js`. Reconnection is driven by the
 * {@link NetworkClient}; this class focuses on one connection's lifecycle and
 * round-trip measurement.
 */
export class WebSocketRelayTransport implements Transport {
  readonly kind = 'websocket' as const;
  readonly events = new Emitter<TransportEvents>();
  state: TransportState = 'idle';
  selfId: PeerId | null = null;
  rttMs: number | null = null;

  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private opts: ConnectOptions | null = null;

  private setState(s: TransportState) {
    this.state = s;
    this.events.emit('state', s);
  }

  private sendRaw(msg: RelayClientMessage) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  connect(opts: ConnectOptions): Promise<void> {
    this.opts = opts;
    const url = opts.url;
    if (!url) return Promise.reject(new Error('WebSocketRelayTransport benötigt eine relay-URL'));

    this.setState('connecting');
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        this.setState('error');
        reject(err as Error);
        return;
      }
      this.ws = ws;

      ws.onopen = () => {
        this.sendRaw({ t: 'hello', room: opts.room, create: !!opts.create, password: opts.password, privacy: opts.privacy });
      };

      ws.onmessage = (ev: MessageEvent) => {
        let parsed: RelayServerMessage;
        try {
          parsed = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as RelayServerMessage;
        } catch {
          return;
        }
        this.handle(parsed, () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, (err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
      };

      ws.onerror = () => {
        const error = new Error('WebSocket-Fehler');
        this.events.emit('error', { error });
        if (!settled) {
          settled = true;
          this.setState('error');
          reject(error);
        }
      };

      ws.onclose = () => {
        this.stopPing();
        if (this.state !== 'closed') this.setState('closed');
      };
    });
  }

  private handle(msg: RelayServerMessage, onReady: () => void, onError: (e: Error) => void) {
    switch (msg.t) {
      case 'welcome':
        this.selfId = msg.selfId;
        this.setState('connected');
        this.startPing();
        this.events.emit('open', { selfId: msg.selfId, hostId: msg.hostId, peers: msg.peers });
        onReady();
        break;
      case 'error':
        this.setState('error');
        onError(new Error(msg.reason));
        break;
      case 'join':
        this.events.emit('peerJoin', { id: msg.id });
        break;
      case 'leave':
        this.events.emit('peerLeave', { id: msg.id });
        break;
      case 'host':
        this.events.emit('host', { id: msg.id });
        break;
      case 'msg':
        if (isNetMessage(msg.msg)) this.events.emit('message', { ...msg.msg, from: msg.from });
        break;
      case 'pong':
        this.rttMs = Date.now() - msg.ts;
        break;
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.sendRaw({ t: 'ping', ts: Date.now() }), PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  send(msg: NetMessage): void {
    if (this.state !== 'connected') return;
    this.sendRaw({ t: 'relay', to: msg.to ?? 'all', msg });
  }

  close(): void {
    this.stopPing();
    this.sendRaw({ t: 'bye' });
    this.setState('closed');
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.events.clear();
  }
}
