import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Audio } from '../core/services/audio/AudioService';
import { setHapticsEnabled } from '../core/services/haptics/haptics';
import { zustandStorage } from '../core/services/storage/storage';

export interface SettingsState {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  sfxVolume: number;
  musicVolume: number;
  /** Honors users who prefer fewer/cheaper animations. */
  reducedMotion: boolean;
  hydrated: boolean;

  setSound: (v: boolean) => void;
  setMusic: (v: boolean) => void;
  setHaptics: (v: boolean) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setReducedMotion: (v: boolean) => void;
  /** Push the current settings into the audio/haptic services. */
  apply: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      sound: true,
      music: true,
      haptics: true,
      sfxVolume: 0.9,
      musicVolume: 0.5,
      reducedMotion: false,
      hydrated: false,

      setSound: (v) => {
        set({ sound: v });
        Audio.setSfxEnabled(v);
      },
      setMusic: (v) => {
        set({ music: v });
        Audio.setMusicEnabled(v);
      },
      setHaptics: (v) => {
        set({ haptics: v });
        setHapticsEnabled(v);
      },
      setSfxVolume: (v) => {
        set({ sfxVolume: v });
        Audio.setSfxVolume(v);
      },
      setMusicVolume: (v) => {
        set({ musicVolume: v });
        Audio.setMusicVolume(v);
      },
      setReducedMotion: (v) => set({ reducedMotion: v }),

      apply: () => {
        const s = get();
        Audio.setSfxEnabled(s.sound);
        Audio.setMusicEnabled(s.music);
        Audio.setSfxVolume(s.sfxVolume);
        Audio.setMusicVolume(s.musicVolume);
        setHapticsEnabled(s.haptics);
      },
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ sound, music, haptics, sfxVolume, musicVolume, reducedMotion }) => ({
        sound,
        music,
        haptics,
        sfxVolume,
        musicVolume,
        reducedMotion,
      }),
      onRehydrateStorage: () => (state) => {
        state?.apply();
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);
