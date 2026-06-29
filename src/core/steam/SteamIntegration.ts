import type {
  SteamFriendsApi,
  SteamIntegration,
  SteamInvites,
  SteamLobbies,
  SteamOverlay,
  SteamRichPresence,
  SteamVoice,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Null Steam integration — active everywhere except a Steam desktop build.
 * `available` is false so callers transparently fall back to the relay /
 * code-based flows. A real adapter (binding `steamworks.js`) implements the same
 * {@link SteamIntegration} surface and flips `available` to true.
 */
class NullSteamIntegration implements SteamIntegration {
  readonly available = false;

  async init(): Promise<boolean> {
    return false;
  }
  shutdown(): void {}

  lobbies: SteamLobbies = {
    async create() {
      throw new Error('steam_unavailable');
    },
    async join() {
      throw new Error('steam_unavailable');
    },
    async leave() {},
    setData() {},
    getData() {
      return null;
    },
    async list() {
      return [];
    },
    onJoinRequested() {
      return () => {};
    },
  };

  friends: SteamFriendsApi = {
    async me() {
      throw new Error('steam_unavailable');
    },
    async list() {
      return [];
    },
  };

  invites: SteamInvites = {
    invite() {},
    onInvite() {
      return () => {};
    },
  };

  richPresence: SteamRichPresence = { set() {}, clear() {} };
  overlay: SteamOverlay = { available: false, openInviteDialog() {}, openProfile() {} };
  voice: SteamVoice = { available: false, start() {}, stop() {} };
}

/**
 * Resolves the Steam integration for the current runtime. On a Steam desktop
 * build, `steamworks.js` is present (resolved dynamically so the mobile/web
 * bundle never depends on it) and a real adapter is returned; otherwise the null
 * integration keeps everything working via the relay.
 */
function resolveSteam(): SteamIntegration {
  try {
    const req: (id: string) => any = (globalThis as any).require || require;
    const steamworks = req(['steamworks', 'js'].join('.'));
    if (steamworks) {
      // A real adapter would wrap steamworks here. Until a desktop build exists,
      // fall through to the null integration rather than fake availability.
    }
  } catch {
    /* not a Steam build */
  }
  return new NullSteamIntegration();
}

export const steam: SteamIntegration = resolveSteam();
