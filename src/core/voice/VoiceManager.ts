import { Emitter } from '../events/emitter';
import { iceServers, VAD_THRESHOLD } from './config';
import type {
  VoiceActivationMode,
  VoiceEngine,
  VoiceParticipant,
  VoiceSignaling,
  VoiceState,
} from './types';

const LEVEL_SMOOTHING = 0.4;

/**
 * Voice policy + lifecycle on top of a {@link VoiceEngine}. Handles the mic
 * permission flow, push-to-talk vs voice-activation gating, self/peer mute,
 * deafen, per-peer volume and speaking detection — exposing a single observable
 * {@link VoiceState} for the UI. Knows nothing about lobbies or gameplay.
 */
export class VoiceManager {
  readonly events = new Emitter<{ change: VoiceState }>();
  private state: VoiceState = {
    available: false,
    joined: false,
    micActive: false,
    permission: 'unknown',
    mode: 'vad',
    selfMuted: false,
    deafened: false,
    selfLevel: 0,
    selfSpeaking: false,
    participants: {},
  };
  private pttHeld = false;

  constructor(private engine: VoiceEngine) {
    this.state.available = engine.available;
  }

  getState(): VoiceState {
    return this.state;
  }

  private patch(p: Partial<VoiceState>) {
    this.state = { ...this.state, ...p };
    this.events.emit('change', this.state);
  }

  /** Joins voice for a session. Triggers the mic permission prompt. */
  async join(signaling: VoiceSignaling): Promise<void> {
    if (!this.engine.available || this.state.joined) return;
    this.patch({ permission: 'prompt' });
    try {
      await this.engine.start(signaling, {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
        iceServers: iceServers(),
        onLevel: (peerId, level) => this.onLevel(peerId, level),
      });
      this.patch({ joined: true, micActive: true, permission: 'granted' });
      this.applyMic();
    } catch {
      this.patch({ permission: 'denied', joined: false, micActive: false });
    }
  }

  leave(): void {
    this.engine.stop();
    this.patch({ joined: false, micActive: false, participants: {}, selfSpeaking: false, selfLevel: 0 });
  }

  setMode(mode: VoiceActivationMode): void {
    this.patch({ mode });
    this.applyMic();
  }

  /** Push-to-talk press/release (only meaningful in `ptt` mode). */
  setPttHeld(held: boolean): void {
    this.pttHeld = held;
    this.applyMic();
  }

  setSelfMuted(muted: boolean): void {
    this.patch({ selfMuted: muted });
    this.applyMic();
  }

  setDeafened(deafened: boolean): void {
    this.engine.setDeafened(deafened);
    this.patch({ deafened });
    // Deafened implies you also stop transmitting.
    if (deafened) this.setSelfMuted(true);
  }

  setPeerVolume(peerId: string, volume: number): void {
    this.engine.setPeerVolume(peerId, volume);
    this.updateParticipant(peerId, { volume });
  }

  setPeerMuted(peerId: string, muted: boolean): void {
    this.engine.setPeerMuted(peerId, muted);
    this.updateParticipant(peerId, { muted });
  }

  /** Computes whether the mic should currently transmit and applies it. */
  private applyMic(): void {
    if (!this.state.joined) return;
    const gateOpen = this.state.mode === 'ptt' ? this.pttHeld : true;
    const transmit = !this.state.selfMuted && gateOpen;
    // In VAD mode the level gate is applied per-frame in onLevel; here we set the
    // baseline (muted/ptt). VAD refines it.
    if (this.state.mode === 'ptt') this.engine.setMicEnabled(transmit);
    else if (this.state.selfMuted) this.engine.setMicEnabled(false);
  }

  private onLevel(peerId: string, level: number): void {
    if (peerId === 'self') {
      const smoothed = this.state.selfLevel * (1 - LEVEL_SMOOTHING) + level * LEVEL_SMOOTHING;
      let speaking = false;
      if (this.state.mode === 'vad' && !this.state.selfMuted) {
        // Voice activation: open the mic only while above threshold.
        const open = smoothed > VAD_THRESHOLD;
        this.engine.setMicEnabled(open);
        speaking = open;
      } else if (this.state.mode === 'ptt') {
        speaking = this.pttHeld && !this.state.selfMuted;
      }
      this.patch({ selfLevel: smoothed, selfSpeaking: speaking });
      return;
    }
    const existing = this.state.participants[peerId];
    const smoothed = (existing?.level ?? 0) * (1 - LEVEL_SMOOTHING) + level * LEVEL_SMOOTHING;
    this.updateParticipant(peerId, { level: smoothed, speaking: !((existing?.muted) ?? false) && smoothed > VAD_THRESHOLD });
  }

  private updateParticipant(peerId: string, patch: Partial<VoiceParticipant>): void {
    const prev: VoiceParticipant = this.state.participants[peerId] ?? {
      id: peerId,
      speaking: false,
      level: 0,
      volume: 1,
      muted: false,
    };
    this.patch({ participants: { ...this.state.participants, [peerId]: { ...prev, ...patch } } });
  }
}
