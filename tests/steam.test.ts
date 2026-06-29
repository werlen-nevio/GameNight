// Verifies the Steam ecosystem's pure logic without a Steam runtime: the null
// adapter's safe surface, progression→Steam stat/achievement sync (idempotent),
// Steam Cloud conflict resolution + round-trip, and the transport-selection
// policy. Bundled with esbuild (no React Native in this graph).
import { NullSteamIntegration } from '../src/core/steam/SteamIntegration';
import {
  STEAM_ACHIEVEMENT_API,
  STEAM_STAT,
  steamStatsFromPlayer,
  syncSteamProgress,
  resolveCloudConflict,
  pushCloudSave,
  pullCloudSave,
  CLOUD_SAVE_FILE,
} from '../src/core/steam/SteamSync';
import { chooseTransportKind } from '../src/core/transport/transportPolicy';
import { createDefaultPlayer } from '../src/domain';
import type { SteamIntegration } from '../src/core/steam/types';

let pass = 0,
  fail = 0;
const ok = (c: boolean, m: string) => (c ? (pass++, console.log('  ✓', m)) : (fail++, console.log('  ✗', m)));

/** A recording fake Steam backend (available=true) for the sync tests. */
function fakeSteam() {
  const ints: Record<string, number> = {};
  const unlocked = new Set<string>();
  const progress: Array<{ api: string; cur: number; max: number }> = [];
  const files: Record<string, string> = {};
  let stored = 0;
  const integration = {
    available: true,
    stats: {
      getInt: (n: string) => ints[n] ?? 0,
      setInt: (n: string, v: number) => ((ints[n] = v), true),
      getFloat: () => 0,
      setFloat: () => true,
      store: () => void stored++,
    },
    achievements: {
      unlock: (a: string) => (unlocked.add(a), true),
      isUnlocked: (a: string) => unlocked.has(a),
      clear: (a: string) => (unlocked.delete(a), true),
      indicateProgress: (api: string, cur: number, max: number) => (progress.push({ api, cur, max }), true),
      list: () => [...unlocked],
      store: () => void stored++,
    },
    cloud: {
      available: true,
      write: (f: string, c: string) => ((files[f] = c), true),
      read: (f: string) => files[f] ?? null,
      delete: (f: string) => (delete files[f], true),
      exists: (f: string) => f in files,
      list: () => Object.keys(files).map((name) => ({ name, size: files[name].length })),
    },
    richPresence: { set: () => {}, clear: () => {} },
  } as unknown as SteamIntegration;
  return { integration, ints, unlocked, progress, files };
}

