import { describe, expect, it } from 'vitest';
import { commonPrefix, complete, type CompletionSource } from './completion';

const source: CompletionSource = {
  commands: ['help', 'whoami', 'skills', 'projects', 'contact', 'clear', 'matrix', 'theme'],
  argsFor: (c) =>
    c === 'matrix' ? ['up', 'down', 'on', 'off'] : c === 'theme' ? ['green', 'amber'] : [],
};

describe('commonPrefix', () => {
  it('finds the shared prefix', () => {
    expect(commonPrefix(['clear', 'contact'])).toBe('c');
    expect(commonPrefix([])).toBe('');
  });
});

describe('complete', () => {
  it('completes a unique command with a trailing space', () => {
    expect(complete('he', source)).toEqual({ completed: 'help ', matches: [] });
  });
  it('extends to the common prefix and lists ambiguous matches', () => {
    const r = complete('c', source);
    expect(r.completed).toBe('c');
    expect(r.matches).toEqual(['clear', 'contact']);
    expect(complete('co', source).completed).toBe('contact ');
  });
  it('lists everything for empty input', () => {
    expect(complete('', source).matches).toHaveLength(8);
  });
  it('does nothing without a match', () => {
    expect(complete('zzz', source)).toEqual({ completed: 'zzz', matches: [] });
  });
  it('completes first arguments', () => {
    expect(complete('matrix u', source).completed).toBe('matrix up ');
    expect(complete('matrix o', source).matches).toEqual(['off', 'on']);
    expect(complete('theme a', source).completed).toBe('theme amber ');
  });
  it('does not complete past the first argument or for unknown commands', () => {
    expect(complete('matrix up x', source).completed).toBe('matrix up x');
    expect(complete('help x', source).completed).toBe('help x');
  });
  it('is case-insensitive for the command', () => {
    expect(complete('HE', source).completed).toBe('help ');
  });
});
