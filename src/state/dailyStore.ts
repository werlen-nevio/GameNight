import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '../core/services/storage/storage';
import { dateKey } from '../core/utils/format';

interface DailyState {
  /** dateKeys on which the daily challenge was completed. */
  completedDates: string[];
  isCompleted: (key?: string) => boolean;
  markCompleted: (key?: string) => void;
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      completedDates: [],
      isCompleted: (key = dateKey()) => get().completedDates.includes(key),
      markCompleted: (key = dateKey()) => {
        if (get().completedDates.includes(key)) return;
        // Keep only the most recent ~60 entries to bound storage.
        const next = [...get().completedDates, key].slice(-60);
        set({ completedDates: next });
      },
    }),
    {
      name: 'daily',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
