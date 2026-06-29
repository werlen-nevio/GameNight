// End-to-end test of the reference relay server using real WebSocket clients.
import { WebSocket } from 'ws';
import { createRelayServer } from './relay.js';

const PORT = 8099;
const URL = `ws://localhost:${PORT}`;
let pass = 0,
  fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(URL);
  const inbox = [];
  ws.on('message', (raw) => inbox.push(JSON.parse(raw.toString())));
  const api = {
    ws,
    inbox,
    open: () => new Promise((r) => ws.on('open', r)),
    send: (m) => ws.send(JSON.stringify(m)),
    take: (t) => inbox.filter((m) => m.t === t),
    last: (t) => [...inbox].reverse().find((m) => m.t === t),
    clear: () => (inbox.length = 0),
  };
  return api;
}

async function run() {
  const server = createRelayServer({ port: PORT });
  await wait(150);

  console.log('Lobby join + host assignment');
  const a = client();
  await a.open();
  a.send({ t: 'hello', room: 'ABCDE', create: true });
  await wait(60);
  const aWelcome = a.last('welcome');
  ok(aWelcome && aWelcome.selfId, 'A receives welcome with selfId');
  ok(aWelcome.hostId === aWelcome.selfId, 'A (creator) is host');
  const aId = aWelcome.selfId;

  const b = client();
  await b.open();
  b.send({ t: 'hello', room: 'ABCDE', create: false });
  await wait(60);
  const bWelcome = b.last('welcome');
  ok(bWelcome.peers.includes(aId), 'B sees A already in room');
  ok(bWelcome.hostId === aId, 'B sees A as host');
  ok(a.take('join').some((m) => m.id === bWelcome.selfId), 'A notified of B join');
  const bId = bWelcome.selfId;

  const c = client();
  await c.open();
  c.send({ t: 'hello', room: 'ABCDE', create: false });
  await wait(60);
  const cId = c.last('welcome').selfId;

  console.log('Message routing');
  a.clear(); b.clear(); c.clear();
  const payload = { v: 1, channel: 'game', type: 'PlayerAnswered', data: { x: 1 }, ts: 1 };
  b.send({ t: 'relay', to: 'all', msg: payload });
  await wait(60);
  ok(a.last('msg')?.from === bId && a.last('msg')?.msg.type === 'PlayerAnswered', 'broadcast reaches A');
  ok(c.last('msg')?.from === bId, 'broadcast reaches C');
  ok(b.take('msg').length === 0, 'broadcast does NOT echo to sender B');

  a.clear(); b.clear(); c.clear();
  c.send({ t: 'relay', to: 'host', msg: { ...payload, type: 'ToHost' } });
  await wait(60);
  ok(a.last('msg')?.msg.type === 'ToHost', "to:'host' reaches host A");
  ok(b.take('msg').length === 0, "to:'host' does not reach B");

  a.clear(); b.clear(); c.clear();
  a.send({ t: 'relay', to: cId, msg: { ...payload, type: 'Direct' } });
  await wait(60);
  ok(c.last('msg')?.msg.type === 'Direct', 'direct message reaches target C');
  ok(b.take('msg').length === 0, 'direct message does not reach others');

  console.log('Ping / pong');
  a.clear();
  a.send({ t: 'ping', ts: 12345 });
  await wait(60);
  ok(a.last('pong')?.ts === 12345, 'pong echoes ping timestamp');

  console.log('Host migration on host disconnect');
  b.clear(); c.clear();
  a.ws.close();
  await wait(120);
  ok(b.take('leave').some((m) => m.id === aId), 'B notified A left');
  const newHost = b.last('host');
  ok(newHost && (newHost.id === bId || newHost.id === cId), 'a new host is promoted');

  server.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
