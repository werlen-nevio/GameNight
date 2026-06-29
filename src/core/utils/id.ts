/**
 * Compact, URL-safe, collision-resistant id generator.
 * Not cryptographically secure — used for local entity ids and lobby codes.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford-ish, no ambiguous chars

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

/** A short opaque id, e.g. for players, matches, inventory entries. */
export function createId(size = 12): string {
  let out = '';
  for (let i = 0; i < size; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** A human-friendly 6-char lobby code (uppercase, unambiguous). */
export function createLobbyCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
