#!/usr/bin/env node
/**
 * Kingdom Legends — procedural placeholder audio.
 *
 * Synthesizes every sound effect and ambient loop the app ships with, from first principles
 * (seeded noise, state-variable filters, additive bell partials, detuned sawtooth pads and a small
 * Freeverb-style reverb), and writes them to `assets/audio/<id>.wav` as 16-bit mono PCM.
 *
 * THESE ARE TEMPORARY PLACEHOLDERS. They give the game a coherent, tasteful soundscape during
 * development and will be replaced by professional sound design. Keep the ids (file names) stable
 * when swapping in final assets: the app refers to sounds by id.
 *
 * Usage
 *   node scripts/generate-audio.mjs                      render every sound, then verify the files
 *   node scripts/generate-audio.mjs --only=ui_tap,xp_gain render (and verify) only the listed ids
 *   node scripts/generate-audio.mjs --verify             verify existing files without rendering
 *
 * Guarantees (enforced by the verification pass, which exits non-zero on failure)
 *   - Deterministic: each sound draws from its own mulberry32 PRNG seeded from its id, so re-running
 *     produces byte-identical files and adding or editing one sound never changes the others.
 *   - SFX: 44.1 kHz, peak-normalized to -3 dBFS, begin and end at digital silence (raised-cosine
 *     fades of 2 ms in and >= 5 ms out).
 *   - Ambient loops: 22.05 kHz, peak-normalized to -10 dBFS. Loops are rendered as periodic signals,
 *     so the last sample flows into the first with no seam (no crossfade needed).
 *   - 25 Hz high-pass on every file (no DC offset), TPDF dither to 16 bit, no clipping.
 *
 * Art direction: "ancient royal luxury" — warm bronze, silver, carved stone, velvet, candlelight.
 * Musical material sits in D major. Rewards use bells and soft pads, never casino or arcade tropes
 * (no square waves, chiptune blips or coin chirps).
 */

import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ===========================================================================
// Configuration
// ===========================================================================

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');

const SFX_RATE = 44100;
const AMBIENT_RATE = 22050;
const SFX_PEAK_DBFS = -3;
const AMBIENT_PEAK_DBFS = -10;
const DC_HIGHPASS_HZ = 25;

/** Every one-shot starts with this much silence, so the safety fade-in never blunts an attack. */
const ONSET_PAD_S = 0.002;
const FADE_IN_S = 0.002;
const MIN_FADE_OUT_S = 0.005;

/** Verification limit for the mean (DC) of a file, as a fraction of full scale (-66 dBFS). */
const DC_LIMIT = 0.0005;

const TAU = 2 * Math.PI;

// ===========================================================================
// Math and music helpers
// ===========================================================================

const dbToGain = (db) => 10 ** (db / 20);
const gainToDb = (gain) => (gain > 0 ? 20 * Math.log10(gain) : -Infinity);
const samplesFor = (seconds, sr) => Math.round(seconds * sr);

/** Raised-cosine ramp: 0 for x <= 0, 1 for x >= 1, zero slope at both ends. */
const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * x));

const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Equal-tempered frequency of a note name such as 'D4', 'F#3' or 'Bb2' (A4 = 440 Hz). */
function hz(note) {
  const match = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!match) throw new Error(`Unrecognized note name "${note}"`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const midi = 12 * (Number(octave) + 1) + PITCH_CLASS[letter] + shift;
  return 440 * 2 ** ((midi - 69) / 12);
}

// ===========================================================================
// Deterministic randomness
// ===========================================================================

/** 32-bit FNV-1a hash: turns a sound id into a stable PRNG seed. */
function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a tiny, fast, well-distributed 32-bit PRNG, plus a few convenience draws. */
function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    bipolar: () => 2 * next() - 1,
    pick: (items) => items[Math.floor(next() * items.length)],
    /** Waiting time until the next event of a Poisson process with `rate` events per second. */
    wait: (rate) => -Math.log(1 - next()) / rate,
  };
}

// ===========================================================================
// Buffers
// ===========================================================================

const silence = (seconds, sr) => new Float64Array(samplesFor(seconds, sr));

function peakOf(buf) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  return peak;
}

function rmsOf(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

/** Multiply a buffer in place by a constant gain. */
function scale(buf, gain) {
  for (let i = 0; i < buf.length; i++) buf[i] *= gain;
  return buf;
}

/** Scale in place to unit RMS, so noise layers can be mixed with meaningful relative gains. */
const unitRms = (buf) => scale(buf, 1 / (rmsOf(buf) || 1));

/** dst += src * gain, starting `offset` samples into dst. */
function mixInto(dst, src, gain = 1, offset = 0) {
  const end = Math.min(dst.length, offset + src.length);
  for (let i = Math.max(0, offset); i < end; i++) dst[i] += gain * src[i - offset];
  return dst;
}

/** dst += layer * envelope(t): mixes a continuous layer under a time-varying gain. */
function mixShaped(dst, sr, layer, envelope) {
  for (let i = 0; i < dst.length; i++) dst[i] += layer[i] * envelope(i / sr);
  return dst;
}

/** Multiply a buffer in place by an envelope (t) => gain, t in seconds. */
function applyEnvelope(buf, sr, envelope) {
  for (let i = 0; i < buf.length; i++) buf[i] *= envelope(i / sr);
  return buf;
}

// ===========================================================================
// Envelopes
// ===========================================================================

/** Percussive envelope: raised-cosine attack, then exponential decay with time constant `decay`. */
function perc(t, attack, decay) {
  if (t < 0) return 0;
  if (t < attack) return smooth01(t / attack);
  return Math.exp(-(t - attack) / decay);
}

/** Envelope through [time, value] breakpoints with raised-cosine segments; holds at the ends. */
function curve(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      if (t < t1) {
        const [t0, v0] = points[i - 1];
        return v0 + (v1 - v0) * smooth01((t - t0) / (t1 - t0));
      }
    }
    return points[points.length - 1][1];
  };
}

/** Like `curve`, but interpolates geometrically: the natural choice for frequency sweeps. */
function sweep(points) {
  const logCurve = curve(points.map(([t, v]) => [t, Math.log(v)]));
  return (t) => Math.exp(logCurve(t));
}

// ===========================================================================
// Noise
// ===========================================================================

function whiteNoise(length, rng) {
  const out = new Float64Array(length);
  for (let i = 0; i < length; i++) out[i] = rng.bipolar();
  return out;
}

/** Pink (about -3 dB/octave) filter: Paul Kellet's economy method. */
function pinkFilter(input) {
  const out = new Float64Array(input.length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < input.length; i++) {
    const white = input[i];
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    out[i] = 0.25 * (b0 + b1 + b2 + white * 0.1848);
  }
  return out;
}

const pinkNoise = (length, rng) => pinkFilter(whiteNoise(length, rng));

// ===========================================================================
// Filters
// ===========================================================================

/** Output taps of the state-variable filter: y = m0 * input + m1 * band + m2 * low. */
function svfTaps(type, k) {
  switch (type) {
    case 'lowpass':
      return [0, 0, 1];
    case 'highpass':
      return [1, -k, -1];
    case 'bandpass':
      return [0, k, 0]; // unity gain at the center frequency
    case 'notch':
      return [1, -k, 0];
    default:
      throw new Error(`Unknown filter type "${type}"`);
  }
}

/**
 * Topology-preserving state-variable filter (Zavalishin / Simper). It stays stable and smooth
 * under fast modulation, so `cutoff` (Hz) may be a number or a function of time in seconds.
 * `q` is the resonance: 0.707 is Butterworth; band-pass bandwidth is cutoff / q.
 */
function svf(input, sr, { type = 'lowpass', cutoff, q = Math.SQRT1_2 }) {
  const out = new Float64Array(input.length);
  const k = 1 / q;
  const [m0, m1, m2] = svfTaps(type, k);
  const cutoffAt = typeof cutoff === 'function' ? cutoff : null;
  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  const tune = (freq) => {
    const g = Math.tan((Math.PI * Math.min(Math.max(freq, 1), 0.49 * sr)) / sr);
    a1 = 1 / (1 + g * (g + k));
    a2 = g * a1;
    a3 = g * a2;
  };
  if (!cutoffAt) tune(cutoff);
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < input.length; i++) {
    if (cutoffAt) tune(cutoffAt(i / sr));
    const v0 = input[i];
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = m0 * v0 + m1 * v1 + m2 * v2;
  }
  return out;
}

const lowpass = (input, sr, cutoff, q = Math.SQRT1_2) => svf(input, sr, { type: 'lowpass', cutoff, q });
const highpass = (input, sr, cutoff, q = Math.SQRT1_2) => svf(input, sr, { type: 'highpass', cutoff, q });
const bandpass = (input, sr, cutoff, q = 1) => svf(input, sr, { type: 'bandpass', cutoff, q });

/** Smooth random modulation in [-1, 1]: white noise low-passed (4th order) at `rateHz`. */
function wobble(length, sr, rng, rateHz) {
  const smoothNoise = lowpass(lowpass(whiteNoise(length, rng), sr, rateHz), sr, rateHz);
  return scale(smoothNoise, 1 / (peakOf(smoothNoise) || 1));
}

// ===========================================================================
// Oscillators
// ===========================================================================

const TABLE_SIZE = 4096;
const tableCache = new Map();

/**
 * One cycle of a band-limited waveform from harmonic amplitudes (index 0 = fundamental),
 * normalized to unit peak, with a guard sample for linear interpolation.
 */
