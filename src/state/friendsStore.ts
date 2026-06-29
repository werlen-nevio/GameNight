import { create } from 'zustand';

import { relayServices } from '../core/network/sharedRelay';
import { socialService } from '../core/social/LocalSocialService';
import type { Friend, FriendState, RecentPlayer } from '../core/social/types';

/**
 * Friends list with live presence. The roster is stored locally; online status
 * and lobby presence stream from the relay (the same data a presence backend
 * would provide), and invites route through it. UI reads only this store.
 */
interface FriendsState {
  friends: Friend[];
  recent: RecentPlayer[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (friend: { id: string; name: string; avatarEmoji: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  block: (id: string) => Promise<void>;
  invite: (friendId: string, lobbyCode: string) => void;
}

let presenceWired = false;

export const useFriendsStore = create<FriendsState>((set, get) => {
  function wirePresence() {
    if (presenceWired) return;
    presenceWired = true;
    relayServices.events.on('presence', ({ id, state, lobbyCode }) => {
      set({
        friends: get().friends.map((f) =>
          f.id === id ? { ...f, state: state as FriendState, lobbyCode: lobbyCode ?? undefined } : f,
        ),
      });
    });
  }

  async function refresh() {
    const [friends, recent] = await Promise.all([socialService.listFriends(), socialService.recentlyPlayed()]);
    set({ friends, recent, loaded: true });
    if (friends.length) relayServices.watch(friends.map((f) => f.id));
  }

  return {
    friends: [],
    recent: [],
    loaded: false,

    load: async () => {
      wirePresence();
      await refresh();
    },
    add: async (friend) => {
      await socialService.addFriend(friend);
      await refresh();
    },
    remove: async (id) => {
      await socialService.removeFriend(id);
      await refresh();
    },
    toggleFavorite: async (id) => {
      const f = get().friends.find((x) => x.id === id);
      await socialService.setFavorite(id, !f?.favorite);
      await refresh();
    },
    block: async (id) => {
      await socialService.block(id);
      await refresh();
    },
    invite: (friendId, lobbyCode) => relayServices.invite(friendId, lobbyCode),
  };
});
