/**
 * Deterministic, seedable RNG utilities.
 *
 * A seeded generator matters here: the Daily Challenge must produce the *same*
 * puzzle for every player on a given date, and online matches must be able to
 * replay the same question order from a shared seed.
 */

/** mulberry32 — tiny, fast, good-enough-for-games PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hashes an arbitrary string into a 32-bit seed (e.g. a date or lobby code). */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A small, ergonomic RNG wrapper. Pass a seed for reproducibility, or omit it
 * for a `Math.random`-backed instance.
 */
export class Rng {
  private next: () => number;

  constructor(seed?: number | string) {
    if (seed === undefined) {
      this.next = Math.random;
    } else {
      const s = typeof seed === 'string' ? hashSeed(seed) : seed;
      this.next = mulberry32(s);
    }
  }

  /** Float in [0, 1). */
  float(): number {
    return this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** True with the given probability (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** A uniformly random element. Returns undefined for an empty array. */
  pick<T>(arr: readonly T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** A new array, Fisher–Yates shuffled (does not mutate the input). */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** `count` distinct random elements (or all, shuffled, if count exceeds length). */
  sample<T>(arr: readonly T[], count: number): T[] {
    return this.shuffle(arr).slice(0, Math.max(0, count));
  }
}

/** A shared, non-deterministic RNG for casual one-off needs. */
export const rng = new Rng();
