import { expect, test } from '@playwright/test';
import { canvasDataUrl, openSite, readCanvasStats, runCommand } from './helpers';

test.describe('rain canvas', () => {
  test('is aria-hidden and renders non-blank pixels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#rain')).toHaveAttribute('aria-hidden', 'true');
    await expect
      .poll(async () => (await readCanvasStats(page)).litPixels, { timeout: 10_000 })
      .toBeGreaterThan(50);
  });

  test('animates over time', async ({ page }) => {
    await page.goto('/');
    const first = await canvasDataUrl(page);
    await expect.poll(() => canvasDataUrl(page), { timeout: 5_000 }).not.toBe(first);
  });

  test('matrix off stops the rain and matrix on restores it', async ({ page }) => {
    await openSite(page);
    await runCommand(page, 'matrix off');
    await expect(page.locator('#terminal-output')).toContainText('matrix rain: off');
    await expect
      .poll(async () => (await readCanvasStats(page)).litPixels, { timeout: 20_000 })
      .toBe(0);
    await runCommand(page, 'matrix 10');
    await expect
      .poll(async () => (await readCanvasStats(page)).litPixels, { timeout: 20_000 })
      .toBeGreaterThan(50);
  });
});

test.describe('terminal', () => {
  test('exposes an accessible log and input', async ({ page }) => {
    await openSite(page);
    await expect(page.locator('#terminal-output')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#terminal-input')).toBeVisible();
  });

  test('help lists commands', async ({ page }) => {
    await openSite(page);
    await runCommand(page, 'help');
    const log = page.locator('#terminal-output');
    for (const name of [
      'whoami',
      'experience',
      'skills',
      'projects',
      'contact',
      'matrix',
      'theme',
    ]) {
      await expect(log).toContainText(name);
    }
  });

  test('help shows each command name on its own line with an indented summary line', async ({
    page,
  }) => {
    await openSite(page);
    await runCommand(page, 'help');
    const text = await page.locator('#terminal-output').innerText();
    const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
    const idx = lines.findIndex((l) => l.trim() === 'whoami');
    expect(idx).toBeGreaterThan(-1);
    expect(lines[idx]?.trim()).toBe('whoami');
    expect(lines[idx + 1]).toMatch(/^\s{2,}\S/);
    expect(lines[idx + 1]?.trim()).toBe('who am I');
    expect(text).toContain('matrix [up|down|on|off|0-10]');
    expect(text).toContain('Tab completes, arrow up/down browse history.');
  });

  test('whoami prints the profile', async ({ page }) => {
    await openSite(page);
    await runCommand(page, 'whoami');
    await expect(page.locator('#terminal-output')).toContainText('Arthur Rio');
  });

  test('unknown commands report an error', async ({ page }) => {
    await openSite(page);
    await runCommand(page, 'frobnicate');
    await expect(page.locator('#terminal-output')).toContainText(
      'command not found: frobnicate — type help',
    );
  });

  test('contact renders safe links', async ({ page }) => {
    await openSite(page);
    await runCommand(page, 'contact');
    const link = page.locator('#terminal-output a[href^="mailto:"]');
    await expect(link).toHaveCount(1);
    await expect(
      page.locator('#terminal-output a[href^="https://github.com/arthurio"]'),
    ).toHaveAttribute('rel', /noopener/);
  });

  test('theme cycles data-theme and clear empties the log', async ({ page }) => {
    await openSite(page);
    await runCommand(page, 'theme');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'green');
    await runCommand(page, 'theme cyan');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyan');
    await runCommand(page, 'clear');
    await expect(page.locator('#terminal-output > div')).toHaveCount(0);
  });

  test('tab completion and history work', async ({ page }) => {
    await openSite(page);
    const input = page.locator('#terminal-input');
    await input.fill('who');
    await input.press('Tab');
    await expect(input).toHaveValue('whoami ');
    await input.press('Enter');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('whoami');
  });

  test('clicking the page focuses the input', async ({ page }) => {
    await openSite(page);
    await page.locator('#terminal-input').blur();
    await page.locator('#terminal-output').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#terminal-input')).toBeFocused();
  });
});

test.describe('boot sequence', () => {
  test('is skippable by key press and then focuses the input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#boot')).toBeHidden({ timeout: 1_000 });
    await expect(page.locator('#terminal-input')).toBeFocused();
  });

  test('finishes on its own', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('#terminal-input')).toBeFocused();
  });
});

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('skips the boot log instantly and focuses the prompt', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot')).toBeHidden();
    await expect(page.locator('#terminal-input')).toBeFocused();
  });

  test('renders a static, non-blank rain frame', async ({ page }) => {
    await page.goto('/');
    await expect
      .poll(async () => (await readCanvasStats(page)).litPixels, { timeout: 10_000 })
      .toBeGreaterThan(50);
    const first = await canvasDataUrl(page);
    await page.waitForTimeout(700);
    expect(await canvasDataUrl(page)).toBe(first);
  });

  test('disables CRT effects', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.crt-scanlines')).toBeHidden();
    await expect(page.locator('.crt-flicker')).toBeHidden();
  });
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('fits the viewport and the canvas covers it', async ({ page }) => {
    await openSite(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const stats = await readCanvasStats(page);
    expect(stats.width).toBeGreaterThanOrEqual(390);
    expect(stats.width).toBeLessThanOrEqual(390 * 2);
    const box = await page.locator('#terminal').boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width ?? 0).toBeLessThanOrEqual(390);
  });

  test('commands work', async ({ page }) => {
    await openSite(page);
    await runCommand(page, 'skills');
    await expect(page.locator('#terminal-output')).toContainText('FastAPI');
  });
});

test.describe('assets', () => {
  test('all same-origin assets load under preview', async ({ page, baseURL }) => {
    const failures: string[] = [];
    page.on('response', (res) => {
      if (res.url().startsWith(baseURL ?? '') && res.status() >= 400) {
        failures.push(`${res.status()} ${res.url()}`);
      }
    });
    await openSite(page);
    await runCommand(page, 'help');
    await page.evaluate(() => document.fonts.ready);
    expect(failures).toEqual([]);

    const urls = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLScriptElement>('script[src]'),
        ...document.querySelectorAll<HTMLLinkElement>('link[href]'),
      ].map((n) => ('src' in n && n.src ? n.src : (n as HTMLLinkElement).href)),
    );
    const sameOrigin = urls.filter((u) => u.startsWith('http'));
    expect(sameOrigin.some((u) => u.endsWith('.js'))).toBe(true);
    for (const url of sameOrigin) {
      const res = await page.request.get(url);
      expect(res.status(), url).toBe(200);
    }
  });

  test('self-hosted font files are served', async ({ page }) => {
    for (const file of [
      'hack-nerd-font-mono-Regular.woff2',
      'hack-nerd-font-mono-Bold.woff2',
    ]) {
      const res = await page.request.get(`/fonts/${file}`);
      expect(res.status()).toBe(200);
    }
  });
});

test.describe('fallback content', () => {
  test('semantic profile summary is present for assistive tech', async ({ page }) => {
    await page.goto('/');
    const fallback = page.locator('#fallback');
    await expect(fallback).toContainText('modelcode.ai');
    await expect(
      fallback.locator('a[href="https://github.com/arthurio/fastapi-filter"]'),
    ).toHaveCount(1);
    await expect(fallback.locator('a[href^="mailto:"]')).toHaveCount(1);
  });
});
