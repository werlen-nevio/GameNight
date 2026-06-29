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

module.exports = { RateLimiter };
