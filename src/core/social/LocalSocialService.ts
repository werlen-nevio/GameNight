import { Storage } from '../services/storage/storage';
import type { Friend, RecentPlayer, SocialService } from './types';

const FRIENDS_KEY = 'social/friends';
const BLOCKED_KEY = 'social/blocked';
const RECENT_KEY = 'social/recent';

/**
 * Device-local social service. Friends, blocks and recently-played are
 * persisted on-device. Live presence and invite delivery are no-ops until a
 * presence backend implements {@link SocialService} — the UI is already written
 * against the interface, so enabling them changes no screens.
 */
export class LocalSocialService implements SocialService {
  async listFriends(): Promise<Friend[]> {
    const blocked = new Set(await this.listBlocked());
    const friends = await Storage.get<Friend[]>(FRIENDS_KEY, []);
    return friends.filter((f) => !blocked.has(f.id));
  }

  async addFriend(friend: { id: string; name: string; avatarEmoji: string }): Promise<void> {
    const friends = await Storage.get<Friend[]>(FRIENDS_KEY, []);
    if (friends.some((f) => f.id === friend.id)) return;
    friends.push({ ...friend, state: 'offline', favorite: false });
    await Storage.set(FRIENDS_KEY, friends);
  }

  async removeFriend(id: string): Promise<void> {
    const friends = await Storage.get<Friend[]>(FRIENDS_KEY, []);
    await Storage.set(FRIENDS_KEY, friends.filter((f) => f.id !== id));
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const friends = await Storage.get<Friend[]>(FRIENDS_KEY, []);
    await Storage.set(FRIENDS_KEY, friends.map((f) => (f.id === id ? { ...f, favorite } : f)));
  }

  async block(id: string): Promise<void> {
    const blocked = await Storage.get<string[]>(BLOCKED_KEY, []);
    if (!blocked.includes(id)) await Storage.set(BLOCKED_KEY, [...blocked, id]);
    await this.removeFriend(id);
  }

  async unblock(id: string): Promise<void> {
    const blocked = await Storage.get<string[]>(BLOCKED_KEY, []);
    await Storage.set(BLOCKED_KEY, blocked.filter((b) => b !== id));
  }

  listBlocked(): Promise<string[]> {
    return Storage.get<string[]>(BLOCKED_KEY, []);
  }

  recentlyPlayed(): Promise<RecentPlayer[]> {
    return Storage.get<RecentPlayer[]>(RECENT_KEY, []);
  }

  async noteRecentlyPlayed(player: { id: string; name: string; avatarEmoji: string }): Promise<void> {
    const recent = await Storage.get<RecentPlayer[]>(RECENT_KEY, []);
    const next = [
      { ...player, lastPlayedAt: Date.now() },
      ...recent.filter((r) => r.id !== player.id),
    ].slice(0, 20);
    await Storage.set(RECENT_KEY, next);
  }

  async invite(_friendId: string, _lobbyCode: string): Promise<void> {
    // Requires a presence backend; intentionally a no-op locally.
  }
}

/** The active social service. Swap this binding to use a backend later. */
export const socialService: SocialService = new LocalSocialService();
