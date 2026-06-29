// Adversarial security test suite — treats every client as malicious.
//
// Covers: replay attacks, packet injection, invalid signatures, spam / temp
// mute, lobby enumeration, token expiry / revocation / device binding, host
// migration (rotate) exploits, reward exploits, fake score submissions and
// encryption-at-rest. Unit-level checks hit the server libs directly; the
// end-to-end checks drive the real relay over WebSockets.
import crypto from 'node:crypto';
import { WebSocket } from 'ws';

// Pin the secret so the unit tests can craft known-signed (and deliberately
// expired / tampered) tokens against the same key the libs use.
process.env.RELAY_SECRET = 'security-test-secret';
process.env.DATA_KEY = 'security-test-data-key';

const auth = (await import('./lib/auth.js')).default ?? (await import('./lib/auth.js'));
const { Matches } = await import('./lib/matches.js');
const { encrypt, decrypt } = await import('./lib/crypto.js');
const protocol = await import('./lib/protocol.js');
const { createRelayServer } = await import('./relay.js');

const PORT = 8097;
const URL = `ws://localhost:${PORT}`;
let pass = 0,
  fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SECRET = process.env.RELAY_SECRET;
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function craftToken(payloadObj) {
  const payload = b64url(JSON.stringify(payloadObj));
  const mac = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  return `${payload}.${mac}`;
}

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

