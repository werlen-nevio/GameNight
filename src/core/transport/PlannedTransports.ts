import { Emitter } from '../events/emitter';
import type { NetMessage, PeerId } from '../events/protocol';
import type { ConnectOptions, Transport, TransportEvents, TransportKind, TransportState } from './types';

/**
 * Interface-true placeholders for transports that require infrastructure or a
 * native build not present here. They conform to {@link Transport} exactly, so
 * enabling them later is a one-line factory change — gameplay, lobby and sync
 * code never change. Each fails fast with a clear, actionable message.
 */
abstract class PlannedTransport implements Transport {
  abstract readonly kind: TransportKind;
  readonly events = new Emitter<TransportEvents>();
  state: TransportState = 'idle';
  selfId: PeerId | null = null;
  rttMs: number | null = null;
  protected abstract reason: string;

  connect(_opts: ConnectOptions): Promise<void> {
    this.state = 'error';
    return Promise.reject(new Error(this.reason));
  }
  send(_msg: NetMessage): void {
    /* no-op until implemented */
  }
  close(): void {
    this.state = 'closed';
    this.events.clear();
  }
}

/** Steam Networking / Steam Lobbies — available only in a native Steam build. */
export class SteamTransport extends PlannedTransport {
  readonly kind = 'steam' as const;
  protected reason = 'Steam-Transport ist nur im nativen Steam-Build verfügbar.';
}
