'use strict';

const crypto = require('crypto');

/**
 * Stateless session tokens (HMAC-signed, like a minimal JWT). The relay issues
 * a token bound to a player's persistentId; reconnects and account-level calls
 * present it. No database needed — any relay node with the shared secret can
 * verify, which is what enables horizontal scaling.
 *
 * Set RELAY_SECRET in production. AUTH_REQUIRED=1 rejects unauthenticated joins.
 */
const SECRET = process.env.RELAY_SECRET || 'gamenight-dev-secret-change-me';
const TTL_MS = Number(process.env.TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000); // 7 days

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payloadObj) {
  const payload = b64url(JSON.stringify(payloadObj));
  const mac = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  return `${payload}.${mac}`;
}

/** Issues a token for a player. `provider` records how they authenticated. */
function issueToken(persistentId, provider = 'guest') {
  return sign({ sub: persistentId, provider, exp: Date.now() + TTL_MS });
}

/** Verifies a token; returns the payload or null. Constant-time MAC compare. */
function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, mac] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

const AUTH_REQUIRED = process.env.AUTH_REQUIRED === '1';

module.exports = { issueToken, verifyToken, AUTH_REQUIRED };
