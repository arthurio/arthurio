import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runBoot } from './boot';

describe('runBoot', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is instant under reduced motion', () => {
    const el = document.createElement('div');
    const onDone = vi.fn();
    const handle = runBoot({ element: el, reducedMotion: true, onDone });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(handle.done).toBe(true);
    expect(el.textContent).toBe('');
  });

  it('types lines and completes on its own', () => {
    const el = document.createElement('div');
    const onDone = vi.fn();
    runBoot({ element: el, reducedMotion: false, lines: ['ab', 'cd'], onDone });
    vi.advanceTimersByTime(20);
    expect(el.textContent).toContain('ab');
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(el.textContent).toBe('');
  });

  it('can be skipped by any key press, once', () => {
    const el = document.createElement('div');
    const onDone = vi.fn();
    runBoot({ element: el, reducedMotion: false, onDone });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('can be skipped by click', () => {
    const el = document.createElement('div');
    const onDone = vi.fn();
    runBoot({ element: el, reducedMotion: false, onDone });
    document.dispatchEvent(new Event('pointerdown'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
