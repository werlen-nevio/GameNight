import { Emitter } from '../events/emitter';
import { isNetMessage, type NetMessage, type PeerId } from '../events/protocol';
import { steam } from '../steam';
import type { ConnectOptions, Transport, TransportEvents, TransportState } from './types';

/**
 * Real networked transport over **Steam P2P / Steam lobbies**. Built on the
 * `steam.networking` primitive, it carries the exact same {@link NetMessage}
 * protocol as the relay/WebRTC transports, so lobby, sync and game code are
 * untouched — gameplay is fully transport-independent.
 *
 * The factory selects this automatically when Steam is available (see
 * `defaultTransportKind`) and falls back to WebRTC/relay otherwise.
 */
export class SteamNetworkingTransport implements Transport {
  readonly kind = 'steam' as const;
  readonly events = new Emitter<TransportEvents>();
  state: TransportState = 'idle';
  selfId: PeerId | null = null;
  rttMs: number | null = null;

  private offs: Array<() => void> = [];

  private setState(s: TransportState) {
    this.state = s;
    this.events.emit('state', s);
  }

  async connect(opts: ConnectOptions): Promise<void> {
    if (!steam.networking.available) throw new Error('Steam-Netzwerk ist nicht verfügbar');
    this.setState('connecting');

    this.offs.push(
      steam.networking.onMessage((fromId, data) => {
        try {
          const msg = JSON.parse(data) as NetMessage;
          if (isNetMessage(msg)) this.events.emit('message', { ...msg, from: fromId });
        } catch {
          /* drop malformed frame */
        }
      }),
      steam.networking.onMember(({ id, joined }) =>
        this.events.emit(joined ? 'peerJoin' : 'peerLeave', { id }),
      ),
    );

    try {
      if (opts.create) {
        const { code, selfId } = await steam.networking.host(8);
        this.selfId = selfId;
        this.setState('connected');
        this.events.emit('open', { selfId, hostId: selfId, peers: [], code });
      } else {
        const { selfId, members } = await steam.networking.joinByCode(opts.room);
        this.selfId = selfId;
        const hostId = steam.networking.hostId() ?? members[0] ?? selfId;
        this.setState('connected');
        this.events.emit('open', { selfId, hostId, peers: members, code: opts.room });
      }
    } catch (err) {
      this.setState('error');
      throw err as Error;
    }
  }

  send(msg: NetMessage): void {
    if (this.state !== 'connected') return;
    steam.networking.send(msg.to ?? 'all', JSON.stringify(msg));
  }

  close(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    steam.networking.leave();
    this.setState('closed');
    this.events.clear();
  }
}
