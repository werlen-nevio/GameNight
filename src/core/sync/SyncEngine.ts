import { gameEvent, type GameEvent } from '../events/gameEvents';
import { message, type NetMessage, type PeerId } from '../events/protocol';
import { Rng } from '../utils/random';
import type { NetworkClient } from '../network/NetworkClient';
import { NetClock } from './NetClock';

const CLOCK_SAMPLES = 5;
const CLOCK_INTERVAL_MS = 4000;

/**
 * Host-authoritative synchronization.
 *
 * - **Authority:** the host is the serialization point. Clients send their game
 *   events to the host; the host stamps and re-broadcasts them to everyone, so
 *   every device processes one identical, ordered event stream.
 * - **Determinism:** a single seed (broadcast at match start) drives a shared
 *   {@link Rng} on all peers — identical questions, order and random outcomes.
 * - **Time:** a {@link NetClock} keeps timers aligned across devices.
 *
 * Game modules never see any of this; they use the higher-level OnlineSession.
 */
export class SyncEngine {
  readonly clock: NetClock;
  private handlers = new Set<(event: GameEvent, from: PeerId | 'host') => void>();
  private seedHandlers = new Set<(seed: string) => void>();
  private offs: Array<() => void> = [];
  private _rng: Rng | null = null;
  private seed: string | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private net: NetworkClient,
    private getHostId: () => PeerId | null,
  ) {
    this.clock = new NetClock(() => this.isHost);
  }

  get isHost(): boolean {
    return !!this.net.selfId && this.net.selfId === this.getHostId();
  }

  /** The shared seeded RNG (available after the match seed is set). */
  get rng(): Rng {
    if (!this._rng) this._rng = new Rng(this.seed ?? 'pending');
    return this._rng;
  }

  /** Begin listening; starts the client clock handshake. */
  start(): void {
    this.offs.push(
      this.net.events.on('message', (m) => this.onMessage(m)),
    );
    if (!this.isHost) this.startClockSync();
  }

  /** Host: pick + broadcast the match seed so everyone shares an RNG. */
  beginMatch(seed: string): void {
    this.seed = seed;
    this._rng = new Rng(seed);
    if (this.isHost) this.net.send(message('sync', 'seed', { seed }, { to: 'all' }));
  }

  onMatchSeed(handler: (seed: string) => void): () => void {
    this.seedHandlers.add(handler);
    if (this.seed) handler(this.seed);
    return () => this.seedHandlers.delete(handler);
  }

  /** Emit a game event — routed authoritatively by role. */
  emit(type: GameEvent['type'], data: unknown): void {
    const self = (this.net.selfId ?? 'system') as PeerId;
    const event = gameEvent(type, this.isHost ? 'host' : self, data, this.clock.now());
    if (this.isHost) this.authoritativeBroadcast(event);
    else this.net.send(message('game', type, event, { to: this.getHostId() ?? 'host' }));
  }

  /** Observe the ordered, authoritative game-event stream. */
  on(handler: (event: GameEvent, from: PeerId | 'host') => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private authoritativeBroadcast(event: GameEvent): void {
    this.net.send(message('game', event.type, event, { to: 'all' }));
    this.deliver(event, 'host'); // host processes its own broadcast locally
  }

  private deliver(event: GameEvent, from: PeerId | 'host'): void {
    for (const h of [...this.handlers]) h(event, from);
  }

  private onMessage(m: NetMessage): void {
    if (m.channel === 'game' && m.from) {
      const event = m.data as GameEvent;
      if (this.isHost) {
        // A client event reached the host: re-stamp + re-broadcast authoritatively.
        this.authoritativeBroadcast({ ...event, by: m.from });
      } else {
        this.deliver(event, m.from);
      }
      return;
    }
    if (m.channel === 'sync') {
      this.onSync(m);
    }
  }

  private onSync(m: NetMessage): void {
    switch (m.type) {
      case 'seed': {
        const { seed } = m.data as { seed: string };
        this.seed = seed;
        this._rng = new Rng(seed);
        for (const h of [...this.seedHandlers]) h(seed);
        break;
      }
      case 'clock:req': {
        if (this.isHost && m.from) {
          const { t0 } = m.data as { t0: number };
          this.net.send(message('sync', 'clock:res', { t0, hostTime: this.clock.now() }, { to: m.from }));
        }
        break;
      }
      case 'clock:res': {
        const { t0, hostTime } = m.data as { t0: number; hostTime: number };
        this.clock.ingestSample(t0, hostTime, Date.now());
        break;
      }
    }
  }

  private startClockSync(): void {
    let count = 0;
    const ping = () => {
      this.net.send(message('sync', 'clock:req', { t0: Date.now() }, { to: this.getHostId() ?? 'host' }));
      count += 1;
      if (count >= CLOCK_SAMPLES && this.clockTimer) {
        // Slow down to occasional re-sync after the initial burst.
        clearInterval(this.clockTimer);
        this.clockTimer = setInterval(ping, CLOCK_INTERVAL_MS * 4);
      }
    };
    ping();
    this.clockTimer = setInterval(ping, CLOCK_INTERVAL_MS);
  }

  dispose(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.handlers.clear();
    this.seedHandlers.clear();
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.clockTimer = null;
  }
}
