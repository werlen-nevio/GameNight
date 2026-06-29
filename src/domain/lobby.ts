import { createId } from '../core/utils/id';
import { AVATAR_BY_ID, AVATARS } from './cosmetics';
import { PLAYER_COLORS, type GamePlayer } from './game';

/** A configurable seat in the pre-game lobby (local pass-and-play). */
export interface LobbySeat {
  id: string;
  name: string;
  avatarId: string;
  isBot: boolean;
  isYou: boolean;
  botSkill: number;
}

const BOT_NAMES = ['Bot Max', 'Bot Luna', 'Bot Rex', 'Bot Nova', 'Bot Zoe', 'Bot Ada', 'Bot Kai'];
const HUMAN_NAMES = ['Spieler 2', 'Spieler 3', 'Spieler 4', 'Spieler 5', 'Spieler 6'];

/** Creates the local player's seat from their profile. */
export function createYouSeat(name: string, avatarId: string): LobbySeat {
  return { id: createId(), name, avatarId, isBot: false, isYou: true, botSkill: 1 };
}

/** Creates an additional human seat (pass-and-play). */
export function createHumanSeat(index: number): LobbySeat {
  return {
    id: createId(),
    name: HUMAN_NAMES[index % HUMAN_NAMES.length],
    avatarId: AVATARS[(index + 4) % AVATARS.length].id,
    isBot: false,
    isYou: false,
    botSkill: 1,
  };
}

/** Creates a bot seat with a difficulty-derived skill. */
export function createBotSeat(index: number, skill = 0.7): LobbySeat {
  return {
    id: createId(),
    name: BOT_NAMES[index % BOT_NAMES.length],
    avatarId: AVATARS[(index + 6) % AVATARS.length].id,
    isBot: true,
    isYou: false,
    botSkill: skill,
  };
}

/** Resolves a lobby seat into a match {@link GamePlayer}, assigning a seat color. */
export function seatToPlayer(seat: LobbySeat, index: number): GamePlayer {
  return {
    id: seat.id,
    name: seat.name,
    emoji: AVATAR_BY_ID[seat.avatarId]?.emoji ?? '🙂',
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    isBot: seat.isBot,
    isYou: seat.isYou,
    botSkill: seat.isBot ? seat.botSkill : undefined,
  };
}
