import { relayServices } from '../network/sharedRelay';
import type { Player } from '../../domain';

/**
 * Cloud save over the relay's namespaced KV store (per-account). The reference
 * backend is the relay; the same interface maps to Firestore/Supabase/Redis for
 * production. Conflicts resolve last-write-wins by `updatedAt` — adequate for a
 * single-player-account profile; per-field CRDT merge is a drop-in upgrade.
 */
export interface CloudSettings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  sfxVolume: number;
  musicVolume: number;
  reducedMotion: boolean;
}

export interface SaveBlob {
  v: 1;
  updatedAt: number;
  player: Player;
  settings: CloudSettings;
}

const SAVE_KEY = 'save';

export class CloudSaveService {
  get available(): boolean {
    return relayServices.connected;
  }

  async pull(): Promise<SaveBlob | null> {
    const raw = await relayServices.kvGet(SAVE_KEY);
    if (!raw) return null;
    try {
      const blob = JSON.parse(raw) as SaveBlob;
      return blob.v === 1 ? blob : null;
    } catch {
      return null;
    }
  }

  push(blob: SaveBlob): void {
    relayServices.kvSet(SAVE_KEY, JSON.stringify(blob));
  }
}

export const cloudSaveService = new CloudSaveService();