function harmonicTable(amplitudes) {
  const key = amplitudes.join(',');
  const cached = tableCache.get(key);
  if (cached) return cached;
  const table = new Float64Array(TABLE_SIZE + 1);
  amplitudes.forEach((amplitude, index) => {
    const step = (TAU * (index + 1)) / TABLE_SIZE;
    for (let i = 0; i < TABLE_SIZE; i++) table[i] += amplitude * Math.sin(step * i);
  });
  scale(table, 1 / peakOf(table));
  table[TABLE_SIZE] = table[0];
  tableCache.set(key, table);
  return table;
}

const SINE = harmonicTable([1]);

/** Soft sawtooth: `harmonics` partials falling as 1/n^tilt (tilt > 1 is mellower than a saw). */
const softSaw = (harmonics, tilt = 1) =>
  harmonicTable(Array.from({ length: Math.max(1, Math.floor(harmonics)) }, (_, i) => 1 / (i + 1) ** tilt));

/**
 * Add a wavetable oscillator into `out`. `freq` (Hz) and `amp` may be numbers or functions of the
 * time since the note started; `phase` is in cycles. A constant frequency is computed without
 * accumulation, so whole-cycle loop frequencies stay exactly periodic.
 */
function addOsc(out, sr, { table, freq, amp = 1, start = 0, duration, phase = 0 }) {
  const first = Math.max(0, samplesFor(start, sr));
  const last = duration === undefined ? out.length : Math.min(out.length, first + samplesFor(duration, sr));
  const freqAt = typeof freq === 'function' ? freq : null;
  const ampAt = typeof amp === 'function' ? amp : null;
  const increment = freqAt ? 0 : freq / sr;
  let cycle = phase;
  for (let i = first; i < last; i++) {
    const t = (i - first) / sr;
    const position = freqAt ? cycle : phase + (i - first) * increment;
    const pos = (position - Math.floor(position)) * TABLE_SIZE;
    const j = Math.min(Math.floor(pos), TABLE_SIZE - 1);
    const sample = table[j] + (table[j + 1] - table[j]) * (pos - j);
    out[i] += sample * (ampAt ? ampAt(t) : amp);
    if (freqAt) cycle += freqAt(t) / sr;
  }
  return out;
}

/**
 * Ensemble pad voice: the "orchestral-ish" building block. Detuned soft sawtooths are summed and
 * low-pass filtered with a cutoff that can follow the swell (brass and bowed strings brighten as
 * they get louder), then shaped by an amplitude envelope. `freq` may be a function for glides or
 * vibrato. Returns a new buffer of `duration` seconds.
 */
function padVoice(sr, rng, { duration, freq, amp, cutoff, q = Math.SQRT1_2, detune = [-7, 0, 7], tilt = 1.1 }) {
  const n = samplesFor(duration, sr);
  const raw = new Float64Array(n);
  const freqAt = typeof freq === 'function' ? freq : () => freq;
  let highest = 0;
  for (let s = 0; s <= 64; s++) highest = Math.max(highest, freqAt((s / 64) * duration));
  const table = softSaw((0.42 * sr) / (highest * 2 ** (Math.max(...detune) / 1200)), tilt);
  for (const cents of detune) {
    const ratio = 2 ** (cents / 1200);
    const voiceFreq = typeof freq === 'function' ? (t) => freq(t) * ratio : freq * ratio;
    addOsc(raw, sr, { table, freq: voiceFreq, amp: 1 / detune.length, phase: rng.next() });
  }
  return applyEnvelope(svf(raw, sr, { type: 'lowpass', cutoff, q }), sr, amp);
}

// ===========================================================================
// Struck metal (additive synthesis)
// ===========================================================================

/**
 * Partial recipes: frequency ratios relative to the played note, relative amplitudes, decay times
 * relative to the fundamental, and optional "beat" (Hz) splitting a mode into a slightly detuned
 * pair — the slow shimmer of real bronze.
 */
const TIMBRES = {
  /** Tiny two-mode bar resonance: the "ring" inside UI clicks. */
  tink: [
    { ratio: 1, amp: 1, decay: 1 },
    { ratio: 2.756, amp: 0.35, decay: 0.45 },
  ],
  /** Small bronze bowl: strong, slowly beating fundamental and soft inharmonic upper modes. */
  bronze: [
    { ratio: 1, amp: 1, decay: 1, beat: 0.9 },
    { ratio: 2.71, amp: 0.3, decay: 0.45, beat: 1.6 },
    { ratio: 5.15, amp: 0.1, decay: 0.22 },
    { ratio: 8.43, amp: 0.035, decay: 0.12 },
  ],
  /** Silver chime bar (free-free bar modes 1 : 2.756 : 5.404 : 8.933): brighter and glassier. */
  silver: [
    { ratio: 1, amp: 1, decay: 1, beat: 0.4 },
    { ratio: 2.756, amp: 0.5, decay: 0.55 },
    { ratio: 5.404, amp: 0.25, decay: 0.3 },
    { ratio: 8.933, amp: 0.1, decay: 0.18 },
  ],
  /** Celesta-like: nearly harmonic, so it sits cleanly in melodies and chords. */
  celesta: [
    { ratio: 1, amp: 1, decay: 1 },
    { ratio: 2, amp: 0.25, decay: 0.5 },
    { ratio: 3, amp: 0.07, decay: 0.3 },
    { ratio: 4.18, amp: 0.05, decay: 0.12 },
  ],
  /** Tiny high glint for sparkles: almost pure, with a faint metallic overtone. */
  glint: [
    { ratio: 1, amp: 1, decay: 1 },
    { ratio: 2.756, amp: 0.18, decay: 0.4 },
  ],
  /** Felt mallet on a wooden bar (marimba-like modes 1 : 3.93 : 9.2): soft and neutral. */
  wood: [
    { ratio: 1, amp: 1, decay: 1 },
    { ratio: 3.93, amp: 0.14, decay: 0.22 },
    { ratio: 9.2, amp: 0.035, decay: 0.08 },
  ],
  /** Large bell with a *major* tierce (hum, prime, third, fifth, nominal...): regal rather than somber. */
  grand: [
    { ratio: 0.5, amp: 0.35, decay: 1.6, beat: 0.35 },
    { ratio: 1, amp: 0.7, decay: 1.1, beat: 0.6 },
    { ratio: 1.25, amp: 0.3, decay: 0.8 },
    { ratio: 1.5, amp: 0.22, decay: 0.6 },
    { ratio: 2, amp: 1, decay: 0.75, beat: 1.1 },
    { ratio: 2.5, amp: 0.28, decay: 0.4 },
    { ratio: 3, amp: 0.2, decay: 0.3 },
    { ratio: 4.06, amp: 0.1, decay: 0.18 },
  ],
};

/**
 * Strike a bell: a sum of exponentially decaying sine partials.
 * `decay` is the fundamental's time constant (s); `brightness` < 1 softens upper partials like a
 * softer mallet. With `wrap`, samples past the end wrap to the start (for loops).
 */
function addBell(out, sr, rng, { start = 0, freq, gain = 1, decay, timbre, brightness = 1, attack = 0.002, wrap = false }) {
  const n = out.length;
  const first = samplesFor(start, sr);
  const attackSamples = Math.max(1, samplesFor(attack, sr));
  for (const partial of timbre) {
    const partialHz = freq * partial.ratio;
    if (partialHz > 0.45 * sr) continue;
    const level = gain * partial.amp * (partial.ratio > 1 ? brightness ** Math.log2(partial.ratio) : 1);
    const tau = partial.decay * decay;
    const length = Math.min(n, Math.ceil((attack + 7 * tau) * sr));
    const pair = partial.beat
      ? [
          [partialHz - partial.beat / 2, 0.72],
          [partialHz + partial.beat / 2, 0.28],
        ]
      : [[partialHz, 1]];
    for (const [f, share] of pair) {
      const omega = (TAU * f) / sr;
      const phase = rng.next() * TAU;
      const fall = Math.exp(-1 / (tau * sr));
      let env = level * share;
      for (let i = 0; i < length; i++) {
        let index = first + i;
        if (index >= n) {
          if (!wrap) break;
          index -= n;
        }
        const onset = i < attackSamples ? smooth01(i / attackSamples) : 1;
        out[index] += env * onset * Math.sin(omega * i + phase);
        env *= fall;
      }
    }
  }
  return out;
}

/**
 * Sprinkle tiny bell glints: `count` notes picked from `notes`, stratified in time so they start
 * dense and thin out, each a little quieter. Reads as sparkle rather than a melody.
 */
function addSparkles(out, sr, rng, { start, end, count, notes, gain, decay: [shortest, longest], brightness = 0.7 }) {
  let previous = null;
  for (let k = 0; k < count; k++) {
    const u = (k + rng.range(0.2, 0.8)) / count;
    let note = rng.pick(notes);
    if (note === previous) note = rng.pick(notes);
    previous = note;
    addBell(out, sr, rng, {
      start: start + (end - start) * u ** 1.5,
      freq: hz(note),
      gain: gain * (1 - 0.6 * u) * rng.range(0.75, 1),
      decay: rng.range(shortest, longest),
      timbre: TIMBRES.glint,
      brightness,
      attack: 0.0025,
    });
  }
  return out;
}

// ===========================================================================
// Noise grains: clicks, crackles, flaps and grit
// ===========================================================================

/**
 * A short burst of white noise under an attack/decay envelope, exciting a resonant SVF
 * (band-pass by default). Added into `out` at `time` seconds; with `wrap`, it wraps around the
 * buffer end (for loops).
 */
