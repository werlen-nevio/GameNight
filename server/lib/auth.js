'use strict';

const crypto = require('crypto');

/**
 * Stateless, signed session tokens (HMAC-SHA256, JWT-shaped). Any relay node
 * with the shared secret can verify — no database — which is what enables
 * horizontal scaling.
 *
 * Hardening:
 *  - `jti` per token enables **revocation** (logout / ban) via a blocklist.
 *  - `did` binds a token to a **device id** (mismatched device ⇒ rejected).
 *  - short-lived **access** tokens + long-lived **refresh** tokens.
 *  - constant-time signature comparison.
 *
 * Set RELAY_SECRET in production. AUTH_REQUIRED=1 rejects unauthenticated joins.
 * (The revoked-jti set is per-node in-memory; back it with Redis for a cluster.)
 */
const SECRET = process.env.RELAY_SECRET || 'gamenight-dev-secret-change-me';
const ACCESS_TTL_MS = Number(process.env.TOKEN_TTL_MS || 60 * 60 * 1000); // 1h
const REFRESH_TTL_MS = Number(process.env.REFRESH_TTL_MS || 30 * 24 * 60 * 60 * 1000); // 30d

const revoked = new Set();

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sign(payloadObj) {
  const payload = b64url(JSON.stringify(payloadObj));
  const mac = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  return `${payload}.${mac}`;
}
function decode(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, mac] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  } catch {
    return null;
  }
}

function issueToken(persistentId, provider = 'guest', deviceId) {
  return sign({ sub: persistentId, provider, did: deviceId || null, jti: crypto.randomBytes(8).toString('hex'), typ: 'access', exp: Date.now() + ACCESS_TTL_MS });
}
function issueRefresh(persistentId, deviceId) {
  return sign({ sub: persistentId, did: deviceId || null, jti: crypto.randomBytes(8).toString('hex'), typ: 'refresh', exp: Date.now() + REFRESH_TTL_MS });
}

/** Verifies an access token (signature + expiry + not-revoked + device match). */
function verifyToken(token, deviceId) {
  const data = decode(token);
  if (!data || data.typ !== 'access') return null;
  if (!data.exp || data.exp < Date.now()) return null;
  if (data.jti && revoked.has(data.jti)) return null;
  if (data.did && deviceId && data.did !== deviceId) return null;
  return data;
}

/** Exchanges a valid refresh token for a fresh access token. */
function refresh(refreshToken, deviceId) {
  const data = decode(refreshToken);
  if (!data || data.typ !== 'refresh' || !data.exp || data.exp < Date.now()) return null;
  if (data.jti && revoked.has(data.jti)) return null;
  if (data.did && deviceId && data.did !== deviceId) return null;
  return issueToken(data.sub, data.provider || 'guest', deviceId || data.did);
}

/** Revokes a token (by jti). Logout / ban. */
function revoke(jti) {
  if (jti) revoked.add(jti);
}
function jtiOf(token) {
  return decode(token)?.jti ?? null;
}

const AUTH_REQUIRED = process.env.AUTH_REQUIRED === '1';

module.exports = { issueToken, issueRefresh, verifyToken, refresh, revoke, jtiOf, AUTH_REQUIRED };
