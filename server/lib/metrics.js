'use strict';

/**
 * In-process metrics. Counters + gauges exposed in a Prometheus-compatible
 * text format at /metrics, plus a JSON snapshot for /health. Horizontal scaling
 * note: each relay node reports its own metrics; an aggregator (or a shared
 * store like Redis) federates them across nodes.
 */
const counters = Object.create(null);
const gauges = Object.create(null);

function inc(name, by = 1) {
  counters[name] = (counters[name] || 0) + by;
}
function setGauge(name, value) {
  gauges[name] = value;
}

function snapshot() {
  return { counters: { ...counters }, gauges: { ...gauges }, uptimeSec: Math.round(process.uptime()) };
}

function prometheus() {
  const lines = [];
  for (const [k, v] of Object.entries(counters)) {
    lines.push(`# TYPE gamenight_${k} counter`, `gamenight_${k} ${v}`);
  }
  for (const [k, v] of Object.entries(gauges)) {
    lines.push(`# TYPE gamenight_${k} gauge`, `gamenight_${k} ${v}`);
  }
  lines.push(`gamenight_uptime_seconds ${Math.round(process.uptime())}`);
  return lines.join('\n') + '\n';
}

module.exports = { inc, setGauge, snapshot, prometheus };
