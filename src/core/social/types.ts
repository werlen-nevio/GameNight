/**
 * Social graph contracts. A local implementation ships today (friends stored on
 * device); a presence/server backend can implement the same interface later to
 * power live status, invites and public profiles — without UI changes.
 */
export type FriendState = 'online' | 'offline' | 'in_lobby' | 'playing';

export interface Friend {
  id: string;
  name: string;
  avatarEmoji: string;
  state: FriendState;
  favorite: boolean;
  /** Present when the friend is currently in a joinable lobby. */
  lobbyCode?: string;
}

export interface RecentPlayer {
  id: string;
  name: string;
  avatarEmoji: string;
  lastPlayedAt: number;
}

export interface SocialService {
  listFriends(): Promise<Friend[]>;
  addFriend(friend: { id: string; name: string; avatarEmoji: string }): Promise<void>;
  removeFriend(id: string): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  block(id: string): Promise<void>;
  unblock(id: string): Promise<void>;
  listBlocked(): Promise<string[]>;
  recentlyPlayed(): Promise<RecentPlayer[]>;
  noteRecentlyPlayed(player: { id: string; name: string; avatarEmoji: string }): Promise<void>;
  /** Invite a friend to a lobby (needs a presence backend; no-op locally). */
  invite(friendId: string, lobbyCode: string): Promise<void>;
}
