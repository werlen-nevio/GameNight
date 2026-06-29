// Stress test: many simultaneous clients in one room + broadcast fan-out,
// plus a large matchmaking burst. Validates the relay holds up under load.
import { WebSocket } from 'ws';
import { createRelayServer } from './relay.js';

const PORT = 8097;
const URL = `ws://localhost:${PORT}`;
const N = Number(process.env.STRESS_N || 40);
let pass = 0,
  fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(URL);
  const inbox = [];
  ws.on('message', (raw) => inbox.push(JSON.parse(raw.toString())));
  return {
    ws,
    inbox,
    open: () => new Promise((r) => ws.on('open', r)),
    send: (m) => ws.send(JSON.stringify(m)),
    take: (t) => inbox.filter((m) => m.t === t),
    last: (t) => [...inbox].reverse().find((m) => m.t === t),
  };
}

async function run() {
  const server = createRelayServer({ port: PORT });
  await wait(150);

  console.log(`Connecting ${N} clients to one lobby`);
  const t0 = Date.now();
  const clients = [];
  const host = client();
  await host.open();
  host.send({ t: 'hello', create: true });
  await wait(60);
  const code = host.last('welcome').code;
  clients.push(host);
  for (let i = 1; i < N; i++) {
    const c = client();
    await c.open();
    c.send({ t: 'hello', room: code, create: false });
    clients.push(c);
    if (i % 8 === 0) await wait(5);
  }
  await wait(400);
  const connected = clients.filter((c) => c.last('welcome')).length;
  ok(connected === N, `all ${N} clients joined (${connected})`);
  console.log(`  · join wall-clock: ${Date.now() - t0}ms`);

  console.log('Broadcast fan-out');
  clients.forEach((c) => (c.inbox.length = 0));
  clients[1].send({ t: 'relay', to: 'all', msg: { v: 1, channel: 'game', type: 'PING', data: 1, ts: Date.now() } });
  await wait(500);
  const received = clients.filter((c, i) => i !== 1 && c.last('msg')?.msg.type === 'PING').length;
  ok(received === N - 1, `broadcast reached all ${N - 1} others (${received})`);

  console.log('Matchmaking burst');
  const queue = [];
  for (let i = 0; i < 16; i++) {
    const c = client();
    await c.open();
    c.send({ t: 'auth', name: 'S' + i });
    queue.push(c);
  }
  await wait(80);
  queue.forEach((c) => c.send({ t: 'queue', qtype: 'quick' }));
  await wait(300);
  const matched = queue.filter((c) => c.last('matched')).length;
  ok(matched === 16, `all 16 queued players matched (${matched})`);

  server.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