function addGrain(out, sr, rng, { time, freq, q = 1, gain = 1, attack = 0.0003, decay = 0.002, type = 'bandpass', wrap = false }) {
  const n = out.length;
  const k = 1 / q;
  const g = Math.tan((Math.PI * Math.min(freq, 0.45 * sr)) / sr);
  const a1 = 1 / (1 + g * (g + k));
  const a2 = g * a1;
  const a3 = g * a2;
  const [m0, m1, m2] = svfTaps(type, k);
  const ring = q / (Math.PI * freq); // the resonator's own decay time constant
  const length = Math.ceil((attack + 7 * Math.max(decay, ring)) * sr) + 1;
  const attackSamples = Math.max(1, attack * sr);
  const fall = Math.exp(-1 / (decay * sr));
  const first = samplesFor(time, sr);
  let level = 1;
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < length; i++) {
    let index = first + i;
    if (index >= n) {
      if (!wrap) break;
      index %= n;
    }
    let shape = i / attackSamples;
    if (i >= attackSamples) {
      level *= fall;
      shape = level;
    }
    const v0 = rng.bipolar() * shape;
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[index] += gain * (m0 * v0 + m1 * v1 + m2 * v2);
  }
  return out;
}

/**
 * Scatter grains as an inhomogeneous Poisson process (by thinning): `rate` grains per second (a
 * number, or a function of time bounded by `maxRate`). Amplitudes are skewed so most grains are
 * faint and a few are prominent — how crumpled foil and grit behave. Center frequencies are drawn
 * log-uniformly from `freq`.
 */
function addCrackles(out, sr, rng, options) {
  const { start = 0, end, rate, maxRate = rate, gain = 1, skew = 2, wrap = false } = options;
  const { freq: [lowHz, highHz], q: [lowQ, highQ] = [1.5, 4], decay: [shortest, longest] = [0.0004, 0.0018] } = options;
  const rateAt = typeof rate === 'function' ? rate : () => rate;
  const gainAt = typeof gain === 'function' ? gain : () => gain;
  for (let t = start + rng.wait(maxRate); t < end; t += rng.wait(maxRate)) {
    if (rng.next() * maxRate > rateAt(t)) continue;
    addGrain(out, sr, rng, {
      time: t,
      freq: lowHz * (highHz / lowHz) ** rng.next(),
      q: rng.range(lowQ, highQ),
      gain: gainAt(t) * rng.next() ** skew,
      attack: 0.0001,
      decay: rng.range(shortest, longest),
      wrap,
    });
  }
  return out;
}

/** Grain settings for metallized foil: bright resonant crackles in the 2.2–9 kHz range. */
const FOIL = { freq: [2200, 9000], q: [1.8, 5], decay: [0.0003, 0.0016], skew: 2.4 };

// ===========================================================================
// Reverb
// ===========================================================================

const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_TUNING = [556, 441, 341, 225];
const STEREO_SPREAD = 23;

/**
 * Mono Freeverb-style core: Freeverb's left and right comb sets (16 damped feedback combs) summed
 * for a denser tail, then 4 series allpasses. Comb feedback is derived from the requested RT60 so
 * every comb decays at the same rate. Returns a per-sample processing function.
 */
function reverbCore(sr, { rt60, damping, size }) {
  const stretch = (sr / 44100) * size;
  const combs = [...COMB_TUNING, ...COMB_TUNING.map((d) => d + STEREO_SPREAD)].map((tuning) => {
    const delay = Math.max(1, Math.round(tuning * stretch));
    return { line: new Float64Array(delay), index: 0, memory: 0, feedback: 10 ** ((-3 * delay) / (rt60 * sr)) };
  });
  const allpasses = ALLPASS_TUNING.map((tuning) => ({
    line: new Float64Array(Math.max(1, Math.round(tuning * stretch))),
    index: 0,
  }));
  return (x) => {
    let sum = 0;
    for (const comb of combs) {
      const y = comb.line[comb.index];
      comb.memory = y * (1 - damping) + comb.memory * damping;
      comb.line[comb.index] = x + comb.memory * comb.feedback;
      comb.index = comb.index + 1 === comb.line.length ? 0 : comb.index + 1;
      sum += y;
    }
    for (const allpass of allpasses) {
      const y = allpass.line[allpass.index];
      allpass.line[allpass.index] = sum + y * 0.5;
      allpass.index = allpass.index + 1 === allpass.line.length ? 0 : allpass.index + 1;
      sum = y - sum;
    }
    return sum;
  };
}

/**
 * Add a hall to `input` (same length; the tail is cut where the buffer ends). The core is
 * calibrated to a unit-energy impulse response, so `wet` is the reverberant-to-direct amplitude
 * ratio for any room size or RT60. The send is band-limited (`lowCut`..`highCut`) to keep the tail
 * clear of mud on small speakers and free of hiss.
 */
function reverb(input, sr, { rt60 = 1.5, damping = 0.35, size = 1, predelay = 0.02, wet = 0.3, lowCut = 150, highCut = 7000 } = {}) {
  const probe = reverbCore(sr, { rt60, damping, size });
  let energy = 0;
  for (let i = 0, probeLength = Math.ceil(rt60 * sr); i < probeLength; i++) {
    const y = probe(i === 0 ? 1 : 0);
    energy += y * y;
  }
  const wetGain = wet / Math.sqrt(energy);
  const send = lowpass(highpass(input, sr, lowCut, 0.6), sr, highCut, 0.6);
  const core = reverbCore(sr, { rt60, damping, size });
  const delay = samplesFor(predelay, sr);
  const out = Float64Array.from(input);
  for (let i = 0; i < out.length; i++) out[i] += wetGain * core(i >= delay ? send[i - delay] : 0);
  return out;
}

// ===========================================================================
// Seamless loops
// ===========================================================================

/** Nearest frequency completing a whole number of cycles per loop, which keeps loops periodic. */
const loopHz = (freq, seconds) => Math.max(1, Math.round(freq * seconds)) / seconds;

/** Sine LFO with a whole number of cycles per loop; `phase` is in cycles. */
const loopLfo = (cycles, seconds, phase = 0) => (t) => Math.sin(TAU * ((cycles * t) / seconds + phase));

/**
 * Run `process` over a periodic signal until its filters and reverb reach their periodic steady
 * state, and return the final period. That period's last sample flows into its first exactly as
 * consecutive periods would, so it loops without a seam and without crossfading.
 */
function processPeriodic(period, process, repeats = 3) {
  const n = period.length;
  const tiled = new Float64Array(n * repeats);
  for (let r = 0; r < repeats; r++) tiled.set(period, r * n);
  const out = process(tiled);
  // The last two periods must match; if not, a tail is still settling or a modulator is not periodic.
  const last = out.subarray((repeats - 1) * n);
  const previous = out.subarray((repeats - 2) * n, (repeats - 1) * n);
  let drift = 0;
  for (let i = 0; i < n; i++) drift = Math.max(drift, Math.abs(last[i] - previous[i]));
  if (drift > 1e-6 * (peakOf(last) || 1)) {
    throw new Error(`Loop processing did not reach a periodic steady state (drift ${drift.toExponential(2)})`);
  }
  return last.slice();
}

/**
 * Render a seamless loop. `buildDry(n)` returns one period (n samples) of periodic material: every
 * oscillator runs at a whole number of cycles per loop, LFOs complete whole cycles and events wrap
 * around the end. `processWet` (e.g. reverb) and the DC high-pass then run periodically.
 */
function renderLoop(seconds, sr, buildDry, processWet = (x) => x) {
  const dry = buildDry(samplesFor(seconds, sr));
  return processPeriodic(dry, (x) => highpass(processWet(x), sr, DC_HIGHPASS_HZ));
}

// ===========================================================================
// Mastering and WAV I/O
// ===========================================================================

function normalize(buf, peakDb) {
  const peak = peakOf(buf);
  return peak > 0 ? scale(buf, dbToGain(peakDb) / peak) : buf;
}

/** One-shot mastering: onset pad, 25 Hz DC high-pass, then raised-cosine fades in and out. */
function masterOneShot(raw, sr, fadeOut) {
  const padded = new Float64Array(samplesFor(ONSET_PAD_S, sr) + raw.length);
  padded.set(raw, padded.length - raw.length);
  const out = highpass(padded, sr, DC_HIGHPASS_HZ);
  const fadeInLength = samplesFor(FADE_IN_S, sr);
  const fadeOutLength = samplesFor(Math.max(MIN_FADE_OUT_S, fadeOut), sr);
  for (let i = 0; i < fadeInLength; i++) out[i] *= smooth01(i / fadeInLength);
  for (let i = 0; i < fadeOutLength; i++) out[out.length - 1 - i] *= smooth01(i / fadeOutLength);
  return out;
}

/** Encode 16-bit mono PCM WAV with TPDF dither (exact digital silence stays silent). */
function encodeWav(samples, sr, rng) {
  const dataBytes = samples.length * 2;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVE', 8, 'ascii');
  wav.write('fmt ', 12, 'ascii');
  wav.writeUInt32LE(16, 16); // fmt chunk size
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(sr, 24);
  wav.writeUInt32LE(sr * 2, 28); // byte rate
  wav.writeUInt16LE(2, 32); // block align
  wav.writeUInt16LE(16, 34); // bits per sample
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const dither = samples[i] === 0 ? 0 : rng.next() - rng.next();
    const value = Math.round(samples[i] * 32767 + dither);
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, value)), 44 + 2 * i);
  }
  return wav;
}

