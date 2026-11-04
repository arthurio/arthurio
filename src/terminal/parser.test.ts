import { describe, expect, it } from 'vitest';
import { parseInput, tokenize } from './parser';

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('  matrix   up ')).toEqual(['matrix', 'up']);
  });
  it('honours quotes and escapes', () => {
    expect(tokenize('say "hello world" \'a b\' c\\ d')).toEqual(['say', 'hello world', 'a b', 'c d']);
  });
  it('keeps empty quoted tokens and tolerates unterminated quotes', () => {
    expect(tokenize('a "" b')).toEqual(['a', '', 'b']);
    expect(tokenize('a "b c')).toEqual(['a', 'b c']);
  });
  it('returns nothing for blank input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('parseInput', () => {
  it('returns null for empty input', () => {
    expect(parseInput('')).toBeNull();
    expect(parseInput('  \t ')).toBeNull();
  });
  it('lower-cases the command but not the args', () => {
    expect(parseInput('Theme Amber')).toEqual({
      command: 'theme',
      args: ['Amber'],
      raw: 'Theme Amber',
    });
  });
});
