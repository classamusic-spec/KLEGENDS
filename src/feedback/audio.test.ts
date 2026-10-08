/** A mock player that rejects out-of-range volumes, as browsers do. */
const players: { volume: number; playing: boolean }[] = [];

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => {
    let volume = 1;
    const player = {
      loop: false,
      playing: false,
      get volume() {
        return volume;
      },
      set volume(v: number) {
        if (!(v >= 0 && v <= 1)) throw new Error(`volume out of range: ${v}`);
        volume = v;
      },
      play() {
        player.playing = true;
      },
      pause() {
        player.playing = false;
      },
      seekTo: () => Promise.resolve(),
      setPlaybackRate: () => undefined,
    };
    players.push(player);
    return player;
  }),
}));

import { audio } from './audio';

describe('audio loops', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fades out to exactly zero, pauses, and stops its timer', () => {
    audio.startLoop('ambient_hall_loop', { level: 0.7, fadeMs: 1500 });
    jest.advanceTimersByTime(1600);
    audio.stopLoop('ambient_hall_loop', 800);
    jest.advanceTimersByTime(900);
    const player = players.at(-1)!;
    expect(player.volume).toBe(0);
    expect(player.playing).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('survives fades that are interrupted by new fades', () => {
    audio.startLoop('ambient_treasury_loop', { level: 0.8, fadeMs: 1200 });
    jest.advanceTimersByTime(300);
    audio.stopLoop('ambient_treasury_loop', 600);
    jest.advanceTimersByTime(100);
    audio.startLoop('ambient_treasury_loop', { level: 0.3, fadeMs: 200 });
    jest.advanceTimersByTime(1000);
    expect(jest.getTimerCount()).toBe(0);
    const player = players.at(-1)!;
    expect(player.volume).toBeGreaterThan(0);
    expect(player.volume).toBeLessThanOrEqual(1);
  });
});
