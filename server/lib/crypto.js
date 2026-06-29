'use strict';

const crypto = require('crypto');

/**
 * Authenticated encryption (AES-256-GCM) for data at rest — cloud saves and any
 * other sensitive values the relay persists. In transit everything is already
 * protected by TLS (wss://); this protects the stored ciphertext so a leaked
 * data file reveals nothing. The key derives from DATA_KEY (or RELAY_SECRET).
 *
 * For a cluster, provision the same DATA_KEY on every node (or a KMS).
 */
const KEY = crypto.createHash('sha256').update(process.env.DATA_KEY || process.env.RELAY_SECRET || 'gamenight-data-key').digest();
const PREFIX = 'enc1:';

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

function decrypt(blob) {
  if (typeof blob !== 'string' || !blob.startsWith(PREFIX)) return blob; // plaintext / legacy
  try {
    const data = Buffer.from(blob.slice(PREFIX.length), 'base64');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const ct = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null; // tampered / wrong key
  }
}

module.exports = { encrypt, decrypt };
