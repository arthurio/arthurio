import { expect, type Page } from '@playwright/test';

/** Load the site, skip the boot log with a key press and wait for the prompt. */
export async function openSite(page: Page): Promise<void> {
  await page.goto('/');
  await page.keyboard.press('Space');
  await expect(page.locator('#boot')).toBeHidden();
  await expect(page.locator('#terminal-input')).toBeFocused();
}

export async function runCommand(page: Page, command: string): Promise<void> {
  const input = page.locator('#terminal-input');
  await input.fill(command);
  await input.press('Enter');
}

export interface CanvasStats {
  width: number;
  height: number;
  /** Pixels clearly brighter/greener than the dark background. */
  litPixels: number;
}

const rainCanvas = (page: Page) => page.locator('#rain').and(page.locator('canvas'));

/** Count lit pixels on the rain canvas (green channel well above the dark background). */
export async function readCanvasStats(page: Page): Promise<CanvasStats> {
  return rainCanvas(page).evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 1] ?? 0) > 80) lit++;
    }
    return { width: canvas.width, height: canvas.height, litPixels: lit };
  });
}

export function canvasDataUrl(page: Page): Promise<string> {
  return rainCanvas(page).evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
}
