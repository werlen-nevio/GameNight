import type { Difficulty } from '../../../domain';

/** Thematic packs categories are grouped into (the "downloadable" sets). */
export type SlfPack =
  | 'classic'
  | 'geography'
  | 'people'
  | 'popculture'
  | 'gaming'
  | 'food'
  | 'nature'
  | 'brands'
  | 'sports'
  | 'science'
  | 'everyday'
  | 'entertainment';

export interface SlfPackInfo {
  id: SlfPack;
  name: string;
  emoji: string;
}

export const SLF_PACKS: SlfPackInfo[] = [
  { id: 'classic', name: 'Klassiker', emoji: '⭐' },
  { id: 'geography', name: 'Geografie', emoji: '🌍' },
  { id: 'people', name: 'Menschen', emoji: '🧑' },
  { id: 'popculture', name: 'Popkultur', emoji: '🎬' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'food', name: 'Essen & Trinken', emoji: '🍔' },
  { id: 'nature', name: 'Natur & Tiere', emoji: '🐾' },
  { id: 'brands', name: 'Marken & Technik', emoji: '🏷️' },
  { id: 'sports', name: 'Sport', emoji: '⚽' },
  { id: 'science', name: 'Wissen', emoji: '🔬' },
  { id: 'everyday', name: 'Alltag', emoji: '🏠' },
  { id: 'entertainment', name: 'Unterhaltung', emoji: '🎤' },
];

/** A single Stadt-Land-Fluss category. */
export interface SlfCategory {
  id: string;
  name: string;
  emoji: string;
  difficulty: Difficulty;
  pack: SlfPack;
}
