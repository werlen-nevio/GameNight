import { Emitter } from '../events/emitter';
import type {
  SteamAchievementsApi,
  SteamAuthApi,
  SteamCloudApi,
  SteamCloudFile,
  SteamFriend,
  SteamFriendsApi,
  SteamIntegration,
  SteamInvites,
  SteamLobbies,
  SteamNetworking,
  SteamOverlay,
  SteamRichPresence,
  SteamStatsApi,
  SteamUser,
  SteamVoice,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Runs `fn`, returning `fallback` (never throwing) if the native call fails. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    const v = fn();
    return v === undefined || v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

/** Hex-encodes raw bytes without depending on Node's Buffer (desktop-safe). */
function toHex(bytes: ArrayLike<number>): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] & 0xff).toString(16).padStart(2, '0');
  return s;
}
const utf8 = {
  encode: (s: string): Uint8Array => new TextEncoder().encode(s),
  decode: (b: ArrayBufferView | ArrayBuffer | number[]): string =>
    new TextDecoder().decode(b instanceof Uint8Array ? b : new Uint8Array(b as number[])),
};

const DEV_APP_ID = 480; // Spacewar — Valve's public test app id.

/**
 * Production Steamworks adapter, binding the same {@link SteamIntegration}
 * surface the cross-platform app already uses to `steamworks.js`.
 *
 * Every native call is defensively wrapped: `steamworks.js`'s module layout has
 * shifted across versions, so we probe for each method and degrade safely rather
 * than crash a shipping desktop build. Off-Steam this class is never constructed
 * (see {@link NullSteamIntegration}); on Steam, `available` reflects whether
 * `init()` succeeded.
 */
export class SteamworksAdapter implements SteamIntegration {
  private steamworks: any;
  private client: any = null;
  private _available = false;
  private lobbyCode = new Map<string, string>(); // code -> lobbyId
  private currentLobby: any = null;
  private net = new Emitter<{ message: { fromId: string; data: string }; member: { id: string; joined: boolean } }>();

  constructor(steamworks: unknown) {
    this.steamworks = steamworks;
  }

  get available(): boolean {
    return this._available;
  }

  async init(appId?: number): Promise<boolean> {
    const id = appId ?? (Number(process.env.STEAM_APP_ID) || DEV_APP_ID);
    this.client = safe(() => this.steamworks.init(id), null);
    this._available = !!this.client;
    return this._available;
  }

  shutdown(): void {
    safe(() => this.steamworks.shutdown?.(), undefined);
    this.client = null;
    this._available = false;
  }

  /** Pump Steam's callback queue (call ~every frame / on an interval). */
  runCallbacks(): void {
    safe(() => this.steamworks.runCallbacks?.(), undefined);
  }

  // ---- auth ----------------------------------------------------------------
  auth: SteamAuthApi = {
    user: (): SteamUser | null => {
      if (!this.client) return null;
      const lp = this.client.localplayer;
      const steamId = safe(() => String(lp.getSteamId().steamId64 ?? lp.getSteamId().accountId), '');
      if (!steamId) return null;
      return {
        steamId,
        persona: safe(() => lp.getName(), 'Player'),
        level: safe(() => lp.getLevel(), undefined as any),
      };
    },
    sessionTicket: async (): Promise<string> => {
      if (!this.client) throw new Error('steam_unavailable');
      // steamworks.js exposes the auth-ticket bytes; we hex-encode for transport.
      const ticket = await safe(
        async () => this.client.auth?.getSessionTicket?.() ?? this.client.auth?.getSessionTicketWithSteamId?.(),
        null as any,
      );
      const bytes: ArrayLike<number> | undefined = ticket?.getBytes?.() ?? ticket?.data ?? ticket;
      if (!bytes) throw new Error('steam_ticket_unavailable');
      return toHex(bytes);
    },
    cancelTicket: (): void => {
      safe(() => this.client?.auth?.cancelAuthTicket?.(), undefined);
    },
  };

