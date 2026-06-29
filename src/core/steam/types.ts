/**
 * Steam integration contracts. The desktop (native) build binds these to
 * Steamworks (via `steamworks.js`); every other platform gets a null adapter.
 * Designed so the desktop version "seamlessly uses Steam when available" — auth,
 * lobbies, friends, invites, rich presence, overlay, achievements, stats, cloud
 * and P2P networking all route through the same interfaces the cross-platform
 * code already uses, so gameplay never changes.
 */
export interface SteamFriend {
  steamId: string;
  name: string;
  state: 'online' | 'offline' | 'in_game' | 'away';
  avatarUrl?: string;
  lobbyId?: string;
}

/** The signed-in Steam user. */
export interface SteamUser {
  steamId: string;
  persona: string;
  avatarUrl?: string;
  level?: number;
  country?: string;
}

/**
 * Steam auth: identity + a session ticket used to authenticate the player to our
 * own backend (the relay verifies the ticket with Steam's Web API), so we never
 * trust a client-supplied SteamID.
 */
export interface SteamAuthApi {
  user(): SteamUser | null;
  /** A hex-encoded session ticket for server-side validation. */
  sessionTicket(): Promise<string>;
  cancelTicket(): void;
}

export interface SteamLobbies {
  create(opts: { maxMembers: number; privacy: 'public' | 'private' | 'friends' }): Promise<string>;
  join(lobbyId: string): Promise<void>;
  leave(): Promise<void>;
  setData(key: string, value: string): void;
  getData(lobbyId: string, key: string): string | null;
  list(filter?: Record<string, string>): Promise<{ lobbyId: string; members: number }[]>;
  onJoinRequested(handler: (lobbyId: string) => void): () => void;
}

/**
 * Steam P2P / Steam Datagram Relay networking. Exposes the minimal message
 * primitive a {@link import('../transport/types').Transport} is built on, so the
 * factory can auto-select Steam when available and fall back to WebRTC/relay
 * otherwise — gameplay stays transport-independent.
 */
export interface SteamNetworking {
  readonly available: boolean;
  readonly kind: 'steam';
  /** Creates a networked lobby; returns a short join code mapped to the lobby. */
  host(maxMembers: number): Promise<{ lobbyId: string; code: string; selfId: string }>;
  /** Joins by the short code; returns the lobby + existing member ids. */
  joinByCode(code: string): Promise<{ lobbyId: string; selfId: string; members: string[] }>;
  /** Sends a UTF-8 frame to everyone, the host, or a specific member id. */
  send(to: 'all' | 'host' | string, data: string): void;
  onMessage(handler: (fromId: string, data: string) => void): () => void;
  onMember(handler: (ev: { id: string; joined: boolean }) => void): () => void;
  hostId(): string | null;
  leave(): void;
}

export interface SteamFriendsApi {
  me(): Promise<SteamFriend>;
  list(): Promise<SteamFriend[]>;
}

export interface SteamInvites {
  invite(friendSteamId: string, lobbyId: string): void;
  onInvite(handler: (from: SteamFriend, lobbyId: string) => void): () => void;
}

export interface SteamRichPresence {
  set(key: string, value: string): void;
  clear(): void;
}

export interface SteamOverlay {
  available: boolean;
  openInviteDialog(lobbyId: string): void;
  openProfile(steamId: string): void;
  /** Opens an overlay web page (achievements, store, etc.). */
  openWebPage(url: string): void;
  /** Triggers a screenshot through Steam. */
  takeScreenshot(): void;
}

export interface SteamVoice {
  available: boolean;
  start(): void;
  stop(): void;
}

/** Steam Achievements — unlock, query, progress indicators, persistence. */
export interface SteamAchievementsApi {
  unlock(apiName: string): boolean;
  isUnlocked(apiName: string): boolean;
  clear(apiName: string): boolean;
  /** Shows a "x / max" progress toast without unlocking. */
  indicateProgress(apiName: string, current: number, max: number): boolean;
  /** API names of unlocked achievements. */
  list(): string[];
  /** Flushes pending unlocks/progress to Steam. */
  store(): void;
}

/** Steam Stats — int/float counters, persisted to Steam's stat backend. */
export interface SteamStatsApi {
  getInt(name: string): number;
  setInt(name: string, value: number): boolean;
  getFloat(name: string): number;
  setFloat(name: string, value: number): boolean;
  store(): void;
}

export interface SteamCloudFile {
  name: string;
  size: number;
}

/** Steam Cloud — remote save storage, auto-synced by Steam across machines. */
export interface SteamCloudApi {
  readonly available: boolean;
  write(file: string, contents: string): boolean;
  read(file: string): string | null;
  delete(file: string): boolean;
  exists(file: string): boolean;
  list(): SteamCloudFile[];
}

export interface SteamIntegration {
  readonly available: boolean;
  init(appId?: number): Promise<boolean>;
  shutdown(): void;
  /** Pumps Steam callbacks; called on an interval by the host app. */
  runCallbacks(): void;
  auth: SteamAuthApi;
  lobbies: SteamLobbies;
  networking: SteamNetworking;
  friends: SteamFriendsApi;
  invites: SteamInvites;
  richPresence: SteamRichPresence;
  overlay: SteamOverlay;
  voice: SteamVoice;
  achievements: SteamAchievementsApi;
  stats: SteamStatsApi;
  cloud: SteamCloudApi;
}
