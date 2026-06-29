import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';

import { sfxBank, type SfxName } from './sfxBank';

/**
 * App-wide audio engine.
 *
 * - SFX: one lazily-created, cached {@link AudioPlayer} per sound, replayed by
 *   seeking to 0. Cheap, overlapping-friendly for distinct sounds.
 * - Music: a single looping player with volume fades for clean transitions.
 *
 * All output respects the user's sound/music toggles and volumes (driven by the
 * settings store). Failures are swallowed — audio must never crash gameplay.
 */
class AudioEngine {
  private sfxPlayers = new Map<SfxName, AudioPlayer>();
  private music: AudioPlayer | null = null;
  private musicSource: AudioSource | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  private sfxEnabled = true;
  private musicEnabled = true;
  private sfxVolume = 1;
  private musicVolume = 0.6;
  private initialized = false;

  /** Configure the audio session once at startup. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      });
    } catch {
      /* older/newer option shapes — non-fatal */
    }
  }

  setSfxEnabled(value: boolean): void {
    this.sfxEnabled = value;
  }

  setMusicEnabled(value: boolean): void {
    this.musicEnabled = value;
    if (!value) this.stopMusic();
    else if (this.musicSource) void this.playMusic(this.musicSource);
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = clamp01(value);
  }

  setMusicVolume(value: number): void {
    this.musicVolume = clamp01(value);
    if (this.music) this.music.volume = this.musicVolume;
  }

  /** Fire-and-forget a one-shot sound effect. */
  play(name: SfxName, options?: { volume?: number }): void {
    if (!this.sfxEnabled) return;
    try {
      let player = this.sfxPlayers.get(name);
      if (!player) {
        player = createAudioPlayer(sfxBank[name]);
        this.sfxPlayers.set(name, player);
      }
      player.volume = this.sfxVolume * (options?.volume ?? 1);
      player.seekTo(0);
      player.play();
    } catch {
      /* ignore */
    }
  }

  /**
   * Cross-fade to a looping music bed. Pass the same source to no-op when it is
   * already playing. `source` is typically a `require('...mp3')`.
   */
  async playMusic(source: AudioSource): Promise<void> {
    this.musicSource = source;
    if (!this.musicEnabled) return;
    try {
      this.clearFade();
      // Fade out and release any current track first.
      const previous = this.music;
      const next = createAudioPlayer(source);
      next.loop = true;
      next.volume = 0;
      next.play();
      this.music = next;
      this.fadeTo(next, this.musicVolume, 600, () => {
        if (previous) {
          try {
            previous.remove();
          } catch {
            /* ignore */
          }
        }
      });
    } catch {
      /* ignore */
    }
  }

  /** Fade the current music out and release it. */
  stopMusic(): void {
    const current = this.music;
    if (!current) return;
    this.music = null;
    this.clearFade();
    this.fadeTo(current, 0, 400, () => {
      try {
        current.remove();
      } catch {
        /* ignore */
      }
    });
  }

  private fadeTo(player: AudioPlayer, target: number, durationMs: number, done?: () => void): void {
    const start = player.volume ?? 0;
    const steps = Math.max(1, Math.round(durationMs / 40));
    let i = 0;
    this.clearFade();
    this.fadeTimer = setInterval(() => {
      i += 1;
      const t = i / steps;
      try {
        player.volume = start + (target - start) * t;
      } catch {
        /* ignore */
      }
      if (i >= steps) {
        this.clearFade();
        done?.();
      }
    }, 40);
  }

  private clearFade(): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** The shared audio engine singleton. */
export const Audio = new AudioEngine();
export type { SfxName };