/** Parse a 16-bit mono PCM WAV back into samples (walks the chunk list; no assumptions on order). */
function decodeWav(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let format = null;
  let data = null;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = {
        encoding: bytes.readUInt16LE(body),
        channels: bytes.readUInt16LE(body + 2),
        sampleRate: bytes.readUInt32LE(body + 4),
        bitsPerSample: bytes.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = bytes.subarray(body, body + size);
    }
    offset = body + size + (size % 2);
  }
  if (!format || !data) throw new Error('missing fmt or data chunk');
  if (format.encoding !== 1 || format.channels !== 1 || format.bitsPerSample !== 16) {
    throw new Error('expected 16-bit mono PCM');
  }
  const samples = new Int16Array(data.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = data.readInt16LE(2 * i);
  return { sampleRate: format.sampleRate, samples };
}

// ===========================================================================
// Sound design: UI navigation (soft metallic clicks and carved stone)
// ===========================================================================

/**
 * Shared recipe for the navigation clicks: a ~1 ms band-passed noise tick (the contact), a damped
 * sine knock whose pitch sags slightly (the physical body) and a quiet two-mode metal ring.
 */
function metalClick({ sr, rng }, { length, tick, knock, ring }) {
  const out = silence(length, sr);
  addGrain(out, sr, rng, { time: 0, freq: tick.hz, q: tick.q, gain: tick.gain, attack: tick.attack, decay: tick.decay });
  addOsc(out, sr, {
    table: SINE,
    freq: (t) => knock.hz * (1 + 0.25 * Math.exp(-t / 0.004)),
    amp: (t) => knock.gain * perc(t, 0.0006, knock.decay),
  });
  addBell(out, sr, rng, { start: 0.0004, freq: ring.hz, gain: ring.gain, decay: ring.decay, timbre: TIMBRES.tink, attack: 0.0008 });
  return out;
}

/** ui_tap — soft metallic click: subtle high-mid tick with a tiny ring. */
const uiTap = (ctx) =>
  metalClick(ctx, {
    length: 0.065,
    tick: { hz: 3400, q: 1.2, gain: 1, attack: 0.0004, decay: 0.0011 },
    knock: { hz: 1150, gain: 0.3, decay: 0.0035 },
    ring: { hz: hz('D7'), gain: 0.1, decay: 0.014 },
  });

/** ui_select — brighter, higher sibling of ui_tap for tabs and chips; the ring a fifth above. */
const uiSelect = (ctx) =>
  metalClick(ctx, {
    length: 0.09,
    tick: { hz: 4300, q: 1.3, gain: 1, attack: 0.0004, decay: 0.001 },
    knock: { hz: 1500, gain: 0.24, decay: 0.003 },
    ring: { hz: hz('A7'), gain: 0.14, decay: 0.017 },
  });

/** ui_back — softer, lower click: more body, duller tick, a faint low ring. */
const uiBack = (ctx) =>
  metalClick(ctx, {
    length: 0.07,
    tick: { hz: 1900, q: 1, gain: 0.8, attack: 0.0009, decay: 0.0018 },
    knock: { hz: 640, gain: 0.5, decay: 0.006 },
    ring: { hz: hz('A6'), gain: 0.07, decay: 0.011 },
  });

/** ui_confirm — two soft silver bell notes a perfect fifth apart (D6, A6). */
function uiConfirm({ sr, rng }) {
  const out = silence(0.45, sr);
  addBell(out, sr, rng, { start: 0, freq: hz('D6'), gain: 0.75, decay: 0.09, timbre: TIMBRES.silver, brightness: 0.55 });
  addBell(out, sr, rng, { start: 0.085, freq: hz('A6'), gain: 1, decay: 0.12, timbre: TIMBRES.silver, brightness: 0.55 });
  return reverb(out, sr, { rt60: 0.6, wet: 0.35, predelay: 0.012, damping: 0.4, size: 0.7 });
}

/** stone_slide — a carved-stone panel sliding: low grinding noise, stick-slip grit, a soft settle. */
function stoneSlide({ sr, rng }) {
  const length = 0.28;
  const n = samplesFor(length, sr);
  const motion = curve([
    [0, 0],
    [0.035, 1],
    [0.15, 0.82],
    [0.215, 0.7],
    [0.27, 0],
  ]);
  const source = pinkNoise(n, rng);
  // Grinding body: low mids only, the band drifting as the slab speeds up and slows.
  const body = unitRms(lowpass(highpass(source, sr, 110), sr, sweep([[0, 600], [0.12, 950], [0.28, 520]]), 0.9));
  // The hollow resonance of the slab, and a higher scrape.
  const hollow = unitRms(bandpass(source, sr, 340, 1.6));
  const scrape = unitRms(bandpass(source, sr, sweep([[0, 1100], [0.28, 1400]]), 2.2));
  // Stick-slip friction: fast irregular amplitude modulation.
  const friction = wobble(n, sr, rng, 45);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = motion(t) * (1 + 0.45 * friction[i]) * (0.3 * body[i] + 0.12 * hollow[i] + 0.1 * scrape[i]);
  }
  // Grit: sand-grain crackles riding on the motion.
  addCrackles(out, sr, rng, {
    end: 0.25,
    rate: (t) => 260 * motion(t),
    maxRate: 260,
    freq: [1300, 4200],
    q: [1.2, 3],
    gain: (t) => 0.3 * motion(t),
    skew: 2.2,
    decay: [0.0003, 0.0012],
  });
  // Settle: the slab comes to rest with a soft, low knock.
  addGrain(out, sr, rng, { time: 0.226, type: 'lowpass', freq: 420, q: 0.8, gain: 0.5, attack: 0.002, decay: 0.014 });
  addOsc(out, sr, {
    table: SINE,
    freq: (t) => 165 * (1 + 0.15 * Math.exp(-t / 0.01)),
    amp: (t) => 0.22 * perc(t, 0.002, 0.022),
    start: 0.226,
  });
  return out;
}

// ===========================================================================
// Sound design: foil card pack
// ===========================================================================

/** pack_grab — a short foil crinkle as fingers close on the pack, over a soft handling thump. */
function packGrab({ sr, rng }) {
  const length = 0.16;
  const n = samplesFor(length, sr);
  const out = new Float64Array(n);
  const density = curve([
    [0, 0],
    [0.006, 1],
    [0.05, 0.55],
    [0.13, 0.08],
    [0.15, 0],
  ]);
  addCrackles(out, sr, rng, { ...FOIL, end: 0.15, rate: (t) => 1600 * density(t), maxRate: 1600, gain: (t) => 0.9 * Math.sqrt(density(t)) });
  addGrain(out, sr, rng, { time: 0, type: 'lowpass', freq: 500, q: 0.7, gain: 0.5, attack: 0.003, decay: 0.012 });
  const swish = unitRms(bandpass(whiteNoise(n, rng), sr, 4500, 0.7));
  return mixShaped(out, sr, swish, (t) => 0.05 * perc(t, 0.004, 0.03));
}

/** foil_stretch_loop — low-level, continuous foil tension: faint hiss, a trickle of crinkles, rare creaks. */
function foilStretchLoop({ sr, rng }) {
  const seconds = 1.5;
  return renderLoop(seconds, sr, (n) => {
    const out = new Float64Array(n);
    const hiss = unitRms(processPeriodic(whiteNoise(n, rng), (x) => highpass(bandpass(x, sr, 5200, 0.8), sr, 2500)));
    const breathe = loopLfo(1, seconds);
    mixShaped(out, sr, hiss, (t) => 0.035 * (1 + 0.12 * breathe(t)));
    addCrackles(out, sr, rng, { ...FOIL, end: seconds, rate: 140, gain: 0.5, skew: 3, wrap: true });
    addCrackles(out, sr, rng, { end: seconds, rate: 12, freq: [900, 2000], q: [3, 6], gain: 0.3, decay: [0.001, 0.003], skew: 1.5, wrap: true });
    return out;
  });
}

/**
 * One tearing grain: band-passed noise with a fast attack and a fluttering decay, fused with a
 * dense train of micro-crackles (the seal's fibers parting). Variants differ in center frequency,
 * density and length so rapid repeats never sound identical.
 */
function foilRip({ sr, rng }, { length, center, density, flutter }) {
  const n = samplesFor(length, sr);
  const env = (t) => perc(t, 0.0015, 0.3 * length) * smooth01((length - 0.003 - t) / (0.35 * length));
  const bed = unitRms(highpass(bandpass(whiteNoise(n, rng), sr, center, 0.9), sr, 900));
  const membrane = unitRms(bandpass(whiteNoise(n, rng), sr, 0.38 * center, 1.6));
  const roughness = wobble(n, sr, rng, flutter);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = env(t) * (0.55 + 0.45 * roughness[i]) * (0.3 * bed[i] + 0.1 * membrane[i]);
  }
  return addCrackles(out, sr, rng, {
    freq: [0.6 * center, Math.min(2.4 * center, 9500)],
    q: [2, 5],
    decay: [0.0002, 0.0009],
    skew: 1.8,
    end: length - 0.01,
    rate: (t) => density * Math.min(1, 1.5 * env(t)),
    maxRate: density,
    gain: (t) => 0.8 * Math.sqrt(env(t)),
  });
}

