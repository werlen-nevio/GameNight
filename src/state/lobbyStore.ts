import { create } from 'zustand';

import {
  createBotSeat,
  createHumanSeat,
  createYouSeat,
  seatToPlayer,
  type Difficulty,
  type GameConfig,
  type GameModeMeta,
  type GameSession,
  type LobbySeat,
  type PlayMode,
} from '../domain';

const MAX_SEATS = 8;

/** Maps difficulty to bot skill so harder settings field smarter opponents. */
const BOT_SKILL: Record<Difficulty, number> = {
  easy: 0.5,
  medium: 0.7,
  hard: 0.85,
  expert: 0.95,
};

interface LobbyState {
  seats: LobbySeat[];
  difficulty: Difficulty;
  playMode: PlayMode;

  /** Resets the lobby for a mode, seeding the local player as the first seat. */
  init: (args: { youName: string; youAvatarId: string; defaultDifficulty?: Difficulty }) => void;
  addHuman: () => void;
  addBot: () => void;
  removeSeat: (id: string) => void;
  setSeatName: (id: string, name: string) => void;
  setDifficulty: (d: Difficulty) => void;
  setPlayMode: (m: PlayMode) => void;
  /** Builds the immutable session passed into a game. */
  buildSession: (
    mode: GameModeMeta,
    config?: Partial<Omit<GameConfig, 'difficulty' | 'playMode'>> & { seed?: string },
  ) => GameSession;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  seats: [],
  difficulty: 'medium',
  playMode: 'local',

  init: ({ youName, youAvatarId, defaultDifficulty = 'medium' }) =>
    set({
      seats: [createYouSeat(youName, youAvatarId)],
      difficulty: defaultDifficulty,
      playMode: 'local',
    }),

  addHuman: () => {
    const { seats } = get();
    if (seats.length >= MAX_SEATS) return;
    const humanCount = seats.filter((s) => !s.isBot && !s.isYou).length;
    set({ seats: [...seats, createHumanSeat(humanCount)] });
  },

  addBot: () => {
    const { seats, difficulty } = get();
    if (seats.length >= MAX_SEATS) return;
    const botCount = seats.filter((s) => s.isBot).length;
    set({ seats: [...seats, createBotSeat(botCount, BOT_SKILL[difficulty])] });
  },

  removeSeat: (id) =>
    set({ seats: get().seats.filter((s) => s.isYou || s.id !== id) }),

  setSeatName: (id, name) =>
    set({
      seats: get().seats.map((s) => (s.id === id ? { ...s, name: name.slice(0, 14) } : s)),
    }),

  setDifficulty: (difficulty) =>
    set({
      difficulty,
      // keep bot skill in sync with difficulty
      seats: get().seats.map((s) => (s.isBot ? { ...s, botSkill: BOT_SKILL[difficulty] } : s)),
    }),

  setPlayMode: (playMode) => set({ playMode }),

  buildSession: (mode, config) => {
    const { seats, difficulty, playMode } = get();
    return {
      mode,
      players: seats.map((seat, i) => seatToPlayer(seat, i)),
      seed: config?.seed,
      config: {
        playMode,
        difficulty,
        rounds: config?.rounds ?? 5,
        timeLimit: config?.timeLimit ?? 60,
        options: config?.options,
      },
    };
  },
}));
