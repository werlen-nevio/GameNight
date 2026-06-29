'use strict';

/**
 * Per-connection token-bucket rate limiting on both message count and bytes.
 * Cheap, allocation-free steady state. Abusive connections are throttled
 * (messages dropped) and, past a hard burst, flagged for disconnect.
 */
class RateLimiter {
  constructor(opts = {}) {
    this.msgRate = opts.msgRate ?? 50; // messages/sec sustained
    this.msgBurst = opts.msgBurst ?? 100;
    this.byteRate = opts.byteRate ?? 256 * 1024; // bytes/sec sustained
    this.byteBurst = opts.byteBurst ?? 512 * 1024;
    this.msgTokens = this.msgBurst;
    this.byteTokens = this.byteBurst;
    this.last = Date.now();
    this.violations = 0;
  }

  refill() {
    const now = Date.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    this.msgTokens = Math.min(this.msgBurst, this.msgTokens + dt * this.msgRate);
    this.byteTokens = Math.min(this.byteBurst, this.byteTokens + dt * this.byteRate);
  }

  /** Returns true if the message is allowed; false if it should be dropped. */
  allow(bytes) {
    this.refill();
    if (this.msgTokens < 1 || this.byteTokens < bytes) {
      this.violations += 1;
      return false;
    }
    this.msgTokens -= 1;
    this.byteTokens -= bytes;
    return true;
  }

  /** True when the connection has abused the limit enough to be dropped. */
  get shouldDisconnect() {
    return this.violations > 40;
  }
}

/**
 * Per-message-type cooldowns with automatic temporary muting. Protects against
 * chat/emote/invite/join spam and throttles voice signaling, independently of
 * the global byte/packet {@link RateLimiter}.
 */
const COOLDOWN_MS = {
  chat: 400,
  emote: 250,
  invite: 2000,
  join: 800,
  voice: 25,
  default: 0,
};
const MUTE_THRESHOLD = 6; // consecutive violations of one kind
const MUTE_MS = 10_000;

class Cooldowns {
  constructor() {
    this.last = Object.create(null);
    this.violations = Object.create(null);
    this.mutedUntil = Object.create(null);
  }

  /** Returns { ok } or { ok:false, reason } for a message of the given kind. */
  check(kind) {
    const now = Date.now();
    if (this.mutedUntil[kind] && this.mutedUntil[kind] > now) return { ok: false, reason: 'muted' };
    const min = COOLDOWN_MS[kind] ?? COOLDOWN_MS.default;
    if (min === 0) return { ok: true };
    const since = now - (this.last[kind] || 0);
    if (since < min) {
      this.violations[kind] = (this.violations[kind] || 0) + 1;
      if (this.violations[kind] >= MUTE_THRESHOLD) {
        this.mutedUntil[kind] = now + MUTE_MS;
        this.violations[kind] = 0;
        return { ok: false, reason: 'temp_muted' };
      }
      return { ok: false, reason: 'cooldown' };
    }
    this.last[kind] = now;
    this.violations[kind] = 0;
    return { ok: true };
  }
}

module.exports = { RateLimiter, Cooldowns };