  // ---- lobbies -------------------------------------------------------------
  lobbies: SteamLobbies = {
    create: async (opts): Promise<string> => {
      const lobby = await this.client.matchmaking.createLobby(this.lobbyType(opts.privacy), opts.maxMembers);
      this.currentLobby = lobby;
      return String(lobby.id);
    },
    join: async (lobbyId): Promise<void> => {
      this.currentLobby = await this.client.matchmaking.joinLobby(this.asLobbyId(lobbyId));
    },
    leave: async (): Promise<void> => {
      safe(() => this.currentLobby?.leave?.(), undefined);
      this.currentLobby = null;
    },
    setData: (key, value): void => {
      safe(() => this.currentLobby?.setData?.(key, value), undefined);
    },
    getData: (lobbyId, key): string | null => {
      return safe(() => this.currentLobby?.getData?.(key) ?? null, null);
    },
    list: async (): Promise<{ lobbyId: string; members: number }[]> => {
      let lobbies: any[] = [];
      try {
        lobbies = (await this.client.matchmaking.getLobbies?.()) ?? [];
      } catch {
        lobbies = [];
      }
      return lobbies.map((l: any) => ({ lobbyId: String(l.id), members: safe(() => l.getMemberCount?.() ?? 0, 0) }));
    },
    onJoinRequested: (handler): (() => void) => {
      return this.on('lobbyJoinRequested', (ev: any) => handler(String(ev?.lobbyId ?? ev)));
    },
  };

  // ---- P2P networking primitive (Transport is built on this) ---------------
  networking: SteamNetworking = {
    available: true,
    kind: 'steam',
    host: async (maxMembers): Promise<{ lobbyId: string; code: string; selfId: string }> => {
      const lobby = await this.client.matchmaking.createLobby(1 /* friends-only default */, maxMembers);
      this.currentLobby = lobby;
      const code = this.codeFor(String(lobby.id));
      this.lobbyCode.set(code, String(lobby.id));
      safe(() => lobby.setData?.('code', code), undefined);
      this.wireLobbyMessages();
      return { lobbyId: String(lobby.id), code, selfId: this.selfSteamId() };
    },
    joinByCode: async (code): Promise<{ lobbyId: string; selfId: string; members: string[] }> => {
      const lobbyId = this.lobbyCode.get(code.toUpperCase()) ?? code;
      this.currentLobby = await this.client.matchmaking.joinLobby(this.asLobbyId(lobbyId));
      this.wireLobbyMessages();
      const members = safe(
        () => (this.currentLobby.getMembers?.() ?? []).map((m: any) => String(m.steamId64 ?? m)),
        [] as string[],
      );
      return { lobbyId: String(lobbyId), selfId: this.selfSteamId(), members };
    },
    send: (to, data): void => {
      // Reliable, ordered lobby chat messages carry our framed NetMessages.
      const envelope = JSON.stringify({ to, data });
      safe(() => this.currentLobby?.sendChatMessage?.(utf8.encode(envelope)), undefined);
    },
    onMessage: (handler): (() => void) => this.net.on('message', (m) => handler(m.fromId, m.data)),
    onMember: (handler): (() => void) => this.net.on('member', (m) => handler(m)),
    hostId: (): string | null => safe(() => String(this.currentLobby?.getOwner?.().steamId64 ?? null), null),
    leave: (): void => {
      safe(() => this.currentLobby?.leave?.(), undefined);
      this.currentLobby = null;
    },
  };

