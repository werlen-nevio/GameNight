import { create } from 'zustand';

import { VoiceManager } from '../core/voice/VoiceManager';
import { WebRTCVoiceEngine } from '../core/voice/WebRTCVoiceEngine';
import type { VoiceActivationMode, VoiceSignaling, VoiceState } from '../core/voice/types';

/**
 * Voice store — a thin React bridge over a single {@link VoiceManager}. Kept
 * separate from the online/game stores so voice stays an isolated subsystem:
 * gameplay and networking never read or write voice state.
 */
const manager = new VoiceManager(new WebRTCVoiceEngine());

interface VoiceStoreState {
  voice: VoiceState;
  join: (signaling: VoiceSignaling) => Promise<void>;
  leave: () => void;
  setMode: (mode: VoiceActivationMode) => void;
  setPttHeld: (held: boolean) => void;
  setSelfMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setPeerVolume: (peerId: string, volume: number) => void;
  setPeerMuted: (peerId: string, muted: boolean) => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => {
  manager.events.on('change', (voice) => set({ voice: { ...voice } }));
  return {
    voice: manager.getState(),
    join: (signaling) => manager.join(signaling),
    leave: () => manager.leave(),
    setMode: (mode) => manager.setMode(mode),
    setPttHeld: (held) => manager.setPttHeld(held),
    setSelfMuted: (muted) => manager.setSelfMuted(muted),
    setDeafened: (deafened) => manager.setDeafened(deafened),
    setPeerVolume: (peerId, volume) => manager.setPeerVolume(peerId, volume),
    setPeerMuted: (peerId, muted) => manager.setPeerMuted(peerId, muted),
  };
});
