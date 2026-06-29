import type { NetMessage, PeerId, Target } from '../events/protocol';

/**
 * The tiny control protocol spoken between a client and the relay server. The
 * relay is deliberately "dumb": it assigns peer ids, tracks room membership and
 * forwards opaque {@link NetMessage}s. It understands nothing about lobbies or
 * games, so the same server works for every current and future game mode.
 *
 * The reference server in `server/relay.js` implements exactly this protocol.
 */
export type RelayClientMessage =
  | { t: 'hello'; room: string; create: boolean; password?: string; privacy?: string }
  | { t: 'relay'; to: Target; msg: NetMessage }
  | { t: 'ping'; ts: number }
  | { t: 'bye' };

export type RelayServerMessage =
  | { t: 'welcome'; selfId: PeerId; hostId: PeerId; peers: PeerId[]; code?: string }
  | { t: 'rotated'; code: string }
  | { t: 'error'; reason: string }
  | { t: 'join'; id: PeerId }
  | { t: 'leave'; id: PeerId }
  | { t: 'host'; id: PeerId }
  | { t: 'msg'; from: PeerId; msg: NetMessage }
  | { t: 'pong'; ts: number };
