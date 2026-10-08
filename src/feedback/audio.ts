import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { SOUND_MANIFEST } from './soundManifest';
import type { SoundCategory, SoundId } from './sounds';
import { settingsStore, type Settings } from '@/state/settings';

interface Pool {
  readonly players: AudioPlayer[];
  next: number;
}

interface LoopState {
  readonly player: AudioPlayer;
  /** Loop-specific level (0–1) before category volume and ducking. */
  level: number;
  fadeTimer?: ReturnType<typeof setInterval>;
}

const categoryVolume = (settings: Settings, category: SoundCategory): number =>
  category === 'music' ? settings.musicVolume : settings.effectsVolume;

/**
 * Centralized audio engine on top of expo-audio.
 * - One-shots come from small round-robin pools so repeats can overlap.
 * - Loops (ambience, foil tension) fade in/out and can be ducked for
 *   cinematic moments.
 * - Respects the iOS silent switch and mixes with other apps' audio.
 * Every call is fire-and-forget and never throws into gameplay code.
 */
class AudioEngine {
  private pools = new Map<SoundId, Pool>();
  private loops = new Map<SoundId, LoopState>();
  private duckFactor = 1;
  private initialized = false;
  private suspended = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
    } catch (error) {
      console.warn('[audio] Could not configure the audio session', error);
    }
    settingsStore.subscribe(() => this.refreshLoopVolumes());
  }

  /** Creates players ahead of time for latency-sensitive moments (e.g. the tear). */
  preload(ids: readonly SoundId[]): void {
    ids.forEach((id) => this.pool(id));
  }

  play(id: SoundId, options: { volume?: number; rate?: number } = {}): void {
    if (this.suspended) return;
    const spec = SOUND_MANIFEST[id];
    if (!spec) return;
    const volume = spec.gain * categoryVolume(settingsStore.get(), spec.category) * (options.volume ?? 1);
    if (volume <= 0.001) return;
    const pool = this.pool(id);
    const player = pool?.players[pool.next];
    if (!pool || !player) return;
    pool.next = (pool.next + 1) % pool.players.length;
    try {
      player.volume = Math.min(1, volume);
      if (options.rate !== undefined) player.setPlaybackRate(options.rate);
      player.seekTo(0).catch(() => undefined);
      player.play();
    } catch (error) {
      console.warn(`[audio] play ${id} failed`, error);
    }
  }

  startLoop(id: SoundId, { level = 1, fadeMs = 600 }: { level?: number; fadeMs?: number } = {}): void {
    const spec = SOUND_MANIFEST[id];
    if (!spec) return;
    let loop = this.loops.get(id);
    if (!loop) {
      try {
        const player = createAudioPlayer(spec.source);
        player.loop = true;
        player.volume = 0;
        loop = { player, level: 0 };
        this.loops.set(id, loop);
      } catch (error) {
        console.warn(`[audio] loop ${id} failed`, error);
        return;
      }
    }
    if (!this.suspended) loop.player.play();
    this.fadeLoop(id, level, fadeMs);
  }

  setLoopLevel(id: SoundId, level: number): void {
    const loop = this.loops.get(id);
    if (!loop) return;
    if (loop.fadeTimer) clearInterval(loop.fadeTimer);
    loop.level = level;
    this.applyLoopVolume(id, loop);
  }

  stopLoop(id: SoundId, fadeMs = 500): void {
    this.fadeLoop(id, 0, fadeMs, () => this.loops.get(id)?.player.pause());
  }

  /** Lowers loops (ambience) for a cinematic moment; 1 restores. */
  duck(factor: number): void {
    this.duckFactor = factor;
    this.refreshLoopVolumes();
  }

  /** App backgrounded: silence everything without losing loop state. */
  suspend(): void {
    this.suspended = true;
    this.loops.forEach((loop) => loop.player.pause());
  }

  resume(): void {
    this.suspended = false;
    this.loops.forEach((loop) => {
      if (loop.level > 0) loop.player.play();
    });
  }

  // ── internals ──────────────────────────────────────────────────────────

  private pool(id: SoundId): Pool | undefined {
    const existing = this.pools.get(id);
    if (existing) return existing;
    const spec = SOUND_MANIFEST[id];
    if (!spec) return undefined;
    try {
      const players = Array.from({ length: spec.voices ?? 1 }, () => createAudioPlayer(spec.source));
      const pool: Pool = { players, next: 0 };
      this.pools.set(id, pool);
      return pool;
    } catch (error) {
      console.warn(`[audio] Could not create players for ${id}`, error);
      return undefined;
    }
  }

  private applyLoopVolume(id: SoundId, loop: LoopState): void {
    const spec = SOUND_MANIFEST[id];
    if (!spec) return;
    const duck = spec.category === 'music' ? this.duckFactor : 1;
    loop.player.volume = Math.min(1, loop.level * spec.gain * categoryVolume(settingsStore.get(), spec.category) * duck);
  }

  private refreshLoopVolumes(): void {
    this.loops.forEach((loop, id) => this.applyLoopVolume(id, loop));
  }

  private fadeLoop(id: SoundId, target: number, ms: number, onDone?: () => void): void {
    const loop = this.loops.get(id);
    if (!loop) return;
    if (loop.fadeTimer) clearInterval(loop.fadeTimer);
    const start = loop.level;
    const steps = Math.max(1, Math.round(ms / 40));
    let step = 0;
    loop.fadeTimer = setInterval(() => {
      step++;
      loop.level = start + ((target - start) * step) / steps;
      this.applyLoopVolume(id, loop);
      if (step >= steps) {
        clearInterval(loop.fadeTimer);
        loop.fadeTimer = undefined;
        onDone?.();
      }
    }, 40);
  }
}

export const audio = new AudioEngine();
