import { create } from 'zustand';

import { LobbyController } from '../core/lobby/LobbyController';
import type { LobbyState, StartPayload } from '../core/lobby/types';
import { NetworkClient } from '../core/network/NetworkClient';
import { SyncEngine } from '../core/sync/SyncEngine';
import { defaultTransportKind, type TransportConfig } from '../core/transport/factory';
import { relayServices } from '../core/network/sharedRelay';
import type { TransportKind } from '../core/transport/types';
import { runtimePlatform } from '../core/platform/platform';
import { createLobbyCode } from '../core/utils/id';
import { AVATAR_BY_ID } from '../domain';
import { usePlayerStore } from './playerStore';

export type OnlineStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed';

interface OnlineState {
  controller: LobbyController | null;
  sync: SyncEngine | null;
  net: NetworkClient | null;
  lobby: LobbyState | null;
  status: OnlineStatus;
  error: string | null;
  transportKind: TransportKind;
  /** Set when the host launches a match; consumed by the online game screen. */
  startPayload: StartPayload | null;

  host: (config?: TransportConfig, lobbyOpts?: { password?: string; privacy?: 'public' | 'private' | 'invite' }) => Promise<string>;
  join: (code: string, config?: TransportConfig) => Promise<void>;
  /** Enter a specific code (create=true hosts/creates, false joins). */
  connect: (
    code: string,
    create: boolean,
    config?: TransportConfig,
    lobbyOpts?: { password?: string; privacy?: 'public' | 'private' | 'invite' },
  ) => Promise<void>;
  /** Enter the matchmaking queue (public/quick/ranked) via the relay. */
  quickPlay: (qtype: string, modeId?: string) => void;
  leave: () => void;
  returnToLobby: () => void;
  reset: () => void;
}

/** Builds the local player's network identity from their profile. */
function selfIdentity() {
  const p = usePlayerStore.getState().player;
  return {
    name: p.name,
    avatarEmoji: AVATAR_BY_ID[p.equipped.avatar]?.emoji ?? '🙂',
    platform: runtimePlatform(),
    persistentId: p.id,
  };
}

export const useOnlineStore = create<OnlineState>((set, get) => {
  let rttTimer: ReturnType<typeof setInterval> | null = null;

  async function enter(
    code: string,
    create: boolean,
    config?: TransportConfig,
    lobbyOpts?: { password?: string; privacy?: 'public' | 'private' | 'invite' },
  ): Promise<void> {
    get().reset();
    const net = new NetworkClient(config);
    const controller = new LobbyController(net, selfIdentity());
    const sync = new SyncEngine(net, () => controller.hostPeerId);

    controller.events.on('change', (lobby) => set({ lobby }));
    controller.events.on('error', ({ message }) => set({ error: message, status: 'error' }));
    controller.events.on('kicked', () => set({ status: 'closed', error: 'Du wurdest entfernt' }));
    controller.events.on('started', (payload) => set({ startPayload: payload }));

    net.events.on('reconnecting', () => set({ status: 'reconnecting' }));
    net.events.on('reconnected', () => set({ status: 'connected' }));
    net.events.on('gaveup', () => set({ status: 'error', error: 'Verbindung verloren' }));

    set({
      net,
      controller,
      sync,
      status: 'connecting',
      error: null,
      transportKind: config?.kind ?? defaultTransportKind(),
    });

    sync.start();
    await controller.connect(code, create, lobbyOpts);
    set({ status: 'connected', lobby: controller.snapshot() });

    rttTimer = setInterval(() => controller.pollRtt(), 2500);
  }

  return {
    controller: null,
    sync: null,
    net: null,
    lobby: null,
    status: 'idle',
    error: null,
    transportKind: defaultTransportKind(),
    startPayload: null,

    host: async (config, lobbyOpts) => {
      // Server-less transports use this client code; networked transports get a
      // secure server-assigned code, surfaced via the lobby snapshot.
      const code = createLobbyCode();
      await enter(code, true, config, lobbyOpts);
      return get().lobby?.code ?? code;
    },

    join: async (code, config) => {
      await enter(code.toUpperCase(), false, config);
    },

    connect: async (code, create, config, lobbyOpts) => {
      await enter(code.toUpperCase(), create, config, lobbyOpts);
    },

    quickPlay: (qtype, modeId) => relayServices.enqueue(qtype, modeId),

    leave: () => {
      get().controller?.leave();
      get().sync?.dispose();
      get().reset();
    },

    returnToLobby: () => {
      get().controller?.returnToLobby();
      set({ startPayload: null });
    },

    reset: () => {
      if (rttTimer) {
        clearInterval(rttTimer);
        rttTimer = null;
      }
      set({ controller: null, sync: null, net: null, lobby: null, status: 'idle', error: null, startPayload: null });
    },
  };
});
