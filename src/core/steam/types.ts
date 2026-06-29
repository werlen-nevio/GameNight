/**
 * Steam integration contracts. The desktop (Electron/native) build binds these
 * to Steamworks; every other platform gets a null adapter. Designed so the
 * desktop version "seamlessly uses Steam when available" — lobby, friends,
 * invites, rich presence and overlay all route through the same interfaces the
 * cross-platform code already uses, so gameplay never changes.
 */
export interface SteamFriend {
  steamId: string;
  name: string;
  state: 'online' | 'offline' | 'in_game' | 'away';
  avatarUrl?: string;
  lobbyId?: string;
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

/** Steam Datagram Relay / P2P networking — implements the same Transport role. */
export interface SteamNetworking {
  readonly available: boolean;
  /** A Transport-kind hint so the factory can select it. */
  readonly kind: 'steam';
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
}

export interface SteamVoice {
  available: boolean;
  start(): void;
  stop(): void;
}

export interface SteamIntegration {
  readonly available: boolean;
  init(appId?: number): Promise<boolean>;
  shutdown(): void;
  lobbies: SteamLobbies;
  friends: SteamFriendsApi;
  invites: SteamInvites;
  richPresence: SteamRichPresence;
  overlay: SteamOverlay;
  voice: SteamVoice;
}
