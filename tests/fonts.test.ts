import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const css = readFileSync(join(root, 'src/styles/main.css'), 'utf8');

function unicodeRanges(): Array<[number, number]> {
  const lists = [...css.matchAll(/unicode-range:\s*([^;]+);/g)].map((m) =>
    (m[1] ?? '').trim().replace(/\s+/g, ' '),
  );
  const faces = css.match(/@font-face/g)?.length ?? 0;
  if (lists.length < 2 || lists.length !== faces) {
    throw new Error('expected unicode-range in every @font-face');
  }
  if (lists.some((list) => list !== lists[0])) {
    throw new Error('unicode-range differs between @font-face blocks');
  }
  return (lists[0] ?? '').split(',').map((part) => {
    const [lo, hi] = part.trim().replace(/^U\+/i, '').split('-');
    const start = parseInt(lo ?? '', 16);
    return [start, hi ? parseInt(hi, 16) : start];
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

describe('self-hosted font subset', () => {
  it('ships the lightweight font files, each well under 60 KB', () => {
    for (const file of ['Regular', 'Bold']) {
      const size = statSync(join(root, `public/fonts/jetbrains-mono-latin-${file}.woff2`)).size;
      expect(size).toBeGreaterThan(1000);
      expect(size).toBeLessThan(60 * 1024);
    }
  });

  it('keeps the font license file', () => {
    const license = readFileSync(join(root, 'public/fonts/JETBRAINS-MONO-LICENSE.md'), 'utf8');
    expect(license).toContain('SIL Open Font License');
  });

  it('covers every non-ASCII character used in terminal text and profile data', () => {
    const ranges = unicodeRanges();
    const rain = join(root, 'src/rain/renderer.ts'); // katakana glyphs are canvas-only, drawn with a fallback font
    const uncovered = new Set<string>();
    for (const file of sourceFiles(join(root, 'src')).filter((f) => f !== rain)) {
      for (const char of readFileSync(file, 'utf8')) {
        const code = char.codePointAt(0) ?? 0;
        if (code < 0x80) continue;
        if (!ranges.some(([lo, hi]) => code >= lo && code <= hi)) uncovered.add(char);
      }
    }
    expect([...uncovered]).toEqual([]);
  });

  it('preloads the Regular weight', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    expect(html).toMatch(/rel="preload"[^>]*jetbrains-mono-latin-Regular\.woff2/s);
  });
});
