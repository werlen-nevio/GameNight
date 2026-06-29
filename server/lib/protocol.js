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
  hello: (m) => isStr(m.room, MAX_ROOM_LEN) && typeof m.create === 'boolean' && isOptStr(m.token, 2048) && isOptStr(m.password) && isOptStr(m.name) && isOptStr(m.persistentId),
  relay: (m) => (m.to === 'all' || m.to === 'host' || isStr(m.to, 64)) && m.msg != null && typeof m.msg === 'object',
  ping: (m) => typeof m.ts === 'number',
  bye: () => true,
  auth: (m) => isOptStr(m.persistentId) && isOptStr(m.name) && isOptStr(m.provider, 40),
  queue: (m) => isStr(m.qtype, 30) && isOptStr(m.modeId, 60),
  dequeue: (m) => isStr(m.ticketId, 64),
  watch: (m) => Array.isArray(m.ids) && m.ids.length <= 200 && m.ids.every((x) => isStr(x, 64)),
  invite: (m) => isStr(m.to, 64) && isStr(m.lobbyCode, MAX_ROOM_LEN),
  kvset: (m) => isStr(m.key, 80) && typeof m.value === 'string' && m.value.length <= MAX_KV_BYTES,
  kvget: (m) => isStr(m.key, 80),
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

module.exports = { parse, MAX_MESSAGE_BYTES };
