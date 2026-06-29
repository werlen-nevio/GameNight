/** A product to estimate the price of, in euros. */
export interface PriceItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

/**
 * Everyday products with plausible German retail prices (€). Used by
 * "Der Preis ist heiß". Exact prices vary in reality — closeness is what scores.
 */
export const PRICE_ITEMS: PriceItem[] = [
  { id: 'coffee', name: 'Tasse Kaffee (Café)', emoji: '☕', price: 3.5 },
  { id: 'bigmac', name: 'Big Mac', emoji: '🍔', price: 5.4 },
  { id: 'cinema', name: 'Kinoticket', emoji: '🎟️', price: 12 },
  { id: 'bread', name: 'Brot (Bäcker)', emoji: '🍞', price: 3.2 },
  { id: 'milk', name: 'Liter Milch', emoji: '🥛', price: 1.1 },
  { id: 'iphone', name: 'iPhone (neu)', emoji: '📱', price: 999 },
  { id: 'airpods', name: 'AirPods', emoji: '🎧', price: 149 },
  { id: 'ps5', name: 'PlayStation 5', emoji: '🎮', price: 549 },
  { id: 'pizza', name: 'Pizza (Lieferdienst)', emoji: '🍕', price: 11 },
  { id: 'beer', name: 'Bier (0,5l Kneipe)', emoji: '🍺', price: 4.5 },
  { id: 'haircut', name: 'Herren-Haarschnitt', emoji: '💈', price: 25 },
  { id: 'tshirt', name: 'T-Shirt (Basic)', emoji: '👕', price: 15 },
  { id: 'sneaker', name: 'Sneaker (Marke)', emoji: '👟', price: 120 },
  { id: 'gas', name: 'Liter Benzin', emoji: '⛽', price: 1.8 },
  { id: 'netflix', name: 'Netflix (Monat)', emoji: '📺', price: 14 },
  { id: 'console_game', name: 'Konsolenspiel (neu)', emoji: '💿', price: 70 },
  { id: 'lego', name: 'LEGO-Set (mittel)', emoji: '🧱', price: 60 },
  { id: 'umbrella', name: 'Regenschirm', emoji: '☂️', price: 18 },
  { id: 'pizza_frozen', name: 'Tiefkühlpizza', emoji: '🧊', price: 3 },
  { id: 'taxi', name: 'Taxifahrt (5 km)', emoji: '🚕', price: 15 },
  { id: 'book', name: 'Taschenbuch', emoji: '📖', price: 12 },
  { id: 'plant', name: 'Zimmerpflanze', emoji: '🪴', price: 14 },
  { id: 'watch', name: 'Apple Watch', emoji: '⌚', price: 449 },
  { id: 'bike', name: 'City-Fahrrad', emoji: '🚲', price: 450 },
  { id: 'coffee_machine', name: 'Kaffeemaschine', emoji: '🫖', price: 80 },
  { id: 'pizza_oven', name: 'Mikrowelle', emoji: '📟', price: 90 },
  { id: 'headset', name: 'Gaming-Headset', emoji: '🎙️', price: 80 },
  { id: 'chocolate', name: 'Tafel Schokolade', emoji: '🍫', price: 1.5 },
  { id: 'energy', name: 'Energydrink', emoji: '🥤', price: 1.6 },
  { id: 'flowers', name: 'Blumenstrauß', emoji: '💐', price: 25 },
];