/** foil_release — the seal parts: a larger accelerating tear, a soft pop, then a sigh of released air. */
function foilRelease({ sr, rng }) {
  const length = 0.55;
  const n = samplesFor(length, sr);
  const out = new Float64Array(n);
  const tear = curve([
    [0, 0],
    [0.008, 0.45],
    [0.06, 0.65],
    [0.135, 1],
    [0.16, 0.25],
    [0.21, 0],
  ]);
  addCrackles(out, sr, rng, { ...FOIL, freq: [1800, 9000], end: 0.21, rate: (t) => 2200 * tear(t), maxRate: 2200, gain: (t) => 0.9 * tear(t) });
  const tearBed = unitRms(bandpass(whiteNoise(n, rng), sr, sweep([[0, 2400], [0.16, 3400]]), 0.8));
  const roughness = wobble(n, sr, rng, 220);
  for (let i = 0; i < n; i++) out[i] += 0.28 * tear(i / sr) * (0.55 + 0.45 * roughness[i]) * tearBed[i];
  // The seal gives: a soft, low pop of released tension.
  addGrain(out, sr, rng, { time: 0.148, type: 'lowpass', freq: 380, q: 0.8, gain: 0.7, attack: 0.0015, decay: 0.011 });
  addOsc(out, sr, { table: SINE, freq: (t) => 150 * (1 + 0.2 * Math.exp(-t / 0.01)), amp: (t) => 0.25 * perc(t, 0.002, 0.03), start: 0.148 });
  // Release of tension: a breath of air falling from bright to dark.
  const air = unitRms(bandpass(pinkNoise(n, rng), sr, sweep([[0.15, 3200], [0.55, 650]]), 0.7));
  mixShaped(out, sr, air, (t) => 0.22 * perc(t - 0.14, 0.035, 0.12));
  // The wrapper relaxes: a few settling crinkles.
  addCrackles(out, sr, rng, { ...FOIL, start: 0.18, end: 0.5, rate: (t) => 70 * Math.exp(-(t - 0.18) / 0.1), maxRate: 70, gain: 0.35 });
  return reverb(out, sr, { rt60: 0.45, wet: 0.2, predelay: 0.006, size: 0.5, damping: 0.5 });
}

/** wrapper_fall — the empty wrapper crumples and drifts away: soft rustle that darkens as it recedes. */
function wrapperFall({ sr, rng }) {
  const length = 0.45;
  const n = samplesFor(length, sr);
  const out = new Float64Array(n);
  const activity = curve([
    [0, 0.3],
    [0.04, 1],
    [0.16, 0.75],
    [0.3, 0.35],
    [0.42, 0],
  ]);
  addCrackles(out, sr, rng, {
    freq: [1500, 7500],
    q: [1.5, 4],
    decay: [0.0004, 0.002],
    skew: 2.2,
    end: 0.42,
    rate: (t) => 320 * activity(t),
    maxRate: 320,
    gain: (t) => 0.7 * activity(t),
  });
  const swish = unitRms(bandpass(whiteNoise(n, rng), sr, sweep([[0, 2600], [0.45, 1200]]), 0.8));
  mixShaped(out, sr, swish, (t) => 0.08 * activity(t));
  const receding = lowpass(out, sr, sweep([[0, 11000], [0.45, 2800]]), 0.6);
  return reverb(receding, sr, { rt60: 0.5, wet: 0.25, predelay: 0.008, size: 0.6, damping: 0.5 });
}

/** cards_slide — a stack of cards sliding out of the wrapper: soft papery friction, edges catching. */
function cardsSlide({ sr, rng }) {
  const length = 0.65;
  const n = samplesFor(length, sr);
  const motion = curve([
    [0, 0],
    [0.11, 1],
    [0.38, 0.9],
    [0.53, 0.55],
    [0.62, 0],
  ]);
  const source = pinkNoise(n, rng);
  const friction = unitRms(lowpass(bandpass(source, sr, sweep([[0, 1700], [0.35, 2500], [0.65, 1900]]), 0.7), sr, 6500));
  const stiffness = unitRms(bandpass(source, sr, 720, 1.4));
  const texture = wobble(n, sr, rng, 70);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = motion(i / sr) * (1 + 0.35 * texture[i]) * (0.3 * friction[i] + 0.1 * stiffness[i]);
  }
  addCrackles(out, sr, rng, {
    freq: [1800, 4800],
    q: [2.5, 5],
    decay: [0.0008, 0.0025],
    skew: 1.6,
    end: 0.58,
    rate: (t) => 38 * motion(t),
    maxRate: 38,
    gain: (t) => 0.3 * motion(t),
  });
  return reverb(out, sr, { rt60: 0.35, wet: 0.12, size: 0.5 });
}

/** card_shuffle — a soft riffle (fast card flaps) that settles with a gentle squaring knock. */
function cardShuffle({ sr, rng }) {
  const length = 0.42;
  const n = samplesFor(length, sr);
  const out = new Float64Array(n);
  const flaps = 22;
  let time = 0.012;
  for (let k = 0; k < flaps; k++) {
    const progress = k / (flaps - 1);
    const level = (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 1.15 * progress))) * rng.range(0.7, 1);
    addGrain(out, sr, rng, { time, freq: rng.range(2000, 3600), q: 1.1, gain: level, attack: 0.0004, decay: 0.0022 });
    addGrain(out, sr, rng, { time, freq: rng.range(650, 950), q: 1.4, gain: 0.35 * level, attack: 0.0008, decay: 0.004 });
    time += 0.0095 * (1 + progress ** 2) * rng.range(0.8, 1.2);
  }
  const air = unitRms(bandpass(whiteNoise(n, rng), sr, 1600, 0.6));
  mixShaped(out, sr, air, curve([[0, 0], [0.03, 0.05], [0.28, 0.03], [0.33, 0]]));
  const settle = time + 0.03;
  addGrain(out, sr, rng, { time: settle, type: 'lowpass', freq: 650, q: 0.8, gain: 0.9, attack: 0.0015, decay: 0.012 });
  addGrain(out, sr, rng, { time: settle + 0.001, freq: 2600, q: 1.5, gain: 0.25, attack: 0.0003, decay: 0.0015 });
  return reverb(out, sr, { rt60: 0.35, wet: 0.15, size: 0.5 });
}

// ===========================================================================
// Sound design: cards
// ===========================================================================

/** card_flip — a quick rising whoosh of air that ends in a light snap. */
function cardFlip({ sr, rng }) {
  const length = 0.22;
  const n = samplesFor(length, sr);
  const snapAt = 0.165;
  const whoosh = unitRms(bandpass(pinkNoise(n, rng), sr, sweep([[0, 650], [snapAt, 2600]]), 1.1));
  const out = mixShaped(new Float64Array(n), sr, whoosh, curve([[0, 0], [0.09, 0.09], [snapAt - 0.006, 0.2], [snapAt + 0.012, 0]]));
  addGrain(out, sr, rng, { time: 0.003, freq: 2400, q: 1.2, gain: 0.12, attack: 0.0004, decay: 0.0012 });
  addGrain(out, sr, rng, { time: snapAt, freq: 3300, q: 1.4, gain: 1.3, attack: 0.0002, decay: 0.0009 });
  addGrain(out, sr, rng, { time: snapAt, freq: 1200, q: 2.2, gain: 0.45, attack: 0.0004, decay: 0.0028 });
  addGrain(out, sr, rng, { time: snapAt, type: 'lowpass', freq: 400, q: 0.7, gain: 0.35, attack: 0.001, decay: 0.008 });
  return reverb(out, sr, { rt60: 0.3, wet: 0.12, size: 0.5 });
}

/**
 * card_place — a soft placement on felt: mostly a muffled noise "thup" (a light card, not a drum),
 * a hint of pitched body, the puff of air pushed from under the card and a faint papery edge.
 */
function cardPlace({ sr, rng }) {
  const out = silence(0.13, sr);
  addGrain(out, sr, rng, { time: 0, type: 'lowpass', freq: 700, q: 0.7, gain: 1, attack: 0.002, decay: 0.012 });
  addOsc(out, sr, { table: SINE, freq: (t) => 210 * (1 + 0.25 * Math.exp(-t / 0.006)), amp: (t) => 0.22 * perc(t, 0.002, 0.012) });
  addGrain(out, sr, rng, { time: 0.0005, freq: 1400, q: 0.8, gain: 0.18, attack: 0.001, decay: 0.006 });
  addGrain(out, sr, rng, { time: 0.001, freq: 2600, q: 1.2, gain: 0.1, attack: 0.0003, decay: 0.0012 });
  return out;
}

/** card_whoosh — light air movement as a card is swiped away: brightest as it passes closest. */
function cardWhoosh({ sr, rng }) {
  const length = 0.26;
  const n = samplesFor(length, sr);
  const source = whiteNoise(n, rng);
  const env = curve([
    [0, 0],
    [0.095, 1],
    [0.255, 0],
  ]);
  const body = unitRms(bandpass(source, sr, sweep([[0, 800], [0.095, 1800], [0.26, 600]]), 0.9));
  const air = unitRms(highpass(source, sr, 5000));
  const out = mixShaped(new Float64Array(n), sr, body, (t) => 0.3 * env(t));
  return mixShaped(out, sr, air, (t) => 0.05 * env(t) ** 2);
}

// ===========================================================================
// Sound design: rarity reveals
// ===========================================================================

/** reveal_common — a warm, soft bronze chime (D5) with a gentle octave-below bloom. */
function revealCommon({ sr, rng }) {
  const out = silence(1.0, sr);
  addBell(out, sr, rng, { freq: hz('D5'), gain: 1, decay: 0.26, timbre: TIMBRES.bronze, brightness: 0.75, attack: 0.0025 });
  addOsc(out, sr, { table: SINE, freq: hz('D4'), amp: (t) => 0.16 * perc(t, 0.02, 0.3) });
  addGrain(out, sr, rng, { time: 0, freq: 1800, q: 0.8, gain: 0.08, attack: 0.0005, decay: 0.002 });
  return reverb(out, sr, { rt60: 1.2, wet: 0.4, predelay: 0.018, damping: 0.4 });
}