  /** Bridges Steam lobby chat + membership callbacks into our typed emitter. */
  private wireLobbyMessages(): void {
    this.on('lobbyChatMsg', (ev: any) => {
      const raw = safe(() => utf8.decode(ev?.message ?? ev?.data ?? []), '');
      const from = String(ev?.user?.steamId64 ?? ev?.steamId ?? '');
      if (!raw) return;
      try {
        const env = JSON.parse(raw);
        const self = this.selfSteamId();
        const target = env.to;
        if (target === 'all' || target === self || (target === 'host' && self === this.networking.hostId())) {
          this.net.emit('message', { fromId: from, data: env.data });
        }
      } catch {
        /* ignore malformed lobby chatter */
      }
    });
    this.on('lobbyChatUpdate', (ev: any) => {
      const id = String(ev?.user?.steamId64 ?? ev?.steamId ?? '');
      const joined = (ev?.memberStateChange ?? ev?.state) === 'entered' || ev?.joined === true;
      if (id) this.net.emit('member', { id, joined });
    });
  }

  // ---- friends -------------------------------------------------------------
  friends: SteamFriendsApi = {
    me: async (): Promise<SteamFriend> => {
      const u = this.auth.user();
      if (!u) throw new Error('steam_unavailable');
      return { steamId: u.steamId, name: u.persona, state: 'online', avatarUrl: u.avatarUrl };
    },
    list: async (): Promise<SteamFriend[]> => {
      const friends = safe(() => this.client.friends.getFriends?.(1 /* immediate */) ?? [], [] as any[]);
      return friends.map((f: any) => ({
        steamId: String(safe(() => f.steamId?.steamId64 ?? f.steamId, '')),
        name: safe(() => f.getName?.() ?? f.name, 'Friend'),
        state: this.mapPersonaState(safe(() => f.state ?? f.getState?.(), 'offline')),
      }));
    },
  };

  // ---- invites -------------------------------------------------------------
  invites: SteamInvites = {
    invite: (friendSteamId, lobbyId): void => {
      safe(() => this.client.matchmaking.inviteUserToLobby?.(this.asLobbyId(lobbyId), this.asSteamId(friendSteamId)), undefined);
    },
    onInvite: (handler): (() => void) => {
      return this.on('lobbyInvite', (ev: any) =>
        handler(
          { steamId: String(ev?.user?.steamId64 ?? ev?.from ?? ''), name: safe(() => ev?.user?.getName?.() ?? 'Friend', 'Friend'), state: 'online' },
          String(ev?.lobbyId ?? ''),
        ),
      );
    },
  };

  // ---- rich presence -------------------------------------------------------
  richPresence: SteamRichPresence = {
    set: (key, value): void => {
      safe(() => this.client.friends.setRichPresence?.(key, value), undefined);
    },
    clear: (): void => {
      safe(() => this.client.friends.clearRichPresence?.(), undefined);
    },
  };

  // ---- overlay -------------------------------------------------------------
  overlay: SteamOverlay = {
    available: true,
    openInviteDialog: (lobbyId): void => {
      safe(() => this.client.overlay.activateInviteDialog?.(this.asLobbyId(lobbyId)) ?? this.client.overlay.activateDialog?.('invite'), undefined);
    },
    openProfile: (steamId): void => {
      safe(() => this.client.overlay.activateToUser?.('steamid', this.asSteamId(steamId)), undefined);
    },
    openWebPage: (url): void => {
      safe(() => this.client.overlay.activateToWebPage?.(url), undefined);
    },
    takeScreenshot: (): void => {
      safe(() => this.client.screenshots?.trigger?.(), undefined);
    },
  };

  // ---- voice (Steam voice is optional; gameplay uses WebRTC voice) ----------
  voice: SteamVoice = {
    available: false,
    start: (): void => {
      safe(() => this.client.localplayer?.startVoiceRecording?.(), undefined);
    },
    stop: (): void => {
      safe(() => this.client.localplayer?.stopVoiceRecording?.(), undefined);
    },
  };

