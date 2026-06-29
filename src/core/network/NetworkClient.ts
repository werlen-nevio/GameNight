import { Emitter } from '../events/emitter';
import type { NetMessage, PeerId } from '../events/protocol';
import { createTransport, resolveUrl, type TransportConfig } from '../transport/factory';
import type {
  ConnectOptions,
  Transport,
  TransportEvents,
  TransportKind,
  TransportState,
} from '../transport/types';

const RECONNECT_WINDOW_MS = 120_000; // keep trying for 2 minutes
const BACKOFF = [1000, 2000, 4000, 8000, 16000];

/** Extra lifecycle signals the client adds on top of raw transport events. */
export interface NetworkClientEvents extends TransportEvents {
  reconnecting: { attempt: number };
  reconnected: { selfId: PeerId };
  gaveup: Record<string, never>;
}

/**
 * A resilient {@link Transport} decorator. It owns the concrete transport,
 * re-emits its events through a *stable* emitter, and transparently re-dials
 * with exponential backoff if the connection drops — for up to two minutes —
 * so the lobby and game layers above never re-wire on a reconnect.
 */
export class NetworkClient implements Transport {
  readonly events = new Emitter<NetworkClientEvents>();
  private inner: Transport;
  private opts: ConnectOptions | null = null;
  private manualClose = false;
  private reconnecting = false;
  private offs: Array<() => void> = [];

  constructor(private config?: TransportConfig) {
    this.inner = createTransport(config);
  }

  get kind(): TransportKind {
    return this.inner.kind;
  }
  get state(): TransportState {
    return this.inner.state;
  }
  get selfId(): PeerId | null {
    return this.inner.selfId;
  }
  get rttMs(): number | null {
    return this.inner.rttMs;
  }

  private wire(transport: Transport) {
    this.offs.forEach((off) => off());
    this.offs = [
      transport.events.on('open', (p) => this.events.emit('open', p)),
      transport.events.on('message', (m) => this.events.emit('message', m)),
      transport.events.on('peerJoin', (p) => this.events.emit('peerJoin', p)),
      transport.events.on('peerLeave', (p) => this.events.emit('peerLeave', p)),
      transport.events.on('host', (p) => this.events.emit('host', p)),
      transport.events.on('error', (p) => this.events.emit('error', p)),
      transport.events.on('state', (s) => {
        this.events.emit('state', s);
        if (s === 'closed' && !this.manualClose && !this.reconnecting) void this.reconnect();
      }),
    ];
  }

  async connect(opts: ConnectOptions): Promise<void> {
    this.opts = { ...opts, url: resolveUrl({ ...this.config, url: opts.url }) };
    this.manualClose = false;
    this.wire(this.inner);
    await this.inner.connect(this.opts);
  }

  private async reconnect(): Promise<void> {
    if (!this.opts || this.manualClose) return;
    this.reconnecting = true;
    const deadline = Date.now() + RECONNECT_WINDOW_MS;
    let attempt = 0;

    while (Date.now() < deadline && !this.manualClose) {
      attempt += 1;
      this.events.emit('reconnecting', { attempt });
      this.events.emit('state', 'reconnecting');
      await delay(BACKOFF[Math.min(attempt - 1, BACKOFF.length - 1)]);
      if (this.manualClose) break;

      const next = createTransport(this.config);
      this.inner = next;
      this.wire(next);
      try {
        // Rejoin the existing room (never re-create it on reconnect).
        await next.connect({ ...this.opts, create: false });
        this.reconnecting = false;
        this.events.emit('reconnected', { selfId: next.selfId! });
        return;
      } catch {
        // Try again after the next backoff step.
      }
    }

    this.reconnecting = false;
    if (!this.manualClose) {
      this.events.emit('gaveup', {});
      this.events.emit('state', 'closed');
    }
  }

  send(msg: NetMessage): void {
    this.inner.send(msg);
  }

  close(): void {
    this.manualClose = true;
    this.offs.forEach((off) => off());
    this.offs = [];
    this.inner.close();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
