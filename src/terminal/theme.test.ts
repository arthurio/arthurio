import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, THEMES, createDomTheme, isThemeName, nextTheme } from './theme';

describe('isThemeName', () => {
  it('accepts known themes only', () => {
    for (const name of THEMES) expect(isThemeName(name)).toBe(true);
    expect(isThemeName('')).toBe(false);
    expect(isThemeName('purple')).toBe(false);
  });
});

describe('nextTheme', () => {
  it('cycles through the themes', () => {
    expect(nextTheme('green')).toBe('amber');
    expect(nextTheme('amber')).toBe('cyan');
    expect(nextTheme('cyan')).toBe('green');
  });

  it('starts from the first theme for unknown input', () => {
    expect(nextTheme('bogus')).toBe(THEMES[0]);
  });
});

describe('createDomTheme', () => {
  it('defaults when no data-theme is set', () => {
    const control = createDomTheme(document.createElement('main'));
    expect(control.get()).toBe(DEFAULT_THEME);
    expect(control.names).toEqual(THEMES);
  });

  it('applies valid themes and ignores invalid ones', () => {
    const root = document.createElement('main');
    const control = createDomTheme(root);
    control.set('amber');
    expect(control.get()).toBe('amber');
    expect(root.dataset['theme']).toBe('amber');
    control.set('bogus');
    expect(control.get()).toBe('amber');
  });

  it('falls back to the default for an invalid attribute', () => {
    const root = document.createElement('main');
    root.dataset['theme'] = 'bogus';
    expect(createDomTheme(root).get()).toBe(DEFAULT_THEME);
  });
});
