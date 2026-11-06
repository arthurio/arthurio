import { describe, expect, it, vi } from 'vitest';
import { clampIntensity } from './core';
import { computeGrid, createRainRenderer, effectiveDpr } from './renderer';

describe('computeGrid', () => {
  it('floors columns and ceils rows', () => {
    expect(computeGrid(800, 600, 16, 120)).toEqual({ cols: 50, rows: 38 });
  });

  it('clamps columns to maxColumns', () => {
    expect(computeGrid(4000, 600, 16, 120).cols).toBe(120);
  });

  it('keeps at least one column and one row', () => {
    expect(computeGrid(5, 600, 16, 120).cols).toBe(1);
    expect(computeGrid(800, 0, 16, 120).rows).toBe(1);
  });
});

describe('effectiveDpr', () => {
  it('uses the device ratio up to the cap', () => {
    expect(effectiveDpr(1.5, 2)).toBe(1.5);
    expect(effectiveDpr(3, 2)).toBe(2);
  });

  it.each([0, -1, NaN, Infinity])('falls back to 1 for %s', (ratio) => {
    expect(effectiveDpr(ratio, 2)).toBe(1);
  });
});

describe('createRainRenderer without a 2D context', () => {
  function make(intensity?: number) {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    return createRainRenderer({
      canvas,
      intensity,
      reducedMotion: true,
      watchMotionPreference: false,
    });
  }

  it('clamps the initial intensity', () => {
    expect(make(99).getIntensity()).toBe(clampIntensity(99));
  });

  it('remembers the last non-zero intensity when switched off', () => {
    const rain = make(5);
    rain.setIntensity(0);
    expect(rain.getIntensity()).toBe(0);
    expect(rain.getRestoreIntensity()).toBe(5);
    rain.setIntensity(3);
    expect(rain.getRestoreIntensity()).toBe(3);
  });

  it('does not throw from the no-op methods', () => {
    const rain = make();
    expect(() => {
      rain.setReducedMotion(false);
      rain.refreshColors();
      rain.resize();
      rain.destroy();
    }).not.toThrow();
  });
});
