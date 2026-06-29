import type {
  SteamAchievementsApi,
  SteamAuthApi,
  SteamCloudApi,
  SteamFriendsApi,
  SteamIntegration,
  SteamInvites,
  SteamLobbies,
  SteamNetworking,
  SteamOverlay,
  SteamRichPresence,
  SteamStatsApi,
  SteamVoice,
} from './types';

/**
 * Null Steam integration — active everywhere except a Steam desktop build.
 * `available` is false so callers transparently fall back to the relay /
 * code-based flows. The real {@link SteamworksAdapter} implements the same
 * surface and flips `available` to true when `steamworks.js` initialises.
 *
 * Every method is a safe no-op / empty result, so app code can call Steam
 * unconditionally (achievements, stats, cloud, presence) without guards.
 */
export class NullSteamIntegration implements SteamIntegration {
  readonly available = false;

  async init(): Promise<boolean> {
    return false;
  }
  shutdown(): void {}
  runCallbacks(): void {}

  auth: SteamAuthApi = {
    user() {
      return null;
    },
    async sessionTicket() {
      throw new Error('steam_unavailable');
    },
    cancelTicket() {},
  };

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

  networking: SteamNetworking = {
    available: false,
    kind: 'steam',
    async host() {
      throw new Error('steam_unavailable');
    },
    async joinByCode() {
      throw new Error('steam_unavailable');
    },
    send() {},
    onMessage() {
      return () => {};
    },
    onMember() {
      return () => {};
    },
    hostId() {
      return null;
    },
    leave() {},
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
  overlay: SteamOverlay = {
    available: false,
    openInviteDialog() {},
    openProfile() {},
    openWebPage() {},
    takeScreenshot() {},
  };
  voice: SteamVoice = { available: false, start() {}, stop() {} };

  achievements: SteamAchievementsApi = {
    unlock() {
      return false;
    },
    isUnlocked() {
      return false;
    },
    clear() {
      return false;
    },
    indicateProgress() {
      return false;
    },
    list() {
      return [];
    },
    store() {},
  };

  stats: SteamStatsApi = {
    getInt() {
      return 0;
    },
    setInt() {
      return false;
    },
    getFloat() {
      return 0;
    },
    setFloat() {
      return false;
    },
    store() {},
  };

  cloud: SteamCloudApi = {
    available: false,
    write() {
      return false;
    },
    read() {
      return null;
    },
    delete() {
      return false;
    },
    exists() {
      return false;
    },
    list() {
      return [];
    },
  };
}

/**
 * Resolves the Steam integration for the current runtime. On a Steam desktop
 * build, `steamworks.js` is present (resolved dynamically so the mobile/web
 * bundle never depends on it) and the real {@link SteamworksAdapter} is
 * returned; otherwise the null integration keeps everything working via the
 * relay. The Steam App ID comes from STEAM_APP_ID (defaults to the dev 480).
 */
function resolveSteam(): SteamIntegration {
  try {
    const req = (globalThis as { require?: (id: string) => unknown }).require;
    if (!req) return new NullSteamIntegration();
    // Dynamic, dotted id keeps Metro/web bundlers from trying to resolve it.
    const steamworks = req(['steamworks', 'js'].join('.')) as unknown;
    if (steamworks) {
      // Loaded lazily so this file never hard-imports the native module.
      const { SteamworksAdapter } = req('./SteamworksAdapter') as typeof import('./SteamworksAdapter');
      return new SteamworksAdapter(steamworks);
    }
  } catch {
    /* not a Steam build — fall through to the null integration */
  }
  return new NullSteamIntegration();
}

export const steam: SteamIntegration = resolveSteam();
