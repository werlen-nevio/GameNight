import type { GameEvent } from '../events/gameEvents';
import { message, type PeerId, type Target } from '../events/protocol';
import type { GameTransport, LobbyTransport, Transport } from './types';

/**
 * Channel facades that keep higher layers off the raw transport.
 *
 * `GameTransport` encodes the only routing games ever need: clients `sendEvent`
 * to the host; the host `broadcast`s authoritative events to everyone. Game
 * modules thus speak purely in {@link GameEvent}s — never sockets, never
 * routing — exactly as required.
 */
export class GameTransportAdapter implements GameTransport {
  constructor(
    private transport: Transport,
    private hostCheck: () => boolean,
  ) {}

  get selfId(): PeerId | null {
    return this.transport.selfId;
  }

  get isHost(): boolean {
    return this.hostCheck();
  }

  sendEvent(event: GameEvent): void {
    this.transport.send(message('game', event.type, event, { to: 'host' }));
  }

  broadcast(event: GameEvent): void {
    this.transport.send(message('game', event.type, event, { to: 'all' }));
  }

  onEvent(handler: (event: GameEvent, from: PeerId) => void): () => void {
    return this.transport.events.on('message', (msg) => {
      if (msg.channel !== 'game' || !msg.from) return;
      handler(msg.data as GameEvent, msg.from);
    });
  }
}

/** Lobby channel facade — presence, ready, kick, chat, etc. */
export class LobbyTransportAdapter implements LobbyTransport {
  constructor(private transport: Transport) {}

  get selfId(): PeerId | null {
    return this.transport.selfId;
  }

  send(type: string, data: unknown, to: Target = 'all'): void {
    this.transport.send(message('lobby', type, data, { to }));
  }

  on(handler: (type: string, data: unknown, from: PeerId) => void): () => void {
    return this.transport.events.on('message', (msg) => {
      if (msg.channel !== 'lobby' || !msg.from) return;
      handler(msg.type, msg.data, msg.from);
    });
  }
}
