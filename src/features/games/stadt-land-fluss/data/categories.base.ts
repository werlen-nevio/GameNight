import type { SlfCategory } from '../types';

/**
 * Hand-curated core categories. The full set ({@link SLF_CATEGORIES}) merges
 * these with the larger generated pack so the mode is fully playable on its own.
 */
export const SLF_CATEGORIES_BASE: SlfCategory[] = [
  // Classic
  { id: 'land', name: 'Land', emoji: '🌍', difficulty: 'easy', pack: 'classic' },
  { id: 'stadt', name: 'Stadt', emoji: '🏙️', difficulty: 'easy', pack: 'classic' },
  { id: 'fluss', name: 'Fluss', emoji: '🏞️', difficulty: 'medium', pack: 'classic' },
  { id: 'tier', name: 'Tier', emoji: '🐯', difficulty: 'easy', pack: 'classic' },
  { id: 'beruf', name: 'Beruf', emoji: '👷', difficulty: 'easy', pack: 'classic' },
  { id: 'name', name: 'Name', emoji: '🪪', difficulty: 'easy', pack: 'classic' },
  { id: 'pflanze', name: 'Pflanze', emoji: '🌱', difficulty: 'medium', pack: 'classic' },
  { id: 'farbe', name: 'Farbe', emoji: '🎨', difficulty: 'easy', pack: 'classic' },

  // Geography
  { id: 'hauptstadt', name: 'Hauptstadt', emoji: '🏛️', difficulty: 'medium', pack: 'geography' },
  { id: 'insel', name: 'Insel', emoji: '🏝️', difficulty: 'hard', pack: 'geography' },
  { id: 'gebirge', name: 'Gebirge', emoji: '⛰️', difficulty: 'hard', pack: 'geography' },
  { id: 'see', name: 'See', emoji: '🌊', difficulty: 'medium', pack: 'geography' },
  { id: 'kontinent', name: 'Kontinent', emoji: '🗺️', difficulty: 'easy', pack: 'geography' },

  // People
  { id: 'fussballspieler', name: 'Fußballspieler', emoji: '⚽', difficulty: 'medium', pack: 'people' },
  { id: 'streamer', name: 'Streamer', emoji: '📺', difficulty: 'medium', pack: 'people' },
  { id: 'youtuber', name: 'YouTuber', emoji: '▶️', difficulty: 'medium', pack: 'people' },
  { id: 'saenger', name: 'Sänger:in', emoji: '🎤', difficulty: 'medium', pack: 'people' },
  { id: 'schauspieler', name: 'Schauspieler:in', emoji: '🎭', difficulty: 'medium', pack: 'people' },
  { id: 'promi', name: 'Promi', emoji: '🌟', difficulty: 'easy', pack: 'people' },

  // Pop culture
  { id: 'film', name: 'Film', emoji: '🎬', difficulty: 'easy', pack: 'popculture' },
  { id: 'serie', name: 'Serie', emoji: '📺', difficulty: 'easy', pack: 'popculture' },
  { id: 'anime', name: 'Anime', emoji: '🌸', difficulty: 'medium', pack: 'popculture' },
  { id: 'superheld', name: 'Superheld', emoji: '🦸', difficulty: 'medium', pack: 'popculture' },
  { id: 'disney', name: 'Disney-Figur', emoji: '🏰', difficulty: 'medium', pack: 'popculture' },

  // Gaming
  { id: 'game', name: 'Videospiel', emoji: '🎮', difficulty: 'easy', pack: 'gaming' },
  { id: 'pokemon', name: 'Pokémon', emoji: '⚡', difficulty: 'medium', pack: 'gaming' },
  { id: 'gamechar', name: 'Spielfigur', emoji: '🕹️', difficulty: 'hard', pack: 'gaming' },
  { id: 'konsole', name: 'Konsole', emoji: '🎛️', difficulty: 'medium', pack: 'gaming' },

  // Food
  { id: 'essen', name: 'Essen', emoji: '🍔', difficulty: 'easy', pack: 'food' },
  { id: 'getraenk', name: 'Getränk', emoji: '🥤', difficulty: 'easy', pack: 'food' },
  { id: 'obst', name: 'Obst', emoji: '🍎', difficulty: 'easy', pack: 'food' },
  { id: 'gemuese', name: 'Gemüse', emoji: '🥦', difficulty: 'easy', pack: 'food' },
  { id: 'suessigkeit', name: 'Süßigkeit', emoji: '🍬', difficulty: 'medium', pack: 'food' },

  // Nature & animals
  { id: 'vogel', name: 'Vogel', emoji: '🐦', difficulty: 'medium', pack: 'nature' },
  { id: 'fisch', name: 'Fisch', emoji: '🐟', difficulty: 'medium', pack: 'nature' },
  { id: 'insekt', name: 'Insekt', emoji: '🐞', difficulty: 'medium', pack: 'nature' },
  { id: 'baum', name: 'Baum', emoji: '🌳', difficulty: 'medium', pack: 'nature' },

  // Brands & tech
  { id: 'marke', name: 'Marke', emoji: '®️', difficulty: 'easy', pack: 'brands' },
  { id: 'firma', name: 'Firma', emoji: '🏢', difficulty: 'easy', pack: 'brands' },
  { id: 'auto', name: 'Automarke', emoji: '🚗', difficulty: 'easy', pack: 'brands' },
  { id: 'app', name: 'App', emoji: '📱', difficulty: 'easy', pack: 'brands' },
  { id: 'webseite', name: 'Webseite', emoji: '🌐', difficulty: 'medium', pack: 'brands' },

  // Sports
  { id: 'sport', name: 'Sportart', emoji: '🏅', difficulty: 'easy', pack: 'sports' },
  { id: 'verein', name: 'Sportverein', emoji: '🛡️', difficulty: 'medium', pack: 'sports' },

  // Science
  { id: 'element', name: 'Chem. Element', emoji: '⚗️', difficulty: 'hard', pack: 'science' },
  { id: 'planet', name: 'Planet/Mond', emoji: '🪐', difficulty: 'hard', pack: 'science' },
  { id: 'koerperteil', name: 'Körperteil', emoji: '💪', difficulty: 'easy', pack: 'science' },

  // Everyday
  { id: 'kleidung', name: 'Kleidungsstück', emoji: '👕', difficulty: 'easy', pack: 'everyday' },
  { id: 'moebel', name: 'Möbelstück', emoji: '🛋️', difficulty: 'easy', pack: 'everyday' },
  { id: 'schulfach', name: 'Schulfach', emoji: '📚', difficulty: 'easy', pack: 'everyday' },
  { id: 'werkzeug', name: 'Werkzeug', emoji: '🔧', difficulty: 'medium', pack: 'everyday' },
  { id: 'kuechending', name: 'Küchengerät', emoji: '🍳', difficulty: 'medium', pack: 'everyday' },

  // Entertainment
  { id: 'band', name: 'Band', emoji: '🎸', difficulty: 'medium', pack: 'entertainment' },
  { id: 'instrument', name: 'Instrument', emoji: '🎻', difficulty: 'medium', pack: 'entertainment' },
  { id: 'brettspiel', name: 'Brettspiel', emoji: '🎲', difficulty: 'medium', pack: 'entertainment' },
  { id: 'emoji_thing', name: 'Etwas mit Emoji', emoji: '😀', difficulty: 'easy', pack: 'entertainment' },
];
