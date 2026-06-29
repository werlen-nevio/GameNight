import { Audio } from './audio/AudioService';
import { Haptics } from './haptics/haptics';

/**
 * Multi-sensory feedback: pairs a haptic with its matching sound so call sites
 * express *intent* ("this was a confirmation") instead of wiring two systems.
 */
export const Feedback = {
  /** Light press on secondary/ghost controls. */
  tap(): void {
    Haptics.light();
    Audio.play('tap');
  },
  /** Selecting an option, toggling a chip. */
  select(): void {
    Haptics.tick();
    Audio.play('select');
  },
  /** Primary button confirmation. */
  press(): void {
    Haptics.medium();
    Audio.play('pop');
  },
  /** Screen / step transition. */
  whoosh(): void {
    Audio.play('whoosh');
  },
  /** A correct answer / good outcome. */
  success(): void {
    Haptics.success();
    Audio.play('success');
  },
  /** A wrong answer / bad outcome. */
  error(): void {
    Haptics.error();
    Audio.play('error');
  },
  /** Earning coins. */
  coin(): void {
    Haptics.light();
    Audio.play('coin');
  },
  /** Earning XP. */
  xp(): void {
    Audio.play('xp');
  },
  /** Leveling up. */
  levelUp(): void {
    Haptics.success();
    Audio.play('levelup');
  },
  /** Unlocking a reward / shop item. */
  unlock(): void {
    Haptics.success();
    Audio.play('unlock');
  },
  /** Winning a match. */
  win(): void {
    Haptics.success();
    Audio.play('win');
  },
  /** Losing a match. */
  lose(): void {
    Haptics.warning();
    Audio.play('lose');
  },
  /** A dramatic reveal (answer, prize). */
  reveal(): void {
    Haptics.medium();
    Audio.play('reveal');
  },
  /** A countdown tick. */
  tick(): void {
    Haptics.tick();
    Audio.play('countdown');
  },
  /** The final "GO". */
  go(): void {
    Haptics.heavy();
    Audio.play('go');
  },
};