/** reveal_rare — a brighter silver chime (A5 + E6) with a little sparkle above it. */
function revealRare({ sr, rng }) {
  const out = silence(1.5, sr);
  addBell(out, sr, rng, { freq: hz('A4'), gain: 0.25, decay: 0.45, timbre: TIMBRES.bronze, brightness: 0.6 });
  addBell(out, sr, rng, { freq: hz('A5'), gain: 0.8, decay: 0.45, timbre: TIMBRES.silver, brightness: 0.8 });
  addBell(out, sr, rng, { start: 0.03, freq: hz('E6'), gain: 0.62, decay: 0.38, timbre: TIMBRES.silver, brightness: 0.8 });
  addSparkles(out, sr, rng, { start: 0.07, end: 0.75, count: 7, notes: ['D7', 'E7', 'F#7', 'A7', 'B7'], gain: 0.22, decay: [0.05, 0.11] });
  return reverb(out, sr, { rt60: 1.7, wet: 0.5, predelay: 0.02, damping: 0.35 });
}

/** reveal_epic — a rich, slightly mysterious Dmaj9 chord: pad body, rolled bells, shimmer. */
function revealEpic({ sr, rng }) {
  const length = 2.3;
  const out = silence(length, sr);
  addOsc(out, sr, { table: SINE, freq: hz('D2'), amp: (t) => 0.2 * perc(t, 0.04, 0.8) });
  const padCutoff = sweep([[0, 700], [0.25, 1700], [2.3, 650]]);
  for (const [note, level] of [['D3', 0.26], ['A3', 0.22], ['F#4', 0.18], ['C#5', 0.13]]) {
    const amp = (t) => level * smooth01(t / 0.12) * Math.exp(-t / 0.85);
    mixInto(out, padVoice(sr, rng, { duration: length, freq: hz(note), detune: [-8, 0, 8], tilt: 1.15, cutoff: padCutoff, q: 0.8, amp }));
  }
  // Bells rolled upward ([note, start s, gain]); the major seventh (C#) and ninth (E) carry the mystery.
  for (const [note, time, gain] of [['F#5', 0, 0.5], ['A5', 0.035, 0.45], ['C#6', 0.07, 0.4], ['E6', 0.105, 0.38]]) {
    addBell(out, sr, rng, { start: time, freq: hz(note), gain, decay: 0.7, timbre: TIMBRES.silver, brightness: 0.6 });
  }
  addSparkles(out, sr, rng, { start: 0.18, end: 1.3, count: 9, notes: ['E7', 'F#7', 'A7', 'C#8'], gain: 0.13, decay: [0.07, 0.16] });
  return reverb(out, sr, { rt60: 2.6, wet: 0.55, predelay: 0.025, damping: 0.38 });
}

/** legendary_anticipation — a low resonant swell that builds for ~2.2 s, a faint shimmer quickening above. */
function legendaryAnticipation({ sr, rng }) {
  const length = 2.2;
  const n = samplesFor(length, sr);
  const out = new Float64Array(n);
  const rise = (t) => Math.min(1, t / 2.15) ** 2.2; // keeps accelerating to the very end
  const fadeIn = (t) => smooth01(t / 0.15);
  const handOff = (t) => smooth01((length - t) / 0.09);
  // Low resonant swell: D2 / A2 / D3, the resonant filter opening as the tension builds.
  for (const [note, level] of [['D2', 0.5], ['A2', 0.32], ['D3', 0.28]]) {
    const amp = (t) => level * (0.05 + 0.95 * rise(t)) * fadeIn(t) * handOff(t);
    mixInto(out, padVoice(sr, rng, { duration: length, freq: hz(note), detune: [-6, 0, 5], tilt: 1.05, cutoff: (t) => 160 * 9 ** rise(t), q: 1.6, amp }));
  }
  // Resonant air: a narrow band of noise climbing with the swell.
  const air = unitRms(bandpass(pinkNoise(n, rng), sr, sweep([[0, 220], [length, 1100]]), 5));
  mixShaped(out, sr, air, (t) => 0.12 * rise(t) * handOff(t));
  // Faint high shimmer: a soft A6/D7/E7 cluster whose tremolo quickens, plus a rising airy band.
  const cluster = new Float64Array(n);
  for (const [note, level] of [['A6', 1], ['D7', 0.7], ['E7', 0.45]]) {
    addOsc(cluster, sr, { table: SINE, freq: hz(note), amp: level, phase: rng.next() });
  }
  let tremolo = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    tremolo += (5 + 9 * rise(t)) / sr;
    out[i] += 0.035 * rise(t) ** 1.5 * (0.6 + 0.4 * Math.sin(TAU * tremolo)) * handOff(t) * cluster[i];
  }
  const whistle = unitRms(bandpass(whiteNoise(n, rng), sr, sweep([[0, 2500], [length, 6500]]), 8));
  mixShaped(out, sr, whistle, (t) => 0.025 * rise(t) * handOff(t));
  return reverb(out, sr, { rt60: 2.2, wet: 0.45, predelay: 0.02 });
}

/**
 * legendary_reveal — the crowning moment: a deep D fundamental, warm horns resolving a
 * suspension (Dsus4 -> D), a string sheen blooming above, a grand bell with silver chimes and a
 * long, dark hall. Restrained: no crash, no fanfare.
 */
function legendaryReveal({ sr, rng }) {
  const length = 4.5;
  const out = silence(length, sr);
  const release = (t, from, tau) => (t < from ? 1 : Math.exp(-(t - from) / tau));
  const vibrato = (t) => 1 + 0.003 * Math.sin(TAU * 4.7 * t) * smooth01((t - 0.6) / 0.8); // ~5 cents, delayed
  const held = (note) => {
    const freq = hz(note);
    return () => freq;
  };

  // 1) Deep fundamental (D2). Harmonics up to ~400 Hz keep it audible on phone speakers.
  mixInto(out, padVoice(sr, rng, { duration: length, freq: hz('D2'), detune: [-3, 3], tilt: 1.3, cutoff: 420, amp: (t) => 0.5 * perc(t, 0.035, 2.0) }));
  addOsc(out, sr, { table: SINE, freq: hz('D2'), amp: (t) => 0.22 * perc(t, 0.03, 1.7) });
  addGrain(out, sr, rng, { time: 0, type: 'lowpass', freq: 240, q: 0.7, gain: 0.6, attack: 0.006, decay: 0.07 });

  // 2) Warm horns: D3 A3 D4, plus an inner voice resolving the suspension G4 -> F#4 (Dsus4 -> D).
  const hornCutoff = sweep([[0, 330], [0.13, 1600], [1.1, 1050], [2.6, 800], [4.5, 450]]);
  const hornAmp = (t) => smooth01(t / 0.08) * (0.72 + 0.28 * Math.exp(-t / 0.5)) * release(t, 2.0, 0.7);
  const horns = [
    // [pitch over time, level]
    [held('D3'), 0.34],
    [held('A3'), 0.3],
    [held('D4'), 0.24],
    [sweep([[0, hz('G4')], [0.44, hz('G4')], [0.49, hz('F#4')]]), 0.22],
  ];
  for (const [pitch, level] of horns) {
    const amp = (t) => level * hornAmp(t);
    mixInto(out, padVoice(sr, rng, { duration: length, freq: (t) => pitch(t) * vibrato(t), detune: [-5, 0, 5], tilt: 1.0, cutoff: hornCutoff, q: 0.8, amp }));
  }

  // 3) Strings: A4 D5 F#5 with a wider ensemble detune and a slower bloom.
  const stringCutoff = sweep([[0, 2200], [0.6, 4200], [4.5, 2200]]);
  for (const [note, level] of [['A4', 0.13], ['D5', 0.11], ['F#5', 0.09]]) {
    const pitch = held(note);
    const amp = (t) => level * smooth01(t / 0.5) * release(t, 2.2, 0.8);
    mixInto(out, padVoice(sr, rng, { duration: length, freq: (t) => pitch(t) * vibrato(t), detune: [-12, -4, 4, 12], tilt: 1.0, cutoff: stringCutoff, q: 0.6, amp }));
  }

  // 4) Bells: a grand bell on D5, then silver chimes rolled upward ([note, start s, gain]).
  addBell(out, sr, rng, { freq: hz('D5'), gain: 0.7, decay: 1.5, timbre: TIMBRES.grand, brightness: 0.8 });
  for (const [note, time, gain] of [['A5', 0.03, 0.36], ['D6', 0.06, 0.3], ['F#6', 0.09, 0.25]]) {
    addBell(out, sr, rng, { start: time, freq: hz(note), gain, decay: 0.9, timbre: TIMBRES.silver, brightness: 0.7 });
  }

  // 5) Sparkles drifting up into the hall.
  addSparkles(out, sr, rng, { start: 0.2, end: 2.4, count: 12, notes: ['D7', 'E7', 'F#7', 'A7', 'B7', 'D8'], gain: 0.18, decay: [0.08, 0.2] });

  return reverb(out, sr, { rt60: 3.6, wet: 0.65, predelay: 0.035, damping: 0.4, lowCut: 160, highCut: 6000 });
}

/** shimmer_tail — delicate trailing sparkles in a bright, airy space. */
function shimmerTail({ sr, rng }) {
  const out = silence(1.6, sr);
  addSparkles(out, sr, rng, {
    start: 0,
    end: 1.15,
    count: 16,
    notes: ['D6', 'A6', 'D7', 'E7', 'F#7', 'A7', 'B7', 'D8'],
    gain: 0.5,
    decay: [0.07, 0.2],
  });
  return reverb(out, sr, { rt60: 1.8, wet: 0.65, predelay: 0.015, damping: 0.3 });
}

// ===========================================================================
// Sound design: progress and learning (never punishing)
// ===========================================================================

