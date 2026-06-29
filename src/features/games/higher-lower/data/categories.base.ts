import type { HLCategory } from '../types';

/**
 * Core Higher-or-Lower categories using stable, well-known facts. Values are
 * approximate but internally consistent (only the *ranking* matters for play).
 * Merged with the generated extension in {@link HL_CATEGORIES}.
 */
export const HL_CATEGORIES_BASE: HLCategory[] = [
  {
    id: 'tier_speed',
    name: 'Tiere nach Geschwindigkeit',
    emoji: '🐆',
    unit: 'km/h',
    question: 'Welches Tier ist schneller?',
    items: [
      { id: 'gepard', label: 'Gepard', emoji: '🐆', value: 110 },
      { id: 'falke', label: 'Wanderfalke', emoji: '🦅', value: 320 },
      { id: 'pferd', label: 'Pferd', emoji: '🐎', value: 70 },
      { id: 'hase', label: 'Hase', emoji: '🐇', value: 70 },
      { id: 'elefant', label: 'Elefant', emoji: '🐘', value: 40 },
      { id: 'schnecke', label: 'Schnecke', emoji: '🐌', value: 0.05 },
      { id: 'hai', label: 'Hai', emoji: '🦈', value: 50 },
      { id: 'kolibri', label: 'Kolibri', emoji: '🐦', value: 80 },
      { id: 'gazelle', label: 'Gazelle', emoji: '🦌', value: 90 },
      { id: 'schildkroete', label: 'Schildkröte', emoji: '🐢', value: 3 },
      { id: 'biene', label: 'Biene', emoji: '🐝', value: 28 },
      { id: 'delfin', label: 'Delfin', emoji: '🐬', value: 55 },
    ],
  },
  {
    id: 'land_pop',
    name: 'Länder nach Einwohnern',
    emoji: '🌍',
    unit: 'Mio.',
    question: 'Welches Land hat mehr Einwohner?',
    items: [
      { id: 'indien', label: 'Indien', emoji: '🇮🇳', value: 1430 },
      { id: 'china', label: 'China', emoji: '🇨🇳', value: 1410 },
      { id: 'usa', label: 'USA', emoji: '🇺🇸', value: 335 },
      { id: 'deutschland', label: 'Deutschland', emoji: '🇩🇪', value: 84 },
      { id: 'brasilien', label: 'Brasilien', emoji: '🇧🇷', value: 216 },
      { id: 'japan', label: 'Japan', emoji: '🇯🇵', value: 124 },
      { id: 'island', label: 'Island', emoji: '🇮🇸', value: 0.4 },
      { id: 'nigeria', label: 'Nigeria', emoji: '🇳🇬', value: 223 },
      { id: 'frankreich', label: 'Frankreich', emoji: '🇫🇷', value: 68 },
      { id: 'oesterreich', label: 'Österreich', emoji: '🇦🇹', value: 9 },
      { id: 'russland', label: 'Russland', emoji: '🇷🇺', value: 144 },
      { id: 'australien', label: 'Australien', emoji: '🇦🇺', value: 26 },
    ],
  },
  {
    id: 'building_height',
    name: 'Bauwerke nach Höhe',
    emoji: '🏙️',
    unit: 'm',
    question: 'Welches Bauwerk ist höher?',
    items: [
      { id: 'burj', label: 'Burj Khalifa', emoji: '🏙️', value: 828 },
      { id: 'eiffel', label: 'Eiffelturm', emoji: '🗼', value: 330 },
      { id: 'freiheit', label: 'Freiheitsstatue', emoji: '🗽', value: 93 },
      { id: 'cologne', label: 'Kölner Dom', emoji: '⛪', value: 157 },
      { id: 'pisa', label: 'Turm von Pisa', emoji: '🏛️', value: 56 },
      { id: 'empire', label: 'Empire State Building', emoji: '🏢', value: 381 },
      { id: 'fernsehturm', label: 'Berliner Fernsehturm', emoji: '📡', value: 368 },
      { id: 'pyramide', label: 'Cheops-Pyramide', emoji: '🔺', value: 139 },
      { id: 'tokyo', label: 'Tokyo Skytree', emoji: '🗾', value: 634 },
      { id: 'brandenburg', label: 'Brandenburger Tor', emoji: '🏛️', value: 26 },
    ],
  },
  {
    id: 'food_kcal',
    name: 'Lebensmittel nach Kalorien',
    emoji: '🍔',
    unit: 'kcal/100g',
    question: 'Was hat mehr Kalorien?',
    items: [
      { id: 'gurke', label: 'Gurke', emoji: '🥒', value: 15 },
      { id: 'apfel', label: 'Apfel', emoji: '🍎', value: 52 },
      { id: 'pizza', label: 'Pizza', emoji: '🍕', value: 266 },
      { id: 'schokolade', label: 'Schokolade', emoji: '🍫', value: 546 },
      { id: 'pommes', label: 'Pommes', emoji: '🍟', value: 312 },
      { id: 'banane', label: 'Banane', emoji: '🍌', value: 89 },
      { id: 'butter', label: 'Butter', emoji: '🧈', value: 717 },
      { id: 'reis', label: 'Reis (gekocht)', emoji: '🍚', value: 130 },
      { id: 'ei', label: 'Ei', emoji: '🥚', value: 155 },
      { id: 'salat', label: 'Salat', emoji: '🥗', value: 17 },
    ],
  },
];
