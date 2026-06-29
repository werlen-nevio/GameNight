// Verifies LobbyController host election + migration over the pure
// LoopbackTransport (no React Native in this graph). Bundled with esbuild.
import { LobbyController } from '../src/core/lobby/LobbyController';
import { LoopbackTransport } from '../src/core/transport/LoopbackTransport';
import { sanitizeReport } from '../src/features/games/shared/antiCheat';

let pass = 0,
  fail = 0;
const ok = (c: boolean, m: string) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function make(pid: string, name: string) {
  const net = new LoopbackTransport();
  const ctrl = new LobbyController(net as any, {
    name,
    avatarEmoji: '🙂',
    platform: 'web',
    persistentId: pid,
  });
  return { net, ctrl };
}

async function run() {
  console.log('Join + deterministic host (creator)');
  const a = make('AAA', 'Alice');
  await a.ctrl.connect('ROOM', true);
  const b = make('BBB', 'Bob');
  await b.ctrl.connect('ROOM', false);
  const c = make('CCC', 'Cara');
  await c.ctrl.connect('ROOM', false);
  await tick(40);

  const hostOf = (x: typeof a) => x.ctrl.snapshot().hostPersistentId;
  ok(hostOf(a) === 'AAA' && hostOf(b) === 'AAA' && hostOf(c) === 'AAA', 'all agree host = creator AAA');
  ok(a.ctrl.isHost && !b.ctrl.isHost && !c.ctrl.isHost, 'only creator is host');
  ok(a.ctrl.snapshot().members.length === 3, 'all three members present');

  console.log('Ready propagation');
  b.ctrl.setReady(true);
  await tick(30);
  const bOnA = a.ctrl.snapshot().members.find((m) => m.persistentId === 'BBB');
  ok(bOnA?.ready === true, "Bob's ready is seen by host");

  console.log('Manual host transfer');
  a.ctrl.transferHost('CCC');
  await tick(30);
  ok(hostOf(a) === 'CCC' && hostOf(b) === 'CCC' && hostOf(c) === 'CCC', 'all agree host transferred to CCC');
  ok(c.ctrl.isHost && !a.ctrl.isHost, 'CCC is now host');

  console.log('Abrupt host (CCC) disconnect → convergent migration, no softlock');
  c.net.close(); // abrupt: no graceful leave message
  await tick(40);
  const ha = hostOf(a), hb = hostOf(b);
  ok(ha === hb, 'A and B converge on the same new host');
  ok(ha === 'AAA', 'fallback host is smallest connected id (AAA)');
  ok(a.ctrl.isHost && !b.ctrl.isHost, 'exactly one new host (A)');
  ok(a.ctrl.hostPeerId === a.net.selfId, 'new host peerId resolves to A');

  console.log('Graceful leave removes slot');
  b.ctrl.leave();
  await tick(40);
  ok(a.ctrl.snapshot().members.find((m) => m.persistentId === 'BBB') === undefined, 'Bob removed after leave');

  console.log('Anti-cheat score validation (host never trusts the client)');
  const honest = sanitizeReport({ score: 120, correctAnswers: 6, perfect: false, rounds: 3 }, { scoreCap: 360, rounds: 3 });
  ok(honest.trusted && honest.score === 120, 'honest in-range score accepted');
  const cheat = sanitizeReport({ score: 999999, correctAnswers: 9999, perfect: true, rounds: 3 }, { scoreCap: 360, rounds: 3 });
  ok(!cheat.trusted && cheat.score === 360, 'impossible score clamped to the cap');
  const bad = sanitizeReport({ score: NaN, correctAnswers: -5, perfect: false, rounds: 3 }, { scoreCap: 360, rounds: 3 });
  ok(bad.score === 0 && bad.correctAnswers === 0, 'NaN / negative values rejected to 0');

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
