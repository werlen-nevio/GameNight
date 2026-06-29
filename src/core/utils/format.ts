/** Formatting helpers for numbers, time and dates used across the UI. */

/** 1234 -> "1.2K", 1_500_000 -> "1.5M". Keeps small numbers intact. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) return String(value);
  if (abs < 1_000_000) return trim(value / 1000) + 'K';
  if (abs < 1_000_000_000) return trim(value / 1_000_000) + 'M';
  return trim(value / 1_000_000_000) + 'B';
}

function trim(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
}

/** 1234 -> "1.234" (thousands separated, de-DE style). */
export function groupNumber(value: number): string {
  return Math.round(value).toLocaleString('de-DE');
}

/** Seconds -> "M:SS" (e.g. 95 -> "1:35"). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Milliseconds -> "1.23s" for reaction-time results. */
export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Local date key "YYYY-MM-DD", used to seed/identify Daily Challenges. */
export function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