/** quest_complete — a gentle triumphant motif (A4 D5 F#5 -> D6) over a blooming D-major pad. */
function questComplete({ sr, rng }) {
  const length = 2.2;
  const out = silence(length, sr);
  const motif = [
    // [note, start s, gain, decay s]
    ['A4', 0, 0.55, 0.3],
    ['D5', 0.13, 0.6, 0.3],
    ['F#5', 0.26, 0.66, 0.32],
    ['D6', 0.42, 0.85, 0.7],
    ['A5', 0.42, 0.38, 0.6],
  ];
  for (const [note, time, gain, decay] of motif) {
    addBell(out, sr, rng, { start: time, freq: hz(note), gain, decay, timbre: TIMBRES.celesta, brightness: 0.75 });
  }
  const padStart = 0.4;
  const padCutoff = sweep([[0, 800], [0.15, 1500], [1.8, 650]]);
  for (const [note, level] of [['D3', 0.2], ['A3', 0.17], ['D4', 0.14], ['F#4', 0.12]]) {
    const amp = (t) => level * smooth01(t / 0.09) * Math.exp(-t / 0.6);
    const voice = padVoice(sr, rng, { duration: length - padStart, freq: hz(note), detune: [-6, 0, 6], tilt: 1.2, cutoff: padCutoff, amp });
    mixInto(out, voice, 1, samplesFor(padStart, sr));
  }
  addSparkles(out, sr, rng, { start: 0.47, end: 1.1, count: 5, notes: ['D7', 'F#7', 'A7'], gain: 0.1, decay: [0.06, 0.12] });
  return reverb(out, sr, { rt60: 1.6, wet: 0.5, predelay: 0.02, damping: 0.35 });
}

/** answer_correct — a soft, pleasant rise: A5 then D6 (with a quiet F#5 beneath it). */
function answerCorrect({ sr, rng }) {
  const out = silence(0.55, sr);
  addBell(out, sr, rng, { freq: hz('A5'), gain: 0.7, decay: 0.11, timbre: TIMBRES.celesta, brightness: 0.7 });
  addBell(out, sr, rng, { start: 0.09, freq: hz('D6'), gain: 0.95, decay: 0.16, timbre: TIMBRES.celesta, brightness: 0.7 });
  addBell(out, sr, rng, { start: 0.09, freq: hz('F#5'), gain: 0.3, decay: 0.15, timbre: TIMBRES.celesta, brightness: 0.6 });
  return reverb(out, sr, { rt60: 0.7, wet: 0.35, predelay: 0.012, damping: 0.4, size: 0.7 });
}

/** answer_gentle — one soft, rounded felt-mallet note (A4): neutral, never a buzzer. */
function answerGentle({ sr, rng }) {
  const out = silence(0.45, sr);
  addBell(out, sr, rng, { freq: hz('A4'), gain: 1, decay: 0.11, timbre: TIMBRES.wood, brightness: 0.6, attack: 0.006 });
  addOsc(out, sr, { table: SINE, freq: hz('A3'), amp: (t) => 0.22 * perc(t, 0.01, 0.09) });
  return reverb(lowpass(out, sr, 2400), sr, { rt60: 0.55, wet: 0.25, size: 0.6 });
}

/** xp_gain — a subtle tick, then three soft glints that sparkle rather than form a tune. */
function xpGain({ sr, rng }) {
  const out = silence(0.32, sr);
  addGrain(out, sr, rng, { time: 0, freq: 4800, q: 1.4, gain: 0.55, attack: 0.0003, decay: 0.0008 });
  addBell(out, sr, rng, { freq: hz('D7'), gain: 0.08, decay: 0.01, timbre: TIMBRES.tink, attack: 0.0008 });
  const glints = [
    // [note, start s, gain, decay s]: not in rising order, so they read as sparkle rather than a tune
    ['D7', 0.028, 0.42, 0.055],
    ['A7', 0.058, 0.32, 0.06],
    ['F#7', 0.094, 0.26, 0.08],
  ];
  for (const [note, time, gain, decay] of glints) {
    addBell(out, sr, rng, { start: time, freq: hz(note), gain, decay, timbre: TIMBRES.glint, brightness: 0.7, attack: 0.002 });
  }
  return reverb(out, sr, { rt60: 0.55, wet: 0.35, predelay: 0.01, size: 0.6 });
}

// ===========================================================================
// Sound design: ambient loops
// ===========================================================================

/**
 * Sum of drone voices tuned in just intonation: each voice sits at `ratio` times `root`, and the
 * root must be chosen so every voice completes a whole number of cycles per loop. Each voice is a
 * soft saw flanked by two quieter copies detuned by +-`spread` cycles per loop (a slow chorus that
 * still loops); the flanking phases are locked a quarter-cycle from the center so the fundamental
 * breathes gently (by at most ~2 dB) instead of beating down to silence. Each voice also swells
 * with its own loop-periodic LFO: gain = level * (1 - depth * (1 - lfo) / 2).
 */
function droneVoices(n, sr, rng, { seconds, root, voices, maxHz, tilt }) {
  const drone = new Float64Array(n);
  for (const { ratio, level, cycles, phase, depth, spread = 1 } of voices) {
    const swell = loopLfo(cycles, seconds, phase);
    const gain = (t) => (level / 1.8) * (1 - 0.5 * depth * (1 - swell(t)));
    const base = root * ratio;
    if (Math.abs(base * seconds - Math.round(base * seconds)) > 1e-6) {
      throw new Error(`Drone voice ${ratio} x ${root} Hz does not complete whole cycles per loop`);
    }
    const centerPhase = rng.next();
    const lowPhase = rng.next();
    const highPhase = 2 * (centerPhase + 0.25) - lowPhase;
    const oscillators = [
      [base - spread / seconds, 0.4, lowPhase],
      [base, 1, centerPhase],
      [base + spread / seconds, 0.4, highPhase],
    ];
    for (const [freq, weight, oscPhase] of oscillators) {
      addOsc(drone, sr, { table: softSaw(maxHz / freq, tilt), freq, amp: (t) => weight * gain(t), phase: oscPhase });
    }
  }
  return drone;
}

/** ambient_hall_loop — the Royal Hall: a warm, just-tuned D drone (D2 A2 D3 + F#3/A3 color, faint E4) breathing slowly. */
function ambientHallLoop({ sr, rng }) {
  const seconds = 16;
  return renderLoop(
    seconds,
    sr,
    (n) => {
      const drone = droneVoices(n, sr, rng, {
        seconds,
        // D2 snapped so every half-integer ratio below is whole-cycle (73.375 Hz, within 1 cent).
        root: loopHz(hz('D2'), seconds / 2),
        voices: [
          // D2 is kept moderate: phone speakers cannot reproduce it, so its harmonics and the
          // voices above carry the chord there, while headphones still get the low warmth.
          { ratio: 1, level: 0.55, cycles: 1, phase: 0, depth: 0.15 }, // D2
          { ratio: 3 / 2, level: 0.6, cycles: 1, phase: 0.35, depth: 0.25 }, // A2
          { ratio: 2, level: 0.55, cycles: 2, phase: 0.1, depth: 0.25 }, // D3
          { ratio: 5 / 2, level: 0.3, cycles: 1, phase: 0.6, depth: 0.9, spread: 2 }, // F#3
          { ratio: 3, level: 0.2, cycles: 1, phase: 0.85, depth: 0.5, spread: 2 }, // A3
          { ratio: 9 / 2, level: 0.1, cycles: 1, phase: 0.1, depth: 1, spread: 3 }, // E4
        ],
        maxHz: 4000,
        tilt: 1.25,
      });
      // Slow filter movement: the low-pass breathes once per loop between ~530 and ~1150 Hz.
      const warmth = loopLfo(1, seconds, 0.25);
      const hall = processPeriodic(drone, (x) => lowpass(x, sr, (t) => 780 * 2 ** (0.55 * warmth(t)), 0.8));
      // A whisper of air moving through the hall.
      const air = unitRms(processPeriodic(whiteNoise(n, rng), (x) => lowpass(bandpass(pinkFilter(x), sr, 2000, 0.5), sr, 5000)));
      const breath = loopLfo(2, seconds, 0.4);
      const airLevel = 0.05 * rmsOf(hall);
      return mixShaped(hall, sr, air, (t) => airLevel * (1 + 0.5 * breath(t)));
    },
    (x) => reverb(x, sr, { rt60: 4.5, wet: 0.7, predelay: 0.045, damping: 0.45, lowCut: 120, highCut: 4500 }),
  );
}

/**
 * ambient_treasury_loop — darker, quieter, more suspenseful: a low D throb, a minor third trading
 * places with a shadowy flat sixth, a cold draught, and two faint glints of gold in the dark.
 */