async function run() {
  // ---- Auth: invalid signatures, expiry, revocation, device binding --------
  console.log('Auth tokens (invalid signatures / expiry / revocation / device binding)');
  const good = auth.issueToken('PID-1', 'guest', 'device-A');
  ok(auth.verifyToken(good, 'device-A')?.sub === 'PID-1', 'valid signed token verifies');

  const tampered = good.slice(0, -3) + (good.slice(-3) === 'aaa' ? 'bbb' : 'aaa');
  ok(auth.verifyToken(tampered) === null, 'tampered signature rejected');
  ok(auth.verifyToken('garbage.notatoken') === null, 'forged/garbage token rejected');
  ok(auth.verifyToken(craftToken({ sub: 'X', typ: 'access', exp: Date.now() + 1000 }) + 'x') === null, 'token with mutated mac rejected');

  // A perfectly-signed but expired token must still be rejected.
  const expired = craftToken({ sub: 'PID-1', provider: 'guest', did: null, jti: 'j1', typ: 'access', exp: Date.now() - 1000 });
  ok(auth.verifyToken(expired) === null, 'expired (but validly signed) token rejected');

  // A refresh token may not be used where an access token is required.
  const refreshTok = auth.issueRefresh('PID-1', 'device-A');
  ok(auth.verifyToken(refreshTok) === null, 'refresh token rejected as an access token');
  ok(auth.refresh(refreshTok, 'device-A'), 'valid refresh token mints a new access token');
  ok(auth.refresh(good, 'device-A') === null, 'access token rejected at the refresh endpoint');

  // Device binding: a token stolen onto another device is rejected.
  ok(auth.verifyToken(good, 'device-B') === null, 'device-bound token rejected on a different device');

  // Revocation (logout / ban).
  const toRevoke = auth.issueToken('PID-2', 'guest', 'device-C');
  ok(auth.verifyToken(toRevoke, 'device-C')?.sub === 'PID-2', 'token valid before revocation');
  auth.revoke(auth.jtiOf(toRevoke));
  ok(auth.verifyToken(toRevoke, 'device-C') === null, 'revoked token rejected');

  // ---- Message validation: packet injection -------------------------------
  console.log('Message validation (packet injection)');
  ok(protocol.parse('not json').ok === false, 'malformed JSON rejected');
  ok(protocol.parse(JSON.stringify({ t: 'frobnicate' })).error.includes('unknown type'), 'unknown message type rejected');
  ok(protocol.parse(JSON.stringify({ t: 'relay', to: 'all' })).ok === false, 'relay without a body rejected');
  ok(protocol.parse(JSON.stringify({ t: 'hello', create: false })).ok === false, 'join without a code rejected');
  ok(protocol.parse('x'.repeat(70 * 1024)).error === 'message too large', 'oversized payload rejected');
  ok(protocol.parse(JSON.stringify({ t: 'kvset', key: 'k', value: 'x'.repeat(300 * 1024) })).ok === false, 'oversized cloud-save value rejected');

  // ---- Replay / dup / impossible-timestamp guard --------------------------
  console.log('Replay / duplicate / impossible-timestamp guard');
  const fakeWs = {};
  const frame = (seq, ts) => ({ t: 'relay', to: 'all', seq, msg: { v: 1, channel: 'game', type: 'X', data: 1, ts } });
  ok(protocol.relayGuard(fakeWs, frame(1, Date.now())).ok === true, 'first frame (seq 1) accepted');
  ok(protocol.relayGuard(fakeWs, frame(2, Date.now())).ok === true, 'monotonic frame (seq 2) accepted');
  ok(protocol.relayGuard(fakeWs, frame(2, Date.now())).error === 'replay_or_dup', 'duplicate seq rejected (replay)');
  ok(protocol.relayGuard(fakeWs, frame(1, Date.now())).error === 'replay_or_dup', 'older seq rejected (replay)');
  ok(protocol.relayGuard({}, frame(1, Date.now() - 10 * 60 * 1000)).error === 'bad_timestamp', 'impossible (stale) timestamp rejected');
  ok(protocol.relayGuard({}, frame(1, Date.now() + 10 * 60 * 1000)).error === 'bad_timestamp', 'impossible (future) timestamp rejected');

  // ---- Anti-cheat: reward exploits / fake score submissions ---------------
  console.log('Server-authoritative anti-cheat (reward exploits / fake scores)');
  const matches = new Matches();
  const { matchId, token } = matches.start('HOST', { modeId: 'reaction', config: { rounds: 4 }, players: ['HOST', 'GUEST'], seed: 's' });
  const cap = 4 * 100; // reaction cap

  const honest = matches.submit(token, matchId, [{ persistentId: 'HOST', score: 250, correctAnswers: 4, perfect: false }]);
  ok(honest.ok && honest.results[0].score === 250 && honest.results[0].trusted, 'honest in-range score accepted unchanged');
  ok(typeof honest.signature === 'string' && honest.signature.length === 64, 'approved results are HMAC-signed');

  const { matchId: m2, token: t2 } = matches.start('HOST', { modeId: 'reaction', config: { rounds: 4 }, players: ['HOST'], seed: 's' });
  const cheat = matches.submit(t2, m2, [{ persistentId: 'HOST', score: 9_999_999, correctAnswers: 9999, perfect: true }]);
  ok(cheat.ok && cheat.results[0].score === cap, 'impossible score clamped to the per-mode cap');
  ok(cheat.results[0].trusted === false && cheat.results[0].perfect === false, 'cheated entry flagged untrusted, perfect denied');

  const { matchId: m3, token: t3 } = matches.start('HOST', { modeId: 'reaction', config: { rounds: 4 }, players: ['HOST'], seed: 's' });
  const roster = matches.submit(t3, m3, [{ persistentId: 'INTRUDER', score: 100, correctAnswers: 1, perfect: false }]);
  ok(roster.results[0].trusted === false, 'score from a non-roster player flagged untrusted');

  // Forged / fake match tokens and unknown matches.
  ok(matches.submit('deadbeef', matchId, []).error === 'bad_match_token', 'forged match token rejected');
  const { matchId: m4, token: t4 } = matches.start('HOST', { modeId: 'reaction', config: { rounds: 4 }, players: [], seed: 's' });
  ok(matches.submit(t4, m4, [{ persistentId: 'HOST', score: 10, correctAnswers: 1 }]).ok, 'legit submission accepted');
  ok(matches.submit(t4, m4, [{ persistentId: 'HOST', score: 10, correctAnswers: 1 }]).error === 'unknown_match', 'results replay rejected (match consumed once)');

  // ---- Encryption at rest --------------------------------------------------
  console.log('Encryption at rest (AES-256-GCM)');
  const secret = JSON.stringify({ xp: 4242, coins: 100, gems: 9 });
  const blob = encrypt(secret);
  ok(blob.startsWith('enc1:') && !blob.includes('4242'), 'ciphertext is prefixed and hides the plaintext');
  ok(decrypt(blob) === secret, 'round-trips back to the original plaintext');
  const corrupt = blob.slice(0, -4) + (blob.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
  ok(decrypt(corrupt) === null, 'tampered ciphertext fails authentication (returns null)');
  ok(encrypt('x') !== encrypt('x'), 'random IV ⇒ identical plaintext encrypts differently');

  // ---- End-to-end over the real relay -------------------------------------
  const server = createRelayServer({ port: PORT });
  await wait(150);

  console.log('Lobby enumeration is infeasible (internal id never exposed)');
  const host = client();
  await host.open();
  host.send({ t: 'hello', room: 'GUESSME', create: true });
  await wait(50);
  const welcome = host.last('welcome');
  ok(welcome && welcome.internalId === undefined, 'welcome never carries the internal lobby id');
  ok(welcome.code && welcome.code !== 'GUESSME', 'client-suggested code is ignored; server assigns its own');

  const scanner = client();
  await scanner.open();
  let found = 0;
  for (const guess of ['AAAAAAAA', '11111111', 'ABCDEFGH', '23456789', welcome.code.toLowerCase()]) {
    scanner.clear();
    scanner.send({ t: 'hello', room: guess, create: false });
    await wait(25);
    if (scanner.last('welcome')) found++;
  }
  ok(found === 0, 'enumerating random codes never lands in a lobby');

  console.log('Replay attack over the wire (duplicate seq dropped by relay)');
  const r1 = client();
  await r1.open();
  r1.send({ t: 'hello', room: 'ROOMA', create: true });
  await wait(40);
  const codeA = r1.last('welcome').code;
  const r2 = client();
  await r2.open();
  r2.send({ t: 'hello', room: codeA, create: false });
  await wait(40);
  r1.clear();
  const gframe = (seq) => ({ t: 'relay', to: 'all', seq, msg: { v: 1, channel: 'game', type: 'MOVE', data: 1, ts: Date.now() } });
  r2.send(gframe(1));
  r2.send(gframe(1)); // replay same seq
  r2.send(gframe(2));
  r2.send(gframe(2)); // replay same seq
  await wait(60);
  ok(r1.take('msg').length === 2, 'relay delivered only the 2 fresh frames, dropped the 2 replays');

  console.log('Spam protection (per-type cooldown ⇒ automatic temp mute)');
  const spammer = client();
  await spammer.open();
  spammer.send({ t: 'hello', room: 'ROOMB', create: true });
  await wait(40);
  const codeB = spammer.last('welcome').code;
  const peer = client();
  await peer.open();
  peer.send({ t: 'hello', room: codeB, create: false });
  await wait(40);
  spammer.clear();
  for (let i = 1; i <= 12; i++) {
    spammer.send({ t: 'relay', to: 'all', seq: i, msg: { v: 1, channel: 'chat', type: 'chat', text: 'spam', ts: Date.now() } });
  }
  await wait(80);
  ok(spammer.last('error')?.reason === 'temp_muted', 'chat flood triggers an automatic temp mute');

  console.log('Host-migration / rotate exploit (only the host may rotate the code)');
  const rh = client();
  await rh.open();
  rh.send({ t: 'hello', room: 'ROOMC', create: true });
  await wait(40);
  const codeC = rh.last('welcome').code;
  const rp = client();
  await rp.open();
  rp.send({ t: 'hello', room: codeC, create: false });
  await wait(40);
  rp.clear();
  rp.send({ t: 'rotate' }); // non-host attempts to rotate
  await wait(40);
  ok(rp.last('rotated') === undefined, 'non-host rotate request is ignored');
  rh.clear();
  rh.send({ t: 'rotate' }); // host rotates
  await wait(40);
  const rotated = rh.last('rotated');
  ok(rotated && rotated.code && rotated.code !== codeC, 'host rotate issues a fresh share code');
  const stale = client();
  await stale.open();
  stale.send({ t: 'hello', room: codeC, create: false }); // old code must be dead
  await wait(40);
  ok(stale.last('error')?.reason === 'lobby_not_found', 'the rotated-away (old) code no longer resolves');

  console.log('Packet injection over the wire (forged match result)');
  const inj = client();
  await inj.open();
  inj.send({ t: 'auth', name: 'Injector' });
  await wait(40);
  inj.send({ t: 'match_result', token: 'forged-token', matchId: 'nope', results: [{ persistentId: 'X', score: 1 }] });
  await wait(40);
  ok(inj.last('error')?.reason === 'bad_match_token', 'forged match-result token rejected by the relay');

  console.log('Cloud-save is encrypted at rest (server stores ciphertext)');
  const saver = client();
  await saver.open();
  saver.send({ t: 'auth', name: 'Saver' });
  await wait(40);
  const saverId = saver.last('authed').persistentId;
  saver.send({ t: 'kvset', key: 'profile', value: JSON.stringify({ secretXp: 31337 }) });
  await wait(40);
  const rawStored = server.kv.map.get(`${saverId}::profile`);
  ok(typeof rawStored === 'string' && rawStored.startsWith('enc1:') && !rawStored.includes('31337'), 'value is stored as ciphertext, not plaintext');
  saver.send({ t: 'kvget', key: 'profile' });
  await wait(40);
  ok(JSON.parse(saver.last('kv').value).secretXp === 31337, 'authorized owner reads back their own decrypted value');

  server.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
