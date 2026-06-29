import {
  AVATAR_BY_ID,
  EMOTE_BY_ID,
  FRAME_BY_ID,
  THEME_BY_ID,
  TITLE_BY_ID,
  type Rarity,
} from './cosmetics';

/** The two soft/hard currencies. */
export type Currency = 'coins' | 'gems';

/** Cosmetic categories that can be sold in the shop. */
export type CosmeticKind = 'avatar' | 'frame' | 'title' | 'emote' | 'theme';

export interface ShopItem {
  id: string;
  /** References the cosmetic id of the matching `kind`. */
  cosmeticId: string;
  kind: CosmeticKind;
  name: string;
  rarity: Rarity;
  price: number;
  currency: Currency;
  /** Featured items surface in the shop hero carousel. */
  featured?: boolean;
}

const PRICE_BY_RARITY: Record<Rarity, { coins: number; gems: number }> = {
  common: { coins: 300, gems: 0 },
  rare: { coins: 900, gems: 0 },
  epic: { coins: 2500, gems: 20 },
  legendary: { coins: 0, gems: 80 },
};

/** Builds a shop entry for a cosmetic, pricing it from its rarity. */
function priceItem(
  id: string,
  kind: CosmeticKind,
  name: string,
  rarity: Rarity,
  opts?: { featured?: boolean; currency?: Currency },
): ShopItem {
  const currency: Currency = opts?.currency ?? (rarity === 'legendary' ? 'gems' : 'coins');
  const base = PRICE_BY_RARITY[rarity];
  return {
    id: `shop_${id}`,
    cosmeticId: id,
    kind,
    name,
    rarity,
    price: currency === 'gems' ? base.gems || 50 : base.coins || 500,
    currency,
    featured: opts?.featured,
  };
}

/**
 * The shop catalogue. Derived from the cosmetic definitions so adding a
 * cosmetic + listing it here is all it takes to sell it. Items the player
 * already owns are filtered out at the UI layer.
 */
export const SHOP_ITEMS: ShopItem[] = [
  priceItem('av_robot', 'avatar', 'Roboter', 'rare'),
  priceItem('av_unicorn', 'avatar', 'Einhorn', 'epic', { featured: true }),
  priceItem('av_dragon', 'avatar', 'Drache', 'epic'),
  priceItem('av_crown', 'avatar', 'König', 'legendary', { featured: true }),
  priceItem('av_goat', 'avatar', 'G.O.A.T.', 'legendary'),
  priceItem('av_brain', 'avatar', 'Genie', 'epic'),
  priceItem('av_fire', 'avatar', 'Flamme', 'epic'),
  priceItem('fr_ocean', 'frame', 'Ozean-Rahmen', 'rare'),
  priceItem('fr_sunset', 'frame', 'Sonnenuntergang-Rahmen', 'rare'),
  priceItem('fr_violet', 'frame', 'Amethyst-Rahmen', 'epic'),
  priceItem('fr_emerald', 'frame', 'Smaragd-Rahmen', 'epic'),
  priceItem('fr_gold', 'frame', 'Gold-Rahmen', 'legendary', { featured: true }),
  priceItem('fr_rainbow', 'frame', 'Regenbogen-Rahmen', 'legendary'),
  priceItem('th_sunset', 'theme', 'Theme: Sonnenuntergang', 'rare', { featured: true }),
  priceItem('th_aqua', 'theme', 'Theme: Aqua', 'rare'),
  priceItem('th_emerald', 'theme', 'Theme: Smaragd', 'epic'),
  priceItem('th_gold', 'theme', 'Theme: Königsgold', 'legendary'),
  priceItem('em_fire', 'emote', 'Emote: On Fire', 'rare'),
  priceItem('em_cool', 'emote', 'Emote: Easy', 'rare'),
  priceItem('em_rocket', 'emote', 'Emote: Let’s go', 'epic'),
  priceItem('em_crown', 'emote', 'Emote: Bow', 'legendary'),
  priceItem('ti_champion', 'title', 'Titel: Champion', 'epic'),
  priceItem('ti_partyking', 'title', 'Titel: Party-König', 'epic'),
];

/** Resolves the display emoji/swatch for a shop item, by kind. */
export function cosmeticPreview(item: ShopItem): { emoji?: string; text?: string } {
  switch (item.kind) {
    case 'avatar':
      return { emoji: AVATAR_BY_ID[item.cosmeticId]?.emoji };
    case 'emote':
      return { emoji: EMOTE_BY_ID[item.cosmeticId]?.emoji };
    case 'title':
      return { text: TITLE_BY_ID[item.cosmeticId]?.text };
    case 'frame':
      return { emoji: '🖼️' };
    case 'theme':
      return { emoji: '🎨' };
    default:
      return {};
  }
}

export { FRAME_BY_ID, THEME_BY_ID };
