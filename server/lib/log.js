'use strict';

/**
 * Tiny structured logger. JSON lines in production (easy to ship to a log
 * aggregator), level-gated via LOG_LEVEL. No dependencies.
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
const pretty = process.env.LOG_PRETTY === '1';

function emit(level, msg, fields) {
  if (LEVELS[level] > threshold) return;
  const record = { t: new Date().toISOString(), level, msg, ...fields };
  if (pretty) {
    // eslint-disable-next-line no-console
    console.log(`[${level}] ${msg}`, fields ? JSON.stringify(fields) : '');
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(record));
  }
}

module.exports = {
  error: (msg, f) => emit('error', msg, f),
  warn: (msg, f) => emit('warn', msg, f),
  info: (msg, f) => emit('info', msg, f),
  debug: (msg, f) => emit('debug', msg, f),
};
