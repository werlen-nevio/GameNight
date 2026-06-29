import type { PeerId } from '../events/protocol';
import type { PeerIdentity, VoiceTransport } from './types';

/**
 * The no-op voice transport. Voice is intentionally NOT implemented yet — this
 * satisfies the {@link VoiceTransport} contract so a future WebRTC / Discord /
 * Steam voice backend drops in without touching lobby or gameplay code.
 */
export class NullVoiceTransport implements VoiceTransport {
  readonly available = false;
  async join(_room: string, _identity: PeerIdentity): Promise<void> {
    /* no-op */
  }
  async leave(): Promise<void> {
    /* no-op */
  }
  setMuted(_muted: boolean): void {
    /* no-op */
  }
  setDeafened(_deafened: boolean): void {
    /* no-op */
  }
  onSpeaking(_handler: (levels: Record<PeerId, number>) => void): () => void {
    return () => {};
  }
}

/** The active voice transport. Swap this single binding to enable voice. */
export const voiceTransport: VoiceTransport = new NullVoiceTransport();
