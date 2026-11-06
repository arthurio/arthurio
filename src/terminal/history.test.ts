import { describe, expect, it } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('returns null when empty', () => {
    const h = new History();
    expect(h.previous('x')).toBeNull();
    expect(h.next()).toBeNull();
  });

  it('walks back and forward, restoring the draft', () => {
    const h = new History();
    h.push('help');
    h.push('skills');
    expect(h.previous('dra')).toBe('skills');
    expect(h.previous('ignored')).toBe('help');
    expect(h.previous('ignored')).toBe('help');
    expect(h.next()).toBe('skills');
    expect(h.next()).toBe('dra');
    expect(h.next()).toBeNull();
  });

  it('ignores blanks and consecutive duplicates, and caps size', () => {
    const h = new History(2);
    h.push('  ');
    h.push('a');
    h.push('a');
    h.push('b');
    h.push('c');
    expect(h.toArray()).toEqual(['b', 'c']);
  });

  it('resets navigation on push', () => {
    const h = new History();
    h.push('a');
    h.previous('');
    h.push('b');
    expect(h.previous('')).toBe('b');
  });
});
