import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin, typed persistence layer over AsyncStorage.
 *
 * Everything is namespaced under `@gamenight/` so the app never collides with
 * other storage and can be wiped wholesale (e.g. a "reset progress" action).
 * Values are JSON-serialized; reads are forgiving (return a fallback on any
 * parse/IO error) so a corrupt key can never crash startup.
 */
const PREFIX = '@gamenight/';

function k(key: string): string {
  return PREFIX + key;
}

export const Storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(k(key));
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(k(key), JSON.stringify(value));
    } catch {
      // Best-effort: a failed write should never crash gameplay.
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(k(key));
    } catch {
      /* ignore */
    }
  },

  /** Removes every GameNight key — used by "reset all progress". */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((key) => key.startsWith(PREFIX));
      if (ours.length) await AsyncStorage.multiRemove(ours);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Adapter exposing the AsyncStorage interface zustand's `persist` middleware
 * expects (`getItem`/`setItem`/`removeItem` returning strings).
 */
export const zustandStorage = {
  getItem: (name: string) => AsyncStorage.getItem(k(name)),
  setItem: (name: string, value: string) => AsyncStorage.setItem(k(name), value),
  removeItem: (name: string) => AsyncStorage.removeItem(k(name)),
};
