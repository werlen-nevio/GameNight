/**
 * The wire protocol. Everything that crosses a {@link Transport} is a
 * {@link NetMessage} — a small, JSON-serializable, versioned envelope. Higher
 * layers (lobby, sync, game) own their own `type`s within a channel; the
 * transport itself stays oblivious to meaning, which is what lets any transport
 * (loopback, WebSocket relay, WebRTC, Steam …) carry the same traffic.
 */

export const PROTOCOL_VERSION = 1;

/** Stable identifier for a connected peer within a session. */
export type PeerId = string;

/** Logical channels multiplex independent concerns over one connection. */
export type Channel = 'ctrl' | 'lobby' | 'sync' | 'game' | 'chat' | 'voice';

/** Routing target for a message. */
export type Target = PeerId | 'all' | 'host';

export interface NetMessage<T = unknown> {
  /** Protocol version — receivers reject mismatches. */
  v: number;
  channel: Channel;
  /** Channel-specific message type (e.g. 'PlayerReady', 'snapshot'). */
  type: string;
  data: T;
  /** Sender peer id. Filled in by the transport on receive. */
  from?: PeerId;
  /** Optional routing hint; transports may honor or broadcast. */
  to?: Target;
  /** Sender wall-clock (ms) — used for latency/ordering, not authority. */
  ts: number;
  /** Optional per-sender monotonic sequence for ordering/dedupe. */
  seq?: number;
}

/** Builds a well-formed envelope with version + timestamp filled in. */
export function message<T>(
  channel: Channel,
  type: string,
  data: T,
  opts?: { to?: Target; seq?: number; ts?: number },
): NetMessage<T> {
  return {
    v: PROTOCOL_VERSION,
    channel,
    type,
    data,
    to: opts?.to,
    seq: opts?.seq,
    ts: opts?.ts ?? Date.now(),
  };
}

/** Type guard for a syntactically valid, version-matched envelope. */
export function isNetMessage(value: unknown): value is NetMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return m.v === PROTOCOL_VERSION && typeof m.channel === 'string' && typeof m.type === 'string';
}
