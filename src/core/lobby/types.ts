import type { PeerId } from '../events/protocol';
import type { RuntimePlatform } from '../transport/types';

/** A participant in an online lobby. Keyed stably by `persistentId`. */
export interface LobbyMember {
  /** Current transport peer id (changes across reconnects). */
  peerId: PeerId;
  /** Stable id used to reclaim a slot on reconnect. */
  persistentId: string;
  name: string;
  avatarEmoji: string;
  color: string;
  platform: RuntimePlatform;
  isHost: boolean;
  isYou: boolean;
  ready: boolean;
  /** False while a disconnected member is within the reconnect grace window. */
  connected: boolean;
  /** Round-trip latency in ms, if measured. */
  rttMs: number | null;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  persistentId: string;
  name: string;
  text: string;
  at: number;
}

export type LobbyStatus = 'connecting' | 'lobby' | 'starting' | 'in_game' | 'closed';

/** The immutable snapshot the UI renders. */
export interface LobbyState {
  code: string;
  status: LobbyStatus;
  selfPersistentId: string;
  hostPersistentId: string | null;
  members: LobbyMember[];
  chat: ChatMessage[];
  maxPlayers: number;
  /** True once every connected member is ready (drives the confetti moment). */
  allReady: boolean;
}

/** Payload broadcast by the host to launch the match on every device. */
export interface StartPayload {
  modeId: string;
  seed: string;
  config?: unknown;
}

export interface LobbyControllerEvents {
  change: LobbyState;
  chat: ChatMessage;
  emote: { persistentId: string; emoteId: string; at: number };
  started: StartPayload;
  kicked: Record<string, never>;
  allReady: Record<string, never>;
  error: { message: string };
}
