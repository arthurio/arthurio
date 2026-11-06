/**
 * Pure digital-rain core: column state stepping.
 *
 * No DOM, no clocks, no Math.random. The caller injects an RNG and drives time
 * in fixed steps, which makes every function here deterministic and testable.
 */

export type Rng = () => number;

export const MIN_INTENSITY = 0;
export const MAX_INTENSITY = 10;
export const DEFAULT_INTENSITY = 5;

export interface Column {
  /** Whether a streak is currently falling in this column. */
  active: boolean;
  /** Seconds until the next streak spawns (only meaningful while inactive). */
  delay: number;
  /** Fractional row position of the streak head. */
  head: number;
  /** Last integer row for which a glyph has been generated. */
  lastRow: number;
  /** Fall speed in rows per second. */
  speed: number;
  /** Trail length in rows. */
  length: number;
  /** Glyph indices, newest (head) first. */
  glyphs: number[];
}

export interface RainState {
  cols: number;
  rows: number;
  intensity: number;
  glyphCount: number;
  columns: Column[];
  rng: Rng;
}

export interface RainConfig {
  cols: number;
  rows: number;
  glyphCount: number;
  rng: Rng;
  intensity?: number;
}

/** Clamp to [0, 10] and map NaN to 0. */
export function clampIntensity(value: number): number {
  if (Number.isNaN(value)) return MIN_INTENSITY;
  return Math.min(MAX_INTENSITY, Math.max(MIN_INTENSITY, value));
}

/** Seconds a column waits before spawning its next streak. Infinity when off. */
export function nextDelay(intensity: number, rng: Rng): number {
  if (intensity <= 0) return Infinity;
  const max = 10 - intensity * 0.9;
  return rng() * max;
}

function newColumn(state: Pick<RainState, 'intensity' | 'rng'>): Column {
  return {
    active: false,
    delay: nextDelay(state.intensity, state.rng),
    head: 0,
    lastRow: -1,
    speed: 0,
    length: 0,
    glyphs: [],
  };
}

export function createRainState(config: RainConfig): RainState {
  const cols = Math.max(0, Math.floor(config.cols));
  const state: RainState = {
    cols,
    rows: Math.max(1, Math.floor(config.rows)),
    intensity: clampIntensity(config.intensity ?? DEFAULT_INTENSITY),
    glyphCount: Math.max(1, Math.floor(config.glyphCount)),
    columns: [],
    rng: config.rng,
  };
  for (let i = 0; i < cols; i++) state.columns.push(newColumn(state));
  return state;
}

/** Change density/speed. Re-arms columns that were waiting forever (off). */
export function setRainIntensity(state: RainState, intensity: number): void {
  state.intensity = clampIntensity(intensity);
  for (const col of state.columns) {
    if (!col.active && !Number.isFinite(col.delay)) {
      col.delay = nextDelay(state.intensity, state.rng);
    }
  }
}

/** Resize the grid, keeping existing columns where possible. */
export function resizeRainState(state: RainState, cols: number, rows: number): void {
  const nextCols = Math.max(0, Math.floor(cols));
  state.rows = Math.max(1, Math.floor(rows));
  if (nextCols < state.columns.length) {
    state.columns.length = nextCols;
  } else {
    while (state.columns.length < nextCols) state.columns.push(newColumn(state));
  }
  state.cols = nextCols;
}

function randomGlyph(state: RainState): number {
  return Math.floor(state.rng() * state.glyphCount) % state.glyphCount;
}

function spawn(state: RainState, col: Column): void {
  const speedFactor = 0.6 + state.intensity * 0.08;
  col.active = true;
  col.head = 0;
  col.lastRow = -1;
  col.speed = (6 + state.rng() * 14) * speedFactor;
  const maxLen = Math.max(6, Math.floor(state.rows * 0.6));
  col.length = Math.min(state.rows, 6 + Math.floor(state.rng() * (maxLen - 5)));
  col.glyphs = [];
}

/** Advance the simulation by `dt` seconds (call with a fixed step). */
export function stepRain(state: RainState, dt: number): void {
  if (!(dt > 0)) return;
  for (const col of state.columns) {
    if (!col.active) {
      col.delay -= dt;
      if (col.delay <= 0 && state.intensity > 0) {
        spawn(state, col);
      } else {
        continue;
      }
    }
    col.head += col.speed * dt;
    const headRow = Math.floor(col.head);
    while (col.lastRow < headRow) {
      col.lastRow++;
      col.glyphs.unshift(randomGlyph(state));
      if (col.glyphs.length > col.length) col.glyphs.pop();
    }
    // Occasional glyph shimmer inside the trail.
    if (col.glyphs.length > 0 && state.rng() < 0.05) {
      col.glyphs[Math.floor(state.rng() * col.glyphs.length)] = randomGlyph(state);
    }
    if (col.head - col.length > state.rows) {
      col.active = false;
      col.glyphs = [];
      col.delay = nextDelay(state.intensity, state.rng);
    }
  }
}

/** Run the simulation forward so the first drawn frame is already populated. */
export function warmUp(state: RainState, seconds: number, stepSeconds: number): void {
  const steps = Math.floor(seconds / stepSeconds);
  for (let i = 0; i < steps; i++) stepRain(state, stepSeconds);
}

export interface Accumulated {
  steps: number;
  accumulator: number;
}

/**
 * Fixed-step time accumulator. Converts a variable frame time into a whole
 * number of fixed steps, capping catch-up work after long stalls.
 */
export function accumulate(
  accumulator: number,
  frameMs: number,
  stepMs: number,
  maxSteps: number,
): Accumulated {
  const total = accumulator + Math.max(0, frameMs);
  const wanted = Math.floor(total / stepMs);
  if (wanted > maxSteps) {
    return { steps: maxSteps, accumulator: total % stepMs };
  }
  return { steps: wanted, accumulator: total - wanted * stepMs };
}

/** Small deterministic PRNG (mulberry32) for tests and reproducible frames. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
