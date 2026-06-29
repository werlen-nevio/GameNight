// Synthesizes a tasteful SFX bank as 16-bit PCM mono WAV files.
// Pure Node, no deps. Output -> assets/audio/sfx/*.wav
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = path.resolve(__dirname, '../assets/audio/sfx');
fs.mkdirSync(OUT, { recursive: true });

const TAU = Math.PI * 2;
const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

function render(durSec, fn) {
  const N = Math.floor(durSec * SR);
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = fn(i / SR, i, N) || 0;
  return buf;
}

// Envelopes
const adsr = (t, dur, a, d, s, r, sus = 0.7) => {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - sus) * ((t - a) / d);
  if (t < dur - r) return sus;
  if (t < dur) return sus * (1 - (t - (dur - r)) / r);
  return 0;
};
const perc = (t, k = 18) => Math.exp(-t * k); // fast decay
const soft = (t, dur) => Math.sin((Math.min(t, dur) / dur) * Math.PI); // gentle hump

const sine = (f, t) => Math.sin(TAU * f * t);
const tri = (f, t) => (2 / Math.PI) * Math.asin(Math.sin(TAU * f * t));
const sqr = (f, t, duty = 0.5) => (((f * t) % 1) < duty ? 1 : -1);
const noise = () => Math.random() * 2 - 1;

function normalize(buf, peak = 0.85) {
  let m = 0;
  for (const v of buf) m = Math.max(m, Math.abs(v));
  if (m === 0) return buf;
  const g = peak / m;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

function toWav(buf) {
  const N = buf.length;
  const bytes = Buffer.alloc(44 + N * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + N * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); // PCM
  bytes.writeUInt16LE(1, 22); // mono
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) {
    let s = Math.max(-1, Math.min(1, buf[i]));
    bytes.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return bytes;
}

function save(name, buf) {
  fs.writeFileSync(path.join(OUT, name + '.wav'), toWav(normalize(buf)));
  console.log('  ', name + '.wav', (buf.length / SR).toFixed(2) + 's');
}

// --- Sounds ---------------------------------------------------------------

// Soft UI tap
save('tap', render(0.08, (t) => tri(720, t) * perc(t, 55) * 0.5));

// Selection blip
save('select', render(0.1, (t) => sine(880, t) * perc(t, 40) * 0.5 + sine(1320, t) * perc(t, 60) * 0.2));

// Bubble pop (pitch sweep up)
save('pop', render(0.12, (t) => sine(420 + 900 * t * 8, t) * perc(t, 45)));

// Whoosh (filtered noise swell)
save('whoosh', render(0.32, (t, i, N) => noise() * soft(t, N / SR) * 0.6 * (0.3 + 0.7 * (i / N))));

// Coin ding (two bright partials)
save('coin', render(0.34, (t) => {
  const e = perc(t, 9);
  return (sine(1318, t) + 0.6 * sine(1976, t)) * e * 0.5;
}));

// XP blip
save('xp', render(0.16, (t) => (sqr(880, t, 0.25) * 0.3 + sine(1760, t) * 0.3) * perc(t, 26)));

// Correct / success — major arpeggio C E G C
save('success', render(0.5, (t) => {
  const seq = [60, 64, 67, 72];
  const idx = Math.min(seq.length - 1, Math.floor(t / 0.1));
  const f = note(seq[idx]);
  const local = t - idx * 0.1;
  return (sine(f, t) + 0.3 * sine(2 * f, t)) * perc(local, 9) * 0.6;
}));

// Wrong / error — descending detuned buzz
save('error', render(0.42, (t) => {
  const f = 220 - 90 * t;
  return (sqr(f, t, 0.5) * 0.4 + sqr(f * 1.01, t, 0.5) * 0.3) * adsr(t, 0.42, 0.005, 0.05, 0.6, 0.18) * 0.6;
}));

// Countdown tick
save('countdown', render(0.1, (t) => sine(660, t) * perc(t, 50) * 0.6));

// GO! (higher, brighter)
save('go', render(0.3, (t) => (sine(990, t) + 0.4 * sine(1485, t)) * perc(t, 10) * 0.7));

// Level up — ascending sparkle run
save('levelup', render(0.7, (t) => {
  const seq = [60, 64, 67, 72, 76, 79];
  const step = 0.09;
  const idx = Math.min(seq.length - 1, Math.floor(t / step));
  const f = note(seq[idx]);
  const local = t - idx * step;
  return (sine(f, t) + 0.4 * sine(2 * f, t) + 0.15 * sine(3 * f, t)) * perc(local, 11) * 0.55;
}));

// Unlock — shimmer
save('unlock', render(0.55, (t) => {
  let s = 0;
  for (const m of [1, 2.01, 3.02, 4.04]) s += sine(880 * m, t) / m;
  return s * perc(t, 6) * 0.4;
}));

// Victory fanfare — triumphant triad stabs then chord
save('win', render(1.1, (t) => {
  const stabs = [[60], [64], [67], [60, 64, 67, 72]];
  const times = [0, 0.12, 0.24, 0.4];
  let s = 0;
  for (let k = 0; k < stabs.length; k++) {
    if (t >= times[k]) {
      const local = t - times[k];
      const dec = k === 3 ? 4 : 10;
      for (const n of stabs[k]) s += (sine(note(n), t) + 0.3 * sine(2 * note(n), t)) * perc(local, dec);
    }
  }
  return s * 0.32;
}));

// Defeat — gentle descending
save('lose', render(0.9, (t) => {
  const seq = [67, 64, 60, 55];
  const step = 0.18;
  const idx = Math.min(seq.length - 1, Math.floor(t / step));
  const f = note(seq[idx]);
  const local = t - idx * step;
  return (tri(f, t) + 0.2 * sine(f, t)) * perc(local, 6) * 0.5;
}));

// Reveal / tada
save('reveal', render(0.6, (t) => {
  const f = note(72);
  return (sine(f, t) + 0.5 * sine(note(76), t) + 0.5 * sine(note(79), t)) * perc(t, 5) * 0.4;
}));

// Tick (rigid, for timers)
save('beep', render(0.06, (t) => sqr(1000, t, 0.5) * perc(t, 60) * 0.4));

console.log('Done. SFX written to', OUT);