function run() {
  console.log('Null Steam integration is a safe no-op surface');
  const nul = new NullSteamIntegration();
  ok(nul.available === false, 'null integration reports unavailable');
  ok(nul.achievements.unlock('ACH_X') === false, 'unlock is a safe no-op');
  ok(nul.stats.setInt('STAT_X', 5) === false && nul.stats.getInt('STAT_X') === 0, 'stats no-op');
  ok(nul.cloud.write('f', 'x') === false && nul.cloud.read('f') === null, 'cloud no-op');
  ok(nul.networking.available === false, 'steam networking unavailable off-Steam');
  ok(syncSteamProgress(nul, createDefaultPlayer()).unlocked.length === 0, 'syncing off-Steam unlocks nothing');

  console.log('Stat mapping mirrors the player profile');
  const p = createDefaultPlayer('Tester');
  p.stats.gamesPlayed = 12;
  p.stats.wins = 5;
  p.stats.correctAnswers = 130;
  p.stats.modesPlayed = ['a', 'b', 'c'];
  p.xp = 2500;
  const stats = steamStatsFromPlayer(p);
  ok(stats[STEAM_STAT.gamesPlayed] === 12 && stats[STEAM_STAT.wins] === 5, 'games + wins mapped');
  ok(stats[STEAM_STAT.modesPlayed] === 3, 'modesPlayed mapped to a count');
  ok(stats[STEAM_STAT.xp] === 2500 && stats[STEAM_STAT.level] >= 1, 'xp + derived level mapped');

  console.log('Achievement sync is correct + idempotent');
  const fk = fakeSteam();
  const earned = createDefaultPlayer('Winner');
  earned.unlockedAchievements = ['ach_first_game', 'ach_first_win'];
  earned.stats.gamesPlayed = 1;
  earned.stats.wins = 1;
  const r1 = syncSteamProgress(fk.integration, earned);
  ok(
    r1.unlocked.includes(STEAM_ACHIEVEMENT_API['ach_first_game']) && r1.unlocked.includes(STEAM_ACHIEVEMENT_API['ach_first_win']),
    'earned achievements unlocked on Steam',
  );
  ok(fk.unlocked.has('ACH_FIRST_GAME') && fk.unlocked.has('ACH_FIRST_WIN'), 'Steam API names follow UPPER_SNAKE convention');
  ok(fk.ints[STEAM_STAT.gamesPlayed] === 1, 'stats pushed during sync');
  const r2 = syncSteamProgress(fk.integration, earned);
  ok(r2.unlocked.length === 0, 'second sync re-unlocks nothing (idempotent)');

  console.log('Progress indicators fire for in-flight achievements');
  const fk2 = fakeSteam();
  const grinding = createDefaultPlayer('Grinder');
  grinding.stats.gamesPlayed = 6; // toward ach_10_games (goal 10), not yet unlocked
  syncSteamProgress(fk2.integration, grinding);
  ok(
    fk2.progress.some((x) => x.api === STEAM_ACHIEVEMENT_API['ach_10_games'] && x.cur === 6 && x.max === 10),
    'a 6/10 progress toast is indicated',
  );
  ok(!fk2.progress.some((x) => x.cur >= x.max), 'no progress toast at/over the goal');

  console.log('Steam Cloud conflict resolution favors more progress');
  const local = createDefaultPlayer('Local');
  local.xp = 1000;
  local.stats.gamesPlayed = 10;
  const remote = createDefaultPlayer('Remote');
  remote.xp = 3000;
  remote.stats.gamesPlayed = 4;
  ok(resolveCloudConflict(local, remote) === remote, 'higher-XP remote wins');
  const remoteLowXp = createDefaultPlayer('R2');
  remoteLowXp.xp = 1000;
  remoteLowXp.stats.gamesPlayed = 3;
  ok(resolveCloudConflict(local, remoteLowXp) === local, 'equal/less progress keeps local');
  const tie = createDefaultPlayer('R3');
  tie.xp = 1000;
  tie.stats.gamesPlayed = 25;
  ok(resolveCloudConflict(local, tie) === tie, 'XP tie broken by games played');

  console.log('Steam Cloud round-trips the profile');
  const fk3 = fakeSteam();
  const saved = createDefaultPlayer('Saver');
  saved.xp = 777;
  ok(pushCloudSave(fk3.integration, saved) === true, 'cloud save written');
  ok(CLOUD_SAVE_FILE in fk3.files, 'written under the canonical cloud filename');
  const pulled = pullCloudSave(fk3.integration);
  ok(pulled?.xp === 777 && pulled?.name === 'Saver', 'cloud save reads back intact');

  console.log('Transport selection auto-prefers Steam, then relay, then broadcast');
  ok(chooseTransportKind({ steamAvailable: true, relayUrl: 'ws://x', web: true, broadcastSupported: true }) === 'steam', 'Steam P2P preferred when available');
  ok(chooseTransportKind({ steamAvailable: false, relayUrl: 'ws://x', web: true, broadcastSupported: true }) === 'websocket', 'relay used when configured');
  ok(chooseTransportKind({ steamAvailable: false, relayUrl: null, web: true, broadcastSupported: true }) === 'broadcast', 'broadcast for server-less web');
  ok(chooseTransportKind({ steamAvailable: false, relayUrl: null, web: false, broadcastSupported: false }) === 'loopback', 'loopback fallback');

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

run();
