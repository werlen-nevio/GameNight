import { create } from 'zustand';

import { authService, type AuthIdentity, type AuthProvider } from '../core/auth/AuthService';
import { cloudSaveService, type SaveBlob } from '../core/cloud/CloudSaveService';
import { relayServices } from '../core/network/sharedRelay';
import { Storage } from '../core/services/storage/storage';
import { RELAY_URL } from '../core/transport/config';
import {
  steam,
  pullCloudSave,
  pushCloudSave,
  resolveCloudConflict,
  setSteamLobbyPresence,
  syncSteamProgress,
} from '../core/steam';
import { usePlayerStore } from './playerStore';
import { useSettingsStore } from './settingsStore';

type CloudState = 'idle' | 'syncing' | 'synced' | 'offline';

const META_KEY = 'cloud/meta';

interface AccountState {
  identity: AuthIdentity | null;
  relayState: 'offline' | 'connecting' | 'online';
  cloud: CloudState;
  init: () => Promise<void>;
  signIn: (provider: AuthProvider) => Promise<void>;
  syncNow: () => void;
}

function buildBlob(updatedAt: number): SaveBlob {
  const player = usePlayerStore.getState().player;
  const s = useSettingsStore.getState();
  return {
    v: 1,
    updatedAt,
    player,
    settings: {
      sound: s.sound,
      music: s.music,
      haptics: s.haptics,
      sfxVolume: s.sfxVolume,
      musicVolume: s.musicVolume,
      reducedMotion: s.reducedMotion,
    },
  };
}

function applySettings(s: SaveBlob['settings']) {
  const st = useSettingsStore.getState();
  st.setSound(s.sound);
  st.setMusic(s.music);
  st.setHaptics(s.haptics);
  st.setSfxVolume(s.sfxVolume);
  st.setMusicVolume(s.musicVolume);
  st.setReducedMotion(s.reducedMotion);
}

export const useAccountStore = create<AccountState>((set, get) => {
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let subscribed = false;
  let steamSubscribed = false;

  /**
   * Initialises the Steam ecosystem when running inside a Steam build:
   * reconciles the Steam Cloud profile (conflict-resolved toward most progress),
   * pushes achievements + stats, and keeps both in sync on every change. No-op
   * everywhere else (the null integration reports `available === false`).
   */
  const initSteam = async () => {
    await steam.init().catch(() => false);
    if (!steam.available) return;

    const remote = pullCloudSave(steam);
    if (remote) {
      const merged = resolveCloudConflict(usePlayerStore.getState().player, remote);
      usePlayerStore.getState().replacePlayer(merged);
    }
    const player = usePlayerStore.getState().player;
    syncSteamProgress(steam, player);
    pushCloudSave(steam, player);
    setSteamLobbyPresence(steam, { status: 'Im Hauptmenü' });

    if (!steamSubscribed) {
      steamSubscribed = true;
      // Pump Steam's callback queue (invites, overlay, lobby events).
      setInterval(() => steam.runCallbacks(), 1000 / 30);
      usePlayerStore.subscribe(() => {
        const p = usePlayerStore.getState().player;
        syncSteamProgress(steam, p);
        pushCloudSave(steam, p);
      });
    }
  };

  const pushNow = async () => {
    if (!cloudSaveService.available) return;
    const updatedAt = Date.now();
    cloudSaveService.push(buildBlob(updatedAt));
    await Storage.set(META_KEY, { updatedAt });
    set({ cloud: 'synced' });
  };

  const schedulePush = () => {
    if (!cloudSaveService.available) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void pushNow(), 1500);
  };

  const reconcile = async () => {
    set({ cloud: 'syncing' });
    const remote = await cloudSaveService.pull();
    const meta = await Storage.get<{ updatedAt: number }>(META_KEY, { updatedAt: 0 });
    if (remote && remote.updatedAt > meta.updatedAt) {
      usePlayerStore.getState().replacePlayer(remote.player);
      applySettings(remote.settings);
      await Storage.set(META_KEY, { updatedAt: remote.updatedAt });
      set({ cloud: 'synced' });
    } else {
      await pushNow();
    }
    if (!subscribed) {
      subscribed = true;
      usePlayerStore.subscribe(schedulePush);
      useSettingsStore.subscribe(schedulePush);
    }
  };

  return {
    identity: null,
    relayState: 'offline',
    cloud: 'idle',

    init: async () => {
      relayServices.events.on('state', (relayState) => set({ relayState }));

      const player = usePlayerStore.getState().player;
      const restored = await authService.restore();
      const identity = restored ?? (await authService.signInGuest(player.id, player.name));
      set({ identity });

      if (RELAY_URL && relayServices.connected) {
        await reconcile();
      } else {
        set({ cloud: 'offline' });
      }

      // Steam Cloud + achievements/stats run alongside the relay cloud save.
      await initSteam();
    },

    signIn: async (provider) => {
      const player = usePlayerStore.getState().player;
      let identity: AuthIdentity;
      if (provider === 'guest') identity = await authService.signInGuest(player.id, player.name);
      else if (provider === 'anonymous') identity = await authService.signInAnonymous(player.id, player.name);
      else if (provider === 'google') identity = await authService.signInWithGoogle();
      else if (provider === 'apple') identity = await authService.signInWithApple();
      else identity = await authService.signInWithSteam();
      set({ identity });
      if (relayServices.connected) await reconcile();
    },

    syncNow: () => void pushNow(),
  };
});
