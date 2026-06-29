'use strict';

const crypto = require('crypto');
const log = require('./log');
const metrics = require('./metrics');

const SECRET = process.env.RELAY_SECRET || 'gamenight-dev-secret-change-me';

/**
 * Server-authoritative match validation. The host registers a match (mode +
 * config + roster + seed) and receives a match token; on completion it submits
 * results, which the server **validates and clamps** against the legitimately
 * achievable range per mode, rejects entries from non-roster players, and
 * **signs**. Clients apply rewards only from server-approved+signed results —
 * so a tampered client (or host) cannot grant itself impossible scores.
 */
const CAPS = {
  stadt_land_fluss: (cfg) => (cfg.rounds || 3) * ((cfg.options && cfg.options.count) || 6) * 20,
  millionaire: () => 1_000_000,
  reaction: (cfg) => (cfg.rounds || 4) * 100,
  higher_lower: (cfg) => cfg.rounds || 7,
  guess_price: (cfg) => (cfg.rounds || 5) * 100,
};

function clamp(n, lo, hi) {
  n = Number.isFinite(n) ? n : 0;
  return Math.min(hi, Math.max(lo, n));
}

class Matches {
  constructor() {
    this.matches = new Map(); // matchId -> { modeId, config, players:Set, hostPid, seed, createdAt }
  }

  cap(modeId, config) {
    const fn = CAPS[modeId];
    if (!fn) return Number.MAX_SAFE_INTEGER;
    try {
      return fn(config || {});
    } catch {
      return Number.MAX_SAFE_INTEGER;
    }
  }

  sign(matchId) {
    return crypto.createHmac('sha256', SECRET).update('match:' + matchId).digest('hex');
  }
  signResults(matchId, results) {
    return crypto.createHmac('sha256', SECRET).update('results:' + matchId + ':' + JSON.stringify(results)).digest('hex');
  }

  start(hostPid, { modeId, config, players, seed }) {
    const matchId = crypto.randomBytes(12).toString('hex');
    this.matches.set(matchId, { modeId, config: config || {}, players: new Set(players || []), hostPid, seed, createdAt: Date.now() });
    metrics.inc('matches_started');
    log.info('match started', { matchId, modeId, players: (players || []).length });
    return { matchId, token: this.sign(matchId) };
  }

  /** Validates + clamps + signs results. Returns { ok, results, signature } or error. */
  submit(token, matchId, results) {
    if (this.sign(matchId) !== token) return { ok: false, error: 'bad_match_token' };
    const match = this.matches.get(matchId);
    if (!match) return { ok: false, error: 'unknown_match' };

    const cap = this.cap(match.modeId, match.config);
    const maxCorrect = ((match.config && match.config.rounds) || 0) * 50;
    let cheated = false;

    const approved = (Array.isArray(results) ? results : []).map((r) => {
      const onRoster = match.players.size === 0 || match.players.has(r.persistentId);
      const validScore = Number.isFinite(r.score) && r.score >= 0 && r.score <= cap;
      const validCorrect = Number.isFinite(r.correctAnswers) && r.correctAnswers >= 0 && r.correctAnswers <= maxCorrect;
      const trusted = validScore && validCorrect && onRoster;
      if (!trusted) cheated = true;
      const score = clamp(r.score, 0, cap);
      return {
        persistentId: r.persistentId,
        score,
        correctAnswers: clamp(r.correctAnswers, 0, maxCorrect),
        // `perfect` is only ever granted to a fully trusted submission — a cheater
        // claiming perfect with an impossible (clamped-to-cap) score is denied it.
        perfect: trusted && r.perfect === true && score >= cap,
        trusted,
      };
    });

    if (cheated) {
      metrics.inc('cheat_attempts');
      log.warn('match results clamped (cheat attempt)', { matchId });
    }
    this.matches.delete(matchId);
    metrics.inc('matches_completed');
    return { ok: true, matchId, results: approved, signature: this.signResults(matchId, approved) };
  }
}

module.exports = { Matches };
