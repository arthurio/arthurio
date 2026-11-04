import { describe, expect, it } from 'vitest';
import {
  accumulate,
  clampIntensity,
  createRainState,
  nextDelay,
  resizeRainState,
  seededRng,
  setRainIntensity,
  stepRain,
  warmUp,
  type RainState,
} from './core';

const make = (intensity = 5, seed = 1, cols = 20, rows = 30): RainState =>
  createRainState({ cols, rows, glyphCount: 50, rng: seededRng(seed), intensity });

const activeCount = (s: RainState): number => s.columns.filter((c) => c.active).length;

describe('clampIntensity', () => {
  it('clamps and handles NaN', () => {
    expect(clampIntensity(-3)).toBe(0);
    expect(clampIntensity(99)).toBe(10);
    expect(clampIntensity(Number.NaN)).toBe(0);
    expect(clampIntensity(4)).toBe(4);
  });
});

describe('nextDelay', () => {
  it('is infinite when off and shorter at higher intensity', () => {
    expect(nextDelay(0, () => 0.5)).toBe(Infinity);
    expect(nextDelay(10, () => 0.5)).toBeLessThan(nextDelay(1, () => 0.5));
  });
});

describe('stepRain', () => {
  it('is deterministic for the same seed', () => {
    const a = make();
    const b = make();
    warmUp(a, 5, 1 / 30);
    warmUp(b, 5, 1 / 30);
    expect(a.columns).toEqual(b.columns);
  });

  it('differs for different seeds', () => {
    const a = make(5, 1);
    const b = make(5, 2);
    warmUp(a, 5, 1 / 30);
    warmUp(b, 5, 1 / 30);
    expect(a.columns).not.toEqual(b.columns);
  });

  it('ignores non-positive dt', () => {
    const s = make();
    const before = JSON.stringify(s.columns);
    stepRain(s, 0);
    stepRain(s, -1);
    expect(JSON.stringify(s.columns)).toBe(before);
  });

  it('keeps glyphs in range, trails bounded and produces active columns', () => {
    const s = make();
    for (let i = 0; i < 300; i++) {
      stepRain(s, 1 / 30);
      for (const c of s.columns) {
        expect(c.glyphs.length).toBeLessThanOrEqual(c.length);
        for (const g of c.glyphs) {
          expect(g).toBeGreaterThanOrEqual(0);
          expect(g).toBeLessThan(50);
        }
      }
    }
    expect(activeCount(s)).toBeGreaterThan(0);
  });

  it('recycles columns once a streak leaves the screen', () => {
    const s = make(10, 3, 1, 10);
    let spawns = 0;
    let wasActive = false;
    for (let i = 0; i < 3000; i++) {
      stepRain(s, 1 / 30);
      const active = s.columns[0]?.active ?? false;
      if (active && !wasActive) spawns++;
      wasActive = active;
    }
    expect(spawns).toBeGreaterThan(1);
  });

  it('spawns nothing when intensity is 0', () => {
    const s = make(0);
    warmUp(s, 30, 1 / 30);
    expect(activeCount(s)).toBe(0);
  });

  it('higher intensity yields more active columns', () => {
    const low = make(1, 7, 100);
    const high = make(10, 7, 100);
    warmUp(low, 20, 1 / 30);
    warmUp(high, 20, 1 / 30);
    expect(activeCount(high)).toBeGreaterThan(activeCount(low));
  });
});

describe('setRainIntensity', () => {
  it('re-arms an off simulation', () => {
    const s = make(0);
    warmUp(s, 5, 1 / 30);
    setRainIntensity(s, 8);
    warmUp(s, 10, 1 / 30);
    expect(activeCount(s)).toBeGreaterThan(0);
  });

  it('lets running streaks finish when turned off, then stays empty', () => {
    const s = make(10);
    warmUp(s, 10, 1 / 30);
    setRainIntensity(s, 0);
    warmUp(s, 60, 1 / 30);
    expect(activeCount(s)).toBe(0);
  });
});

describe('resizeRainState', () => {
  it('grows and shrinks the column list', () => {
    const s = make(5, 1, 10, 20);
    resizeRainState(s, 15, 25);
    expect(s.columns).toHaveLength(15);
    expect(s.rows).toBe(25);
    resizeRainState(s, 4, 25);
    expect(s.columns).toHaveLength(4);
    expect(s.cols).toBe(4);
  });
});

describe('accumulate', () => {
  it('converts frame time to whole steps and carries the remainder', () => {
    expect(accumulate(0, 100, 33, 10)).toEqual({ steps: 3, accumulator: 1 });
    expect(accumulate(1, 32, 33, 10)).toEqual({ steps: 1, accumulator: 0 });
  });
  it('caps catch-up after a stall', () => {
    const r = accumulate(0, 10_000, 33, 5);
    expect(r.steps).toBe(5);
    expect(r.accumulator).toBeLessThan(33);
  });
  it('ignores negative frame times', () => {
    expect(accumulate(5, -100, 33, 5)).toEqual({ steps: 0, accumulator: 5 });
  });
});