function ambientTreasuryLoop({ sr, rng }) {
  const seconds = 12;
  return renderLoop(
    seconds,
    sr,
    (n) => {
      const drone = droneVoices(n, sr, rng, {
        seconds,
        // D2 snapped so every ratio below (denominators 2 and 5) is whole-cycle (73.33 Hz).
        root: loopHz(hz('D2'), seconds / 10),
        voices: [
          { ratio: 1, level: 0.7, cycles: 6, phase: 0, depth: 0.22 }, // D2, slow 0.5 Hz throb
          { ratio: 3 / 2, level: 0.55, cycles: 1, phase: 0.2, depth: 0.3 }, // A2
          { ratio: 2, level: 0.35, cycles: 1, phase: 0.7, depth: 0.4 }, // D3
          { ratio: 12 / 5, level: 0.24, cycles: 1, phase: 0, depth: 0.95, spread: 2 }, // F3
          { ratio: 16 / 5, level: 0.13, cycles: 1, phase: 0.5, depth: 1, spread: 2 }, // Bb3
          { ratio: 3, level: 0.12, cycles: 2, phase: 0.3, depth: 0.6, spread: 2 }, // A3
        ],
        maxHz: 2500,
        tilt: 1.45,
      });
      const shade = loopLfo(1, seconds, 0.6);
      const vault = processPeriodic(drone, (x) => lowpass(x, sr, (t) => 420 * 2 ** (0.45 * shade(t)), 0.9));
      const draught = unitRms(processPeriodic(whiteNoise(n, rng), (x) => lowpass(bandpass(pinkFilter(x), sr, 650, 0.7), sr, 1800)));
      const breath = loopLfo(1, seconds, 0.15);
      const level = rmsOf(vault);
      mixShaped(vault, sr, draught, (t) => 0.07 * level * (1 + 0.6 * breath(t)));
      // Two faint glints of gold ([note, start s]); reverb blurs them into the dark.
      for (const [note, time] of [['A6', 2.7], ['D7', 8.1]]) {
        addBell(vault, sr, rng, { start: time, freq: hz(note), gain: 0.25 * level, decay: 0.5, timbre: TIMBRES.glint, brightness: 0.6, wrap: true });
      }
      return vault;
    },
    (x) => reverb(x, sr, { rt60: 5.5, wet: 0.75, predelay: 0.05, damping: 0.6, lowCut: 100, highCut: 3500 }),
  );
}

// ===========================================================================
// Catalogue
// ===========================================================================

/**
 * Every sound the app ships. `render` returns raw samples (one-shots) or one finished period
 * (loops). Optional: `loop`, `rate` (default 44.1 kHz), `peakDb` (default -3 dBFS) and `fadeOut`
 * (seconds, default 5 ms) for one-shots whose tails need a longer taper.
 */
const SOUNDS = [
  // UI navigation
  { id: 'ui_tap', render: uiTap },
  { id: 'ui_select', render: uiSelect },
  { id: 'ui_back', render: uiBack },
  { id: 'ui_confirm', render: uiConfirm, fadeOut: 0.08 },
  { id: 'stone_slide', render: stoneSlide, fadeOut: 0.01 },

  // Foil pack
  { id: 'pack_grab', render: packGrab },
  { id: 'foil_stretch_loop', render: foilStretchLoop, loop: true },
  { id: 'foil_rip_1', render: (ctx) => foilRip(ctx, { length: 0.085, center: 3200, density: 900, flutter: 260 }) },
  { id: 'foil_rip_2', render: (ctx) => foilRip(ctx, { length: 0.07, center: 4100, density: 1200, flutter: 340 }) },
  { id: 'foil_rip_3', render: (ctx) => foilRip(ctx, { length: 0.105, center: 2600, density: 750, flutter: 200 }) },
  { id: 'foil_rip_4', render: (ctx) => foilRip(ctx, { length: 0.095, center: 4700, density: 1050, flutter: 300 }) },
  { id: 'foil_release', render: foilRelease, fadeOut: 0.06 },
  { id: 'wrapper_fall', render: wrapperFall, fadeOut: 0.04 },
  { id: 'cards_slide', render: cardsSlide, fadeOut: 0.03 },
  { id: 'card_shuffle', render: cardShuffle, fadeOut: 0.03 },

  // Cards
  { id: 'card_flip', render: cardFlip, fadeOut: 0.02 },
  { id: 'card_place', render: cardPlace, fadeOut: 0.01 },
  { id: 'card_whoosh', render: cardWhoosh },

  // Rarity reveals
  { id: 'reveal_common', render: revealCommon, fadeOut: 0.2 },
  { id: 'reveal_rare', render: revealRare, fadeOut: 0.3 },
  { id: 'reveal_epic', render: revealEpic, fadeOut: 0.4 },
  { id: 'legendary_anticipation', render: legendaryAnticipation },
  { id: 'legendary_reveal', render: legendaryReveal, fadeOut: 0.7 },
  { id: 'shimmer_tail', render: shimmerTail, fadeOut: 0.3 },

  // Progress and learning
  { id: 'quest_complete', render: questComplete, fadeOut: 0.35 },
  { id: 'answer_correct', render: answerCorrect, fadeOut: 0.1 },
  { id: 'answer_gentle', render: answerGentle, fadeOut: 0.08 },
  { id: 'xp_gain', render: xpGain, fadeOut: 0.06 },

  // Ambient
  { id: 'ambient_hall_loop', render: ambientHallLoop, loop: true, rate: AMBIENT_RATE, peakDb: AMBIENT_PEAK_DBFS },
  { id: 'ambient_treasury_loop', render: ambientTreasuryLoop, loop: true, rate: AMBIENT_RATE, peakDb: AMBIENT_PEAK_DBFS },
];

// ===========================================================================
// Rendering and verification
// ===========================================================================

function renderSound(sound) {
  const sampleRate = sound.rate ?? SFX_RATE;
  const raw = sound.render({ sr: sampleRate, rng: createRng(hashString(sound.id)) });
  if (!raw.every(Number.isFinite)) throw new Error(`${sound.id}: synthesis produced non-finite samples`);
  const mastered = sound.loop ? raw : masterOneShot(raw, sampleRate, sound.fadeOut ?? MIN_FADE_OUT_S);
  return { sampleRate, samples: normalize(mastered, sound.peakDb ?? SFX_PEAK_DBFS) };
}

/** Measure a decoded file: levels, DC, edge samples and (for loops) the seam against normal steps. */
function analyze(samples) {
  const n = samples.length;
  const steps = new Float64Array(n - 1);
  let peak = 0;
  let sum = 0;
  let sumSquares = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    peak = Math.max(peak, Math.abs(v));
    sum += v;
    sumSquares += v * v;
    if (i > 0) steps[i - 1] = Math.abs(v - samples[i - 1]);
  }
  steps.sort();
  return {
    peakDb: gainToDb(peak / 32767),
    rmsDb: gainToDb(Math.sqrt(sumSquares / n) / 32767),
    dc: sum / n / 32767,
    first: samples[0],
    last: samples[n - 1],
    seam: Math.abs(samples[0] - samples[n - 1]),
    p99Step: steps[Math.floor(0.99 * (steps.length - 1))],
  };
}

/** Re-read every file from disk, print a report and return true when all checks pass. */
function verify(sounds) {
  const header = ['file', 'dur s', 'rate', 'KB', 'peak dBFS', 'RMS dBFS', 'DC dBFS', 'edges / seam', 'status'];
  const rows = [];
  let totalBytes = 0;
  let failures = 0;
  for (const sound of sounds) {
    let bytes;
    let wav;
    try {
      bytes = readFileSync(path.join(OUT_DIR, `${sound.id}.wav`));
      wav = decodeWav(bytes);
    } catch (error) {
      rows.push([`${sound.id}.wav`, '', '', '', '', '', '', '', `FAIL: ${error.code ?? error.message}`]);
      failures++;
      continue;
    }
    totalBytes += bytes.length;
    const problems = [];
    const stats = analyze(wav.samples);
    const targetDb = sound.peakDb ?? SFX_PEAK_DBFS;
    if (wav.sampleRate !== (sound.rate ?? SFX_RATE)) problems.push('sample rate');
    if (Math.abs(stats.peakDb - targetDb) > 0.1) problems.push('peak level');
    if (Math.abs(stats.dc) > DC_LIMIT) problems.push('DC offset');
    let edges;
    if (sound.loop) {
      edges = `seam ${stats.seam} LSB (p99 step ${stats.p99Step})`;
      if (stats.seam > Math.max(stats.p99Step, 2)) problems.push('seam click');
    } else {
      edges = `${stats.first} / ${stats.last} LSB`;
      if (Math.abs(stats.first) > 1 || Math.abs(stats.last) > 1) problems.push('edge click');
    }
    if (problems.length) failures++;
    rows.push([
      `${sound.id}.wav`,
      (wav.samples.length / wav.sampleRate).toFixed(3),
      String(wav.sampleRate),
      (bytes.length / 1024).toFixed(1),
      stats.peakDb.toFixed(2),
      stats.rmsDb.toFixed(1),
      stats.dc === 0 ? '-inf' : gainToDb(Math.abs(stats.dc)).toFixed(0),
      edges,
      problems.length ? `FAIL: ${problems.join(', ')}` : 'ok',
    ]);
  }
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column].length)));
  const format = (row) => row.map((cell, column) => (column === 0 || column >= 7 ? cell.padEnd(widths[column]) : cell.padStart(widths[column]))).join('  ');
  console.log(`\n${format(header)}\n${widths.map((w) => '-'.repeat(w)).join('  ')}`);
  for (const row of rows) console.log(format(row));
  console.log(`\n${sounds.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB total — ${failures ? `${failures} FAILED` : 'all checks passed'}`);
  return failures === 0;
}

function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  const wanted = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null;
  const sounds = wanted ? SOUNDS.filter((sound) => wanted.has(sound.id)) : SOUNDS;
  const unknown = wanted ? [...wanted].filter((id) => !SOUNDS.some((sound) => sound.id === id)) : [];
  if (unknown.length) {
    console.error(`Unknown sound id(s): ${unknown.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (!args.includes('--verify')) {
    mkdirSync(OUT_DIR, { recursive: true });
    for (const sound of sounds) {
      const started = Date.now();
      const { sampleRate, samples } = renderSound(sound);
      writeFileSync(path.join(OUT_DIR, `${sound.id}.wav`), encodeWav(samples, sampleRate, createRng(hashString(`${sound.id}/dither`))));
      console.log(`rendered ${sound.id.padEnd(24)} ${String(Date.now() - started).padStart(5)} ms`);
    }
  }
  process.exitCode = verify(sounds) ? 0 : 1;
}

main();
