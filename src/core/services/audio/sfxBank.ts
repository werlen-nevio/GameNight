/**
 * The SFX bank: logical sound names mapped to bundled audio assets.
 * Adding a sound is a one-line change here; the rest of the app refers to
 * sounds only by their {@link SfxName}.
 */
export const sfxBank = {
  tap: require('../../../../assets/audio/sfx/tap.wav'),
  select: require('../../../../assets/audio/sfx/select.wav'),
  pop: require('../../../../assets/audio/sfx/pop.wav'),
  whoosh: require('../../../../assets/audio/sfx/whoosh.wav'),
  coin: require('../../../../assets/audio/sfx/coin.wav'),
  xp: require('../../../../assets/audio/sfx/xp.wav'),
  success: require('../../../../assets/audio/sfx/success.wav'),
  error: require('../../../../assets/audio/sfx/error.wav'),
  countdown: require('../../../../assets/audio/sfx/countdown.wav'),
  go: require('../../../../assets/audio/sfx/go.wav'),
  levelup: require('../../../../assets/audio/sfx/levelup.wav'),
  unlock: require('../../../../assets/audio/sfx/unlock.wav'),
  win: require('../../../../assets/audio/sfx/win.wav'),
  lose: require('../../../../assets/audio/sfx/lose.wav'),
  reveal: require('../../../../assets/audio/sfx/reveal.wav'),
  beep: require('../../../../assets/audio/sfx/beep.wav'),
} as const;

export type SfxName = keyof typeof sfxBank;
