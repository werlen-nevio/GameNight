'use strict';

/**
 * Namespaced key/value store backing cloud save. This reference implementation
 * is in-memory (optionally file-persisted) and is interface-compatible with a
 * Redis/Postgres/Firestore backend for production — swap the three methods.
 * Values are opaque strings (the client serializes), namespaced by the
 * authenticated persistentId so players can only touch their own data.
 */
const fs = require('fs');

class KvStore {
  constructor(opts = {}) {
    this.map = new Map();
    this.file = opts.file || null;
    if (this.file && fs.existsSync(this.file)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        for (const [k, v] of Object.entries(data)) this.map.set(k, v);
      } catch {
        /* ignore corrupt file */
      }
    }
  }

  key(namespace, key) {
    return `${namespace}::${key}`;
  }

  get(namespace, key) {
    return this.map.get(this.key(namespace, key)) ?? null;
  }

  set(namespace, key, value) {
    this.map.set(this.key(namespace, key), value);
    this.persist();
  }

  persist() {
    if (!this.file) return;
    try {
      fs.writeFileSync(this.file, JSON.stringify(Object.fromEntries(this.map)));
    } catch {
      /* best effort */
    }
  }
}

module.exports = { KvStore };
