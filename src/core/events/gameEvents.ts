import type { PeerId } from './protocol';

/**
 * Game-domain events. Game modules emit and react to *these* — never to
 * sockets. The networking framework carries them on the `game` channel and the
 * sync engine orders/relays them, so a mode's online behavior is expressed
 * purely as events ("PlayerAnswered", "RoundFinished", …).
 */
export const GameEventType = {
  PlayerReady: 'PlayerReady',
  PlayerUnready: 'PlayerUnready',
  PlayerAnswered: 'PlayerAnswered',
  PlayerInput: 'PlayerInput',
  GameStarted: 'GameStarted',
  RoundStarted: 'RoundStarted',
  RoundFinished: 'RoundFinished',
  TimerStarted: 'TimerStarted',
  TimerExpired: 'TimerExpired',
  ScoreUpdated: 'ScoreUpdated',
  PhaseChanged: 'PhaseChanged',
  GameFinished: 'GameFinished',
} as const;

export type GameEventType = (typeof GameEventType)[keyof typeof GameEventType];

/**
 * A single game event. `by` is the producing peer (or 'host'/'system'); `at` is
 * the {@link NetClock} timestamp so ordering is identical on every client.
 */
export interface GameEvent<T = unknown> {
  type: GameEventType | (string & {});
  by: PeerId | 'host' | 'system';
  data: T;
  at: number;
}

/** Convenience constructor (timestamp supplied by the caller's net clock). */
export function gameEvent<T>(
  type: GameEvent['type'],
  by: GameEvent['by'],
  data: T,
  at: number,
): GameEvent<T> {
  return { type, by, data, at };
}
