import { describe, expect, it, vi } from 'vitest';
import {
  prefersReducedMotion,
  resolveReducedMotion,
  shouldAnimate,
  watchReducedMotion,
  type MatchMediaHost,
} from './motion';

type Listener = (e: { matches: boolean }) => void;

function fakeHost(initial: boolean): {
  host: MatchMediaHost;
  fire: (matches: boolean) => void;
  listeners: Set<Listener>;
} {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initial,
    addEventListener: (_t: string, l: Listener) => listeners.add(l),
    removeEventListener: (_t: string, l: Listener) => listeners.delete(l),
  };
  return {
    host: { matchMedia: () => mql as unknown as MediaQueryList },
    fire: (matches) => listeners.forEach((l) => l({ matches })),
    listeners,
  };
}

describe('resolveReducedMotion', () => {
  it('maps media query lists to booleans', () => {
    expect(resolveReducedMotion({ matches: true })).toBe(true);
    expect(resolveReducedMotion({ matches: false })).toBe(false);
    expect(resolveReducedMotion(null)).toBe(false);
    expect(resolveReducedMotion(undefined)).toBe(false);
  });
});

describe('prefersReducedMotion', () => {
  it('reads the media query', () => {
    expect(prefersReducedMotion(fakeHost(true).host)).toBe(true);
    expect(prefersReducedMotion(fakeHost(false).host)).toBe(false);
  });
  it('is false when matchMedia is unavailable', () => {
    expect(prefersReducedMotion({})).toBe(false);
  });
});

describe('shouldAnimate', () => {
  it('only animates when motion is allowed and the page is visible', () => {
    expect(shouldAnimate(false, false)).toBe(true);
    expect(shouldAnimate(true, false)).toBe(false);
    expect(shouldAnimate(false, true)).toBe(false);
  });
});

describe('watchReducedMotion', () => {
  it('notifies on change and stops after unsubscribe', () => {
    const { host, fire, listeners } = fakeHost(false);
    const cb = vi.fn();
    const off = watchReducedMotion(cb, host);
    fire(true);
    expect(cb).toHaveBeenLastCalledWith(true);
    off();
    expect(listeners.size).toBe(0);
    fire(false);
    expect(cb).toHaveBeenCalledTimes(1);
  });
  it('returns a no-op without matchMedia', () => {
    expect(() => watchReducedMotion(() => undefined, {})()).not.toThrow();
  });
});