  // ---- achievements --------------------------------------------------------
  achievements: SteamAchievementsApi = {
    unlock: (apiName): boolean => safe(() => !!this.client.achievement.activate(apiName), false),
    isUnlocked: (apiName): boolean => safe(() => !!this.client.achievement.isActivated(apiName), false),
    clear: (apiName): boolean => safe(() => !!this.client.achievement.clear(apiName), false),
    indicateProgress: (apiName, current, max): boolean =>
      safe(() => !!(this.client.achievement.indicateProgress?.(apiName, current, max) ?? this.client.stats?.indicateAchievementProgress?.(apiName, current, max)), false),
    list: (): string[] => safe(() => this.client.achievement.names?.() ?? this.client.achievement.getAchievementNames?.() ?? [], [] as string[]),
    store: (): void => {
      safe(() => this.client.stats?.store?.(), undefined);
    },
  };

  // ---- stats ---------------------------------------------------------------
  stats: SteamStatsApi = {
    getInt: (name): number => safe(() => Number(this.client.stats?.getInt?.(name) ?? 0), 0),
    setInt: (name, value): boolean => safe(() => !!this.client.stats?.setInt?.(name, Math.trunc(value)), false),
    getFloat: (name): number => safe(() => Number(this.client.stats?.getFloat?.(name) ?? 0), 0),
    setFloat: (name, value): boolean => safe(() => !!this.client.stats?.setFloat?.(name, value), false),
    store: (): void => {
      safe(() => this.client.stats?.store?.(), undefined);
    },
  };

  // ---- cloud ---------------------------------------------------------------
  cloud: SteamCloudApi = {
    available: true,
    write: (file, contents): boolean => safe(() => !!this.client.cloud.writeFile(file, contents), false),
    read: (file): string | null => safe(() => this.client.cloud.readFile(file) ?? null, null),
    delete: (file): boolean => safe(() => !!this.client.cloud.deleteFile(file), false),
    exists: (file): boolean => safe(() => !!this.client.cloud.fileExists(file), false),
    list: (): SteamCloudFile[] =>
      safe(
        () => (this.client.cloud.listFiles?.() ?? []).map((f: any) => ({ name: String(f.name ?? f), size: Number(f.size ?? 0) })),
        [] as SteamCloudFile[],
      ),
  };

  // ---- helpers -------------------------------------------------------------
  private on(event: string, handler: (ev: any) => void): () => void {
    safe(() => this.client?.[event === 'lobbyChatMsg' || event === 'lobbyChatUpdate' || event.startsWith('lobby') ? 'matchmaking' : 'friends']?.on?.(event, handler), undefined);
    safe(() => this.steamworks?.on?.(event, handler), undefined);
    return () => safe(() => this.steamworks?.removeListener?.(event, handler), undefined);
  }

  private selfSteamId(): string {
    return this.auth.user()?.steamId ?? '';
  }
  private lobbyType(privacy: 'public' | 'private' | 'friends'): number {
    return privacy === 'public' ? 2 : privacy === 'friends' ? 1 : 0; // private/friends/public
  }
  private asLobbyId(id: string): any {
    return safe<any>(() => BigInt(id), id);
  }
  private asSteamId(id: string): any {
    return safe<any>(() => BigInt(id), id);
  }
  private mapPersonaState(s: any): SteamFriend['state'] {
    const v = String(s).toLowerCase();
    if (v.includes('game') || v === '6' || v === '5') return 'in_game';
    if (v.includes('away') || v.includes('snooze') || v === '3' || v === '4') return 'away';
    if (v.includes('online') || v === '1') return 'online';
    return 'offline';
  }
  /** A short, human-shareable code derived deterministically from the lobby id. */
  private codeFor(lobbyId: string): string {
    const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let h = 2166136261;
    for (let i = 0; i < lobbyId.length; i++) {
      h ^= lobbyId.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    let c = '';
    for (let i = 0; i < 6; i++) {
      c += A[h % A.length];
      h = Math.floor(h / A.length) || (h ^ (h >>> 3)) >>> 0;
    }
    return c;
  }
}
