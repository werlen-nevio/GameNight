import type { GradientStops } from '../core/design/gradients';
import { palette } from '../core/design/tokens';
import type { ThemeAccent } from '../core/design/theme';

/** Rarity tiers shared by every cosmetic, driving frame colors and shop sort. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: palette.slate,
  rare: palette.blue,
  epic: palette.violetBright,
  legendary: palette.gold,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Gewöhnlich',
  rare: 'Selten',
  epic: 'Episch',
  legendary: 'Legendär',
};

export interface AvatarDef {
  id: string;
  emoji: string;
  name: string;
  rarity: Rarity;
  background?: GradientStops;
}

export interface FrameDef {
  id: string;
  name: string;
  rarity: Rarity;
  gradient: GradientStops;
}

export interface TitleDef {
  id: string;
  text: string;
  rarity: Rarity;
}

export interface EmoteDef {
  id: string;
  emoji: string;
  label: string;
  rarity: Rarity;
}

export interface ThemeDef {
  id: string;
  name: string;
  rarity: Rarity;
  swatch: GradientStops;
  accent: ThemeAccent;
}

/* ------------------------------------------------------------------ Avatars */

export const AVATARS: AvatarDef[] = [
  { id: 'av_fox', emoji: '🦊', name: 'Fuchs', rarity: 'common' },
  { id: 'av_panda', emoji: '🐼', name: 'Panda', rarity: 'common' },
  { id: 'av_cat', emoji: '🐱', name: 'Katze', rarity: 'common' },
  { id: 'av_dog', emoji: '🐶', name: 'Hund', rarity: 'common' },
  { id: 'av_owl', emoji: '🦉', name: 'Eule', rarity: 'common' },
  { id: 'av_frog', emoji: '🐸', name: 'Frosch', rarity: 'common' },
  { id: 'av_robot', emoji: '🤖', name: 'Roboter', rarity: 'rare' },
  { id: 'av_alien', emoji: '👽', name: 'Alien', rarity: 'rare' },
  { id: 'av_unicorn', emoji: '🦄', name: 'Einhorn', rarity: 'epic' },
  { id: 'av_dragon', emoji: '🐲', name: 'Drache', rarity: 'epic' },
  { id: 'av_ninja', emoji: '🥷', name: 'Ninja', rarity: 'rare' },
  { id: 'av_clown', emoji: '🤡', name: 'Clown', rarity: 'rare' },
  { id: 'av_ghost', emoji: '👻', name: 'Geist', rarity: 'common' },
  { id: 'av_crown', emoji: '👑', name: 'König', rarity: 'legendary' },
  { id: 'av_fire', emoji: '🔥', name: 'Flamme', rarity: 'epic' },
  { id: 'av_star', emoji: '⭐', name: 'Star', rarity: 'rare' },
  { id: 'av_brain', emoji: '🧠', name: 'Genie', rarity: 'epic' },
  { id: 'av_party', emoji: '🥳', name: 'Partytier', rarity: 'common' },
  { id: 'av_goat', emoji: '🐐', name: 'G.O.A.T.', rarity: 'legendary' },
  { id: 'av_devil', emoji: '😈', name: 'Schlingel', rarity: 'rare' },
];

/* ------------------------------------------------------------------- Frames */

export const FRAMES: FrameDef[] = [
  { id: 'fr_none', name: 'Keiner', rarity: 'common', gradient: [palette.slate, palette.slate] },
  { id: 'fr_silver', name: 'Silber', rarity: 'common', gradient: ['#C0C7D6', '#7C8499'] },
  { id: 'fr_ocean', name: 'Ozean', rarity: 'rare', gradient: [palette.cyan, palette.blue] },
  { id: 'fr_sunset', name: 'Sonnenuntergang', rarity: 'rare', gradient: [palette.orange, palette.magenta] },
  { id: 'fr_violet', name: 'Amethyst', rarity: 'epic', gradient: [palette.violetBright, palette.magenta] },
  { id: 'fr_emerald', name: 'Smaragd', rarity: 'epic', gradient: [palette.green, palette.cyan] },
  { id: 'fr_gold', name: 'Gold', rarity: 'legendary', gradient: [palette.gold, palette.orange] },
  { id: 'fr_rainbow', name: 'Regenbogen', rarity: 'legendary', gradient: [palette.magenta, palette.gold, palette.cyan] },
];

/* ------------------------------------------------------------------- Titles */

