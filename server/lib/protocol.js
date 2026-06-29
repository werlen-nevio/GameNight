'use strict';

/**
 * Strict server-side validation of every inbound client message. The relay
 * never trusts the client: malformed, oversized or unknown messages are
 * rejected before any handler runs.
 */
const MAX_MESSAGE_BYTES = 64 * 1024; // relayed game/lobby payloads
const MAX_ROOM_LEN = 12;
const MAX_STR = 120;
const MAX_KV_BYTES = 256 * 1024; // cloud-save value cap

const isStr = (v, max = MAX_STR) => typeof v === 'string' && v.length > 0 && v.length <= max;
const isOptStr = (v, max = MAX_STR) => v === undefined || (typeof v === 'string' && v.length <= max);

const VALIDATORS = {
  // On create the server assigns the code, so `room` is only required to join.
  hello: (m) =>
    typeof m.create === 'boolean' &&
    (m.create === true || isStr(m.room, MAX_ROOM_LEN)) &&
    isOptStr(m.room, MAX_ROOM_LEN) &&
    isOptStr(m.token, 2048) &&
    isOptStr(m.password) &&
    isOptStr(m.name) &&
    isOptStr(m.persistentId),
  relay: (m) =>
    (m.to === 'all' || m.to === 'host' || isStr(m.to, 64)) &&
    m.msg != null &&
    typeof m.msg === 'object' &&
    (m.seq === undefined || typeof m.seq === 'number'),
  ping: (m) => typeof m.ts === 'number',
  bye: () => true,
  rotate: () => true,
  auth: (m) => isOptStr(m.persistentId) && isOptStr(m.name) && isOptStr(m.provider, 40) && isOptStr(m.token, 2048) && isOptStr(m.deviceId, 80),
  refresh: (m) => isStr(m.refreshToken, 2048) && isOptStr(m.deviceId, 80),
  logout: () => true,
  queue: (m) => isStr(m.qtype, 30) && isOptStr(m.modeId, 60),
  dequeue: (m) => isStr(m.ticketId, 64),
  watch: (m) => Array.isArray(m.ids) && m.ids.length <= 200 && m.ids.every((x) => isStr(x, 64)),
  invite: (m) => isStr(m.to, 64) && isStr(m.lobbyCode, MAX_ROOM_LEN),
  kvset: (m) => isStr(m.key, 80) && typeof m.value === 'string' && m.value.length <= MAX_KV_BYTES,
  kvget: (m) => isStr(m.key, 80),
  match_start: (m) =>
    isStr(m.modeId, 60) &&
    (m.config === undefined || (typeof m.config === 'object' && m.config !== null)) &&
    (m.players === undefined || (Array.isArray(m.players) && m.players.length <= 32 && m.players.every((x) => isStr(x, 64)))) &&
    isOptStr(m.seed, 80),
  match_result: (m) => isStr(m.token, 128) && isStr(m.matchId, 64) && Array.isArray(m.results) && m.results.length <= 32,
};

/** Parses + validates a raw frame. Returns { ok, msg } or { ok:false, error }. */
function parse(raw) {
  if (raw.length > MAX_MESSAGE_BYTES) return { ok: false, error: 'message too large' };
  let m;
  try {
    m = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid json' };
  }
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return { ok: false, error: 'missing type' };
  const validate = VALIDATORS[m.t];
  if (!validate) return { ok: false, error: `unknown type: ${m.t}` };
  if (!validate(m)) return { ok: false, error: `invalid ${m.t}` };
  return { ok: true, msg: m };
}

const TS_WINDOW_MS = 5 * 60 * 1000;

/**
 * Replay / dup / timestamp guard for relayed frames. A monotonically-increasing
 * per-connection `seq` rejects replayed or duplicated frames; the inner message
 * timestamp must be within a sane window. Returns { ok } or { ok:false, error }.
 */
function relayGuard(ws, m) {
  if (typeof m.seq === 'number') {
    if (!Number.isFinite(m.seq)) return { ok: false, error: 'bad_seq' };
    if (ws.lastSeq !== undefined && m.seq <= ws.lastSeq) return { ok: false, error: 'replay_or_dup' };
    ws.lastSeq = m.seq;
  }
  const ts = m.msg && typeof m.msg.ts === 'number' ? m.msg.ts : null;
  if (ts !== null && Math.abs(Date.now() - ts) > TS_WINDOW_MS) return { ok: false, error: 'bad_timestamp' };
  return { ok: true };
}

module.exports = { parse, relayGuard, MAX_MESSAGE_BYTES };
