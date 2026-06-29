/**
 * Voice contracts. Voice is a fully isolated subsystem — gameplay never imports
 * it, and it never imports gameplay. It rides its own signaling channel and
 * exposes a small observable state the lobby UI renders.
 */
export type VoiceSignal =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; candidate: unknown };

/**
 * The signaling bridge the voice layer needs. In GameNight this is wired to the
 * lobby NetworkClient's `voice` channel — but voice doesn't know that; any
 * transport can provide it.
 */
export interface VoiceSignaling {
  readonly selfId: string | null;
  send(to: string, data: VoiceSignal): void;
  onSignal(handler: (from: string, data: VoiceSignal) => void): () => void;
  peers(): string[];
  onPeersChanged(handler: (peers: string[]) => void): () => void;
}

/** Per-participant voice state surfaced to the UI. */
export interface VoiceParticipant {
  id: string;
  /** True while their audio level is above the speaking threshold. */
  speaking: boolean;
  /** Smoothed 0..1 level for the animated ring. */
  level: number;
  /** Listener-side volume 0..1 (per-peer slider). */
  volume: number;
  /** Locally muted (we don't hear them). */
  muted: boolean;
}

export type VoiceActivationMode = 'vad' | 'ptt';

export interface VoiceState {
  available: boolean;
  joined: boolean;
  /** Microphone permission/capture is active. */
  micActive: boolean;
  permission: 'unknown' | 'granted' | 'denied' | 'prompt';
  mode: VoiceActivationMode;
  selfMuted: boolean;
  deafened: boolean;
  /** Our own live mic level (for the self speaking ring). */
  selfLevel: number;
  selfSpeaking: boolean;
  participants: Record<string, VoiceParticipant>;
}

/** Low-level WebRTC plumbing contract (mic, peer connections, levels). */
export interface VoiceEngine {
  readonly available: boolean;
  start(signaling: VoiceSignaling, opts: VoiceEngineOptions): Promise<void>;
  stop(): void;
  setMicEnabled(enabled: boolean): void;
  setPeerVolume(peerId: string, volume: number): void;
  setPeerMuted(peerId: string, muted: boolean): void;
  setDeafened(deafened: boolean): void;
}

export interface VoiceEngineOptions {
  /** Audio constraints — noise suppression / echo cancellation / AGC. */
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  /** ICE servers (STUN/TURN) for NAT traversal. */
  iceServers: RTCIceServerLike[];
  /** Reports a peer's (or 'self') smoothed level 0..1 each frame. */
  onLevel: (peerId: string, level: number) => void;
}

export interface RTCIceServerLike {
  urls: string | string[];
  username?: string;
  credential?: string;
}
