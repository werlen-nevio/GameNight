import type { Emitter } from '../events/emitter';
import type { GameEvent } from '../events/gameEvents';
import type { NetMessage, PeerId, Target } from '../events/protocol';

/** Which concrete transport is in use. New ones extend this union. */
export type TransportKind = 'loopback' | 'websocket' | 'broadcast' | 'webrtc' | 'steam';

export type TransportState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed'
  | 'error';

/** Where the app is running — surfaced as a platform icon in the lobby. */
export type RuntimePlatform = 'ios' | 'android' | 'tablet' | 'web' | 'desktop';

/** Minimal identity a peer presents when connecting. */
export interface PeerIdentity {
  name: string;
  avatarEmoji: string;
  color?: string;
  platform: RuntimePlatform;
  /** Stable id used to reclaim a slot on reconnect. */
  persistentId: string;
}

export interface ConnectOptions {
  /** Lobby/room code peers share. */
  room: string;
  identity: PeerIdentity;
  /** True to create the room (become initial host), false to join. */
  create?: boolean;
  /** Relay/signaling endpoint for networked transports. */
  url?: string;
}

/** Events any {@link Transport} emits. The app never reads sockets directly. */
export interface TransportEvents {
  /** Connection lifecycle. */
  state: TransportState;
  /** Connected and identified: our id + the current host id + existing peers. */
  open: { selfId: PeerId; hostId: PeerId; peers: PeerId[] };
  /** An application message arrived (`from` is populated). */
  message: NetMessage;
  peerJoin: { id: PeerId };
  peerLeave: { id: PeerId };
  /** The relay/host designated a (new) host. */
  host: { id: PeerId };
  error: { error: Error };
}

/**
 * The single networking primitive. Moves opaque {@link NetMessage}s between
 * peers in a room and reports presence. It knows nothing about lobbies or
 * games — that separation is what makes transports interchangeable.
 */
export interface Transport {
  readonly kind: TransportKind;
  readonly events: Emitter<TransportEvents>;
  readonly state: TransportState;
  readonly selfId: PeerId | null;
  connect(opts: ConnectOptions): Promise<void>;
  /** Send a message; routing honors `msg.to` (defaults to 'all'). */
  send(msg: NetMessage): void;
  /** Round-trip latency to the host in ms, if known. */
  readonly rttMs: number | null;
  close(): void;
}

/**
 * Game-facing facade over a {@link Transport}, scoped to the `game` channel.
 * Game modules depend only on this — they emit/observe {@link GameEvent}s and
 * never touch the transport, satisfying "game logic must not depend on
 * transport".
 */
export interface GameTransport {
  readonly selfId: PeerId | null;
  readonly isHost: boolean;
  sendEvent(event: GameEvent): void;
  /** Broadcast to everyone but self (host fan-out helper). */
  broadcast(event: GameEvent): void;
  onEvent(handler: (event: GameEvent, from: PeerId) => void): () => void;
}

/** Lobby-facing facade over a {@link Transport}, scoped to the `lobby` channel. */
export interface LobbyTransport {
  readonly selfId: PeerId | null;
  send(type: string, data: unknown, to?: Target): void;
  on(handler: (type: string, data: unknown, from: PeerId) => void): () => void;
}

/**
 * Voice interface — intentionally NOT implemented yet. Future WebRTC / Discord /
 * Steam voice plug in here without touching gameplay or lobby code.
 */
export interface VoiceTransport {
  readonly available: boolean;
  join(room: string, identity: PeerIdentity): Promise<void>;
  leave(): Promise<void>;
  setMuted(muted: boolean): void;
  setDeafened(deafened: boolean): void;
  /** Per-peer speaking levels (0..1) for UI indicators. */
  onSpeaking(handler: (levels: Record<PeerId, number>) => void): () => void;
}