export const TITLES: TitleDef[] = [
  { id: 'ti_rookie', text: 'Neuling', rarity: 'common' },
  { id: 'ti_player', text: 'Spieler', rarity: 'common' },
  { id: 'ti_quizmaster', text: 'Quizmaster', rarity: 'rare' },
  { id: 'ti_speedster', text: 'Blitzschnell', rarity: 'rare' },
  { id: 'ti_champion', text: 'Champion', rarity: 'epic' },
  { id: 'ti_legend', text: 'Legende', rarity: 'legendary' },
  { id: 'ti_partyking', text: 'Party-König', rarity: 'epic' },
  { id: 'ti_brainiac', text: 'Schlaukopf', rarity: 'rare' },
];

/* ------------------------------------------------------------------- Emotes */

export const EMOTES: EmoteDef[] = [
  { id: 'em_gg', emoji: '👏', label: 'GG!', rarity: 'common' },
  { id: 'em_laugh', emoji: '😂', label: 'Haha', rarity: 'common' },
  { id: 'em_wow', emoji: '😮', label: 'Wow', rarity: 'common' },
  { id: 'em_cry', emoji: '😭', label: 'Nein!', rarity: 'common' },
  { id: 'em_fire', emoji: '🔥', label: 'On Fire', rarity: 'rare' },
  { id: 'em_think', emoji: '🤔', label: 'Hmm', rarity: 'common' },
  { id: 'em_cool', emoji: '😎', label: 'Easy', rarity: 'rare' },
  { id: 'em_rocket', emoji: '🚀', label: 'Let’s go', rarity: 'epic' },
  { id: 'em_crown', emoji: '👑', label: 'Bow', rarity: 'legendary' },
  { id: 'em_clown', emoji: '🤡', label: 'Bruh', rarity: 'rare' },
];

/* ------------------------------------------------------------------- Themes */

export const THEMES: ThemeDef[] = [
  {
    id: 'th_night',
    name: 'Mitternacht',
    rarity: 'common',
    swatch: [palette.violetBright, palette.violetDeep],
    accent: {},
  },
  {
    id: 'th_sunset',
    name: 'Sonnenuntergang',
    rarity: 'rare',
    swatch: [palette.orange, palette.magenta],
    accent: {
      primary: palette.magenta,
      primaryBright: '#FF7AAE',
      primaryDeep: palette.magentaDeep,
      primaryGradient: [palette.orange, palette.magenta],
    },
  },
  {
    id: 'th_aqua',
    name: 'Aqua',
    rarity: 'rare',
    swatch: [palette.cyan, palette.blue],
    accent: {
      primary: palette.cyan,
      primaryBright: '#6BF0E8',
      primaryDeep: palette.cyanDeep,
      primaryGradient: [palette.cyan, palette.blue],
    },
  },
  {
    id: 'th_emerald',
    name: 'Smaragd',
    rarity: 'epic',
    swatch: [palette.green, palette.cyan],
    accent: {
      primary: palette.green,
      primaryBright: '#5BE89A',
      primaryDeep: palette.greenDeep,
      primaryGradient: [palette.green, palette.cyan],
    },
  },
  {
    id: 'th_gold',
    name: 'Königsgold',
    rarity: 'legendary',
    swatch: [palette.gold, palette.orange],
    accent: {
      primary: palette.gold,
      primaryBright: '#FFE07A',
      primaryDeep: palette.goldDeep,
      primaryGradient: [palette.gold, palette.orange],
    },
  },
];

/* ----------------------------------------------------------------- Lookups */

function indexBy<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((i) => [i.id, i]));
}

export const AVATAR_BY_ID = indexBy(AVATARS);
export const FRAME_BY_ID = indexBy(FRAMES);
export const TITLE_BY_ID = indexBy(TITLES);
export const EMOTE_BY_ID = indexBy(EMOTES);
export const THEME_BY_ID = indexBy(THEMES);

/** Cosmetics every player owns from the start. */
export const DEFAULT_INVENTORY = {
  avatars: ['av_fox', 'av_panda', 'av_cat', 'av_party'],
  frames: ['fr_none', 'fr_silver'],
  titles: ['ti_rookie', 'ti_player'],
  emotes: ['em_gg', 'em_laugh', 'em_wow', 'em_cry', 'em_think'],
  themes: ['th_night'],
};

export const DEFAULT_EQUIPPED = {
  avatar: 'av_fox',
  frame: 'fr_silver',
  title: 'ti_rookie',
  theme: 'th_night',
};
