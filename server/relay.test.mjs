// Comprehensive test of the production relay: routing, host migration, auth,
// validation, rate limiting, password lobbies, presence, invites, matchmaking,
// cloud-save KV and the /health endpoint.
import http from 'node:http';
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
  return {
    ws,
    inbox,
    open: () => new Promise((r) => ws.on('open', r)),
    send: (m) => ws.send(JSON.stringify(m)),
    raw: (s) => ws.send(s),
    last: (t) => [...inbox].reverse().find((m) => m.t === t),
    take: (t) => inbox.filter((m) => m.t === t),
    clear: () => (inbox.length = 0),
  };
}

function getHealth() {
  return new Promise((resolve) => {
    http.get(`http://localhost:${PORT}/health`, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(body) }));
    });
  });
}

async function run() {
  const server = createRelayServer({ port: PORT });
  await wait(150);

  console.log('Routing + host migration');
  const a = client();
  await a.open();
  a.send({ t: 'hello', room: 'ABCDE', create: true });
  await wait(50);
  const aw = a.last('welcome');
  ok(aw?.selfId && aw.hostId === aw.selfId, 'creator gets welcome and is host');
  ok(typeof aw.reconnectToken === 'string', 'welcome carries a reconnect token');
  const aId = aw.selfId;

  const b = client();
  await b.open();
  b.send({ t: 'hello', room: 'ABCDE', create: false });
  await wait(50);
  const bId = b.last('welcome').selfId;
  ok(a.take('join').some((m) => m.id === bId), 'host notified of join');

  a.clear(); b.clear();
  b.send({ t: 'relay', to: 'all', msg: { v: 1, channel: 'game', type: 'X', data: 1, ts: 0 } });
  await wait(40);
  ok(a.last('msg')?.from === bId, 'broadcast routed to host');

  a.clear();
  b.ws.close();
  await wait(40);
  ok(a.take('leave').some((m) => m.id === bId), 'leave broadcast on disconnect');

  console.log('Validation (never trust the client)');
  const v = client();
  await v.open();
  v.raw('not json at all');
  await wait(30);
  ok(v.last('error')?.reason === 'invalid json', 'malformed JSON rejected');
  v.send({ t: 'frobnicate' });
  await wait(30);
  ok(v.last('error')?.reason?.includes('unknown type'), 'unknown type rejected');
  v.send({ t: 'hello', room: '', create: true });
  await wait(30);
  ok(v.last('error')?.reason === 'invalid hello', 'invalid hello rejected');

  console.log('Auth tokens');
  const au = client();
  await au.open();
  au.send({ t: 'auth', name: 'Nevio' });
  await wait(40);
  const authed = au.last('authed');
  ok(authed?.persistentId && authed.token, 'auth issues persistentId + token');
  const au2 = client();
  await au2.open();
  au2.send({ t: 'auth', token: authed.token });
  await wait(40);
  ok(au2.last('authed')?.persistentId === authed.persistentId, 'token re-auth restores same id');

  console.log('Password-protected lobby');
  const h = client();
  await h.open();
  h.send({ t: 'hello', room: 'SECRET', create: true, password: 'hunter2' });
  await wait(40);
  ok(h.last('welcome'), 'host creates password lobby');
  const w = client();
  await w.open();
  w.send({ t: 'hello', room: 'SECRET', create: false, password: 'wrong' });
  await wait(40);
  ok(w.last('error')?.reason === 'wrong_password', 'wrong password rejected');
  const w2 = client();
  await w2.open();
  w2.send({ t: 'hello', room: 'SECRET', create: false, password: 'hunter2' });
  await wait(40);
  ok(w2.last('welcome'), 'correct password admitted');

  console.log('Presence + invites');
  const p1 = client();
  await p1.open();
  p1.send({ t: 'auth', name: 'Alice' });
  await wait(30);
  const p1id = p1.last('authed').persistentId;
  const p2 = client();
  await p2.open();
  p2.send({ t: 'auth', name: 'Bob' });
  await wait(30);
  const p2id = p2.last('authed').persistentId;
  p1.send({ t: 'watch', ids: [p2id] });
  await wait(30);
  ok(p1.take('presence').some((m) => m.id === p2id && m.state === 'online'), 'watch reports friend online');
  p2.send({ t: 'hello', room: 'P2LOBBY', create: true });
  await wait(40);
  ok(p1.take('presence').some((m) => m.id === p2id && m.state === 'in_lobby'), 'presence updates to in_lobby');
  p1.send({ t: 'invite', to: p2id, lobbyCode: 'XYZ12' });
  await wait(40);
  ok(p2.last('invited')?.lobbyCode === 'XYZ12', 'invite delivered to friend');

  console.log('Matchmaking queue');
  const m1 = client();
  await m1.open();
  m1.send({ t: 'auth', name: 'Q1' });
  await wait(20);
  m1.send({ t: 'queue', qtype: 'quick' });
  const m2 = client();
  await m2.open();
  m2.send({ t: 'auth', name: 'Q2' });
  await wait(20);
  m2.send({ t: 'queue', qtype: 'quick' });
  await wait(60);
  const mm1 = m1.last('matched');
  const mm2 = m2.last('matched');
  ok(mm1 && mm2 && mm1.lobbyCode === mm2.lobbyCode, 'two quick-players matched into one lobby');
  ok(mm1.host !== mm2.host, 'exactly one of the matched players is host');

  console.log('Cloud-save KV');
  const kv = client();
  await kv.open();
  kv.send({ t: 'auth', name: 'Saver' });
  await wait(30);
  kv.send({ t: 'kvset', key: 'profile', value: JSON.stringify({ xp: 1234 }) });
  await wait(30);
  kv.send({ t: 'kvget', key: 'profile' });
  await wait(30);
  ok(JSON.parse(kv.last('kv').value).xp === 1234, 'cloud save persists + returns value');

  console.log('Rate limiting');
  const r = client();
  await r.open();
  for (let i = 0; i < 300; i++) r.send({ t: 'ping', ts: i });
  await wait(150);
  ok(r.take('pong').length < 300, 'excess messages are dropped (rate limited)');
  ok(r.last('error')?.reason === 'rate_limited' || r.ws.readyState >= 2, 'abusive client throttled/closed');

  console.log('Health endpoint');
  const health = await getHealth();
  ok(health.status === 200 && health.json.ok === true, '/health returns ok');
  ok(health.json.counters.connections >= 1, 'metrics counters populated');

  server.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
