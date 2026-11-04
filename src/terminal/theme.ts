/** Colour themes. Names must match the `:root[data-theme]` blocks in main.css. */

export const THEMES = ['green', 'amber', 'cyan'] as const;
export type ThemeName = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeName = 'green';

export interface ThemeControl {
  readonly names: readonly string[];
  get(): string;
  set(name: string): void;
}

export function isThemeName(value: string): value is ThemeName {
  return (THEMES as readonly string[]).includes(value);
}

/** Pure: the theme after `current` in the cycle. */
export function nextTheme(current: string): ThemeName {
  const index = (THEMES as readonly string[]).indexOf(current);
  return THEMES[(index + 1) % THEMES.length] ?? DEFAULT_THEME;
}

/** Theme control backed by `data-theme` on an element (the document root). */
export function createDomTheme(root: HTMLElement = document.documentElement): ThemeControl {
  return {
    names: THEMES,
    get() {
      const value = root.dataset['theme'] ?? '';
      return isThemeName(value) ? value : DEFAULT_THEME;
    },
    set(name) {
      if (isThemeName(name)) root.dataset['theme'] = name;
    },
  };
}
