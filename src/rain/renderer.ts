/** Canvas 2D renderer for the digital rain. Thin layer over the pure core. */

import {
  DEFAULT_INTENSITY,
  accumulate,
  clampIntensity,
  createRainState,
  resizeRainState,
  setRainIntensity,
  stepRain,
  warmUp,
  type Rng,
  type RainState,
} from './core';
import { prefersReducedMotion, shouldAnimate, watchReducedMotion } from './motion';

export const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

/** Simulation step: 30 Hz regardless of display refresh rate. */
export const STEP_MS = 1000 / 30;
const MAX_CATCH_UP_STEPS = 5;
const WARM_UP_SECONDS = 8;

export interface RainOptions {
  canvas: HTMLCanvasElement;
  intensity?: number;
  rng?: Rng;
  /** Initial reduced-motion state; defaults to the media query. */
  reducedMotion?: boolean;
  /** Subscribe to media query changes. Default true. */
  watchMotionPreference?: boolean;
  fontSize?: number;
  /** Upper bound for devicePixelRatio used for the backing store. */
  maxDpr?: number;
  maxColumns?: number;
}

export interface RainRenderer {
  getIntensity(): number;
  setIntensity(value: number): void;
  /** Last non-zero intensity (or the default) for "matrix on". */
  getRestoreIntensity(): number;
  setReducedMotion(reduced: boolean): void;
  /** Re-read theme colours from CSS custom properties. */
  refreshColors(): void;
  resize(): void;
  destroy(): void;
}

interface Colors {
  bg: string;
  rain: string;
  head: string;
}

function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: get('--bg', '#000a00'),
    rain: get('--rain', '#00ff41'),
    head: get('--accent', '#ffffff'),
  };
}

export function computeGrid(
  cssWidth: number,
  cssHeight: number,
  fontSize: number,
  maxColumns: number,
): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.min(maxColumns, Math.floor(cssWidth / fontSize))),
    rows: Math.max(1, Math.ceil(cssHeight / fontSize)),
  };
}

export function effectiveDpr(deviceRatio: number, maxDpr: number): number {
  const ratio = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  return Math.min(ratio, maxDpr);
}

export function createRainRenderer(options: RainOptions): RainRenderer {
  const { canvas } = options;
  const ctx = canvas.getContext('2d');
  const rng = options.rng ?? Math.random;
  const maxDpr = options.maxDpr ?? 2;
  const maxColumns = options.maxColumns ?? 120;
  let intensity = clampIntensity(options.intensity ?? DEFAULT_INTENSITY);
  let restoreIntensity = intensity > 0 ? intensity : DEFAULT_INTENSITY;
  let reduced = options.reducedMotion ?? prefersReducedMotion();
  let colors: Colors = readColors();
  let state: RainState | null = null;
  let cssWidth = 0;
  let cssHeight = 0;
  let fontSize = options.fontSize ?? 16;
  let rafId = 0;
  let lastTime = 0;
  let accumulator = 0;
  let destroyed = false;
  let resizePending = false;

  if (!ctx) {
    // Canvas unsupported (e.g. jsdom): keep the intensity API working.
    return {
      getIntensity: () => intensity,
      setIntensity: (v) => {
        intensity = clampIntensity(v);
        if (intensity > 0) restoreIntensity = intensity;
      },
      getRestoreIntensity: () => restoreIntensity,
      setReducedMotion: () => undefined,
      refreshColors: () => undefined,
      resize: () => undefined,
      destroy: () => undefined,
    };
  }
  const g: CanvasRenderingContext2D = ctx;

  function buildState(): void {
    const grid = computeGrid(cssWidth, cssHeight, fontSize, maxColumns);
    state = createRainState({
      cols: grid.cols,
      rows: grid.rows,
      glyphCount: GLYPHS.length,
      rng,
      intensity,
    });
    warmUp(state, WARM_UP_SECONDS, STEP_MS / 1000);
  }

  function draw(): void {
    if (!state) return;
    const cellW = cssWidth / Math.max(1, state.cols);
    g.globalAlpha = 1;
    g.shadowBlur = 0;
    g.fillStyle = colors.bg;
    g.fillRect(0, 0, cssWidth, cssHeight);
    g.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.shadowColor = colors.rain;
    for (let i = 0; i < state.columns.length; i++) {
      const col = state.columns[i];
      if (!col || !col.active) continue;
      const x = (i + 0.5) * cellW;
      for (let k = 0; k < col.glyphs.length; k++) {
        const row = col.lastRow - k;
        if (row < 0 || row >= state.rows) continue;
        const glyph = GLYPHS.charAt(col.glyphs[k] ?? 0);
        const y = (row + 1) * fontSize;
        if (k === 0) {
          g.globalAlpha = 1;
          g.fillStyle = colors.head;
          g.shadowBlur = 12;
        } else {
          g.globalAlpha = Math.pow(1 - k / Math.max(1, col.length), 1.5) * 0.9 + 0.05;
          g.fillStyle = colors.rain;
          g.shadowBlur = k < 3 ? 6 : 0;
        }
        g.fillText(glyph, x, y);
      }
    }
    g.globalAlpha = 1;
    g.shadowBlur = 0;
  }

  function frame(time: number): void {
    rafId = 0;
    if (destroyed || !state || !shouldAnimate(reduced, document.hidden)) return;
    const result = accumulate(accumulator, time - lastTime, STEP_MS, MAX_CATCH_UP_STEPS);
    lastTime = time;
    accumulator = result.accumulator;
    for (let i = 0; i < result.steps; i++) stepRain(state, STEP_MS / 1000);
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /** Reconcile the loop with reduced-motion and page-visibility state. */
  function sync(): void {
    stop();
    if (destroyed || !state) return;
    if (reduced) {
      draw(); // single static frame
    } else if (shouldAnimate(reduced, document.hidden)) {
      lastTime = performance.now();
      accumulator = 0;
      draw();
      rafId = requestAnimationFrame(frame);
    }
  }

  function resize(): void {
    resizePending = false;
    if (destroyed) return;
    cssWidth = Math.max(1, window.innerWidth);
    cssHeight = Math.max(1, window.innerHeight);
    fontSize = options.fontSize ?? (cssWidth <= 640 ? 14 : 16);
    const dpr = effectiveDpr(window.devicePixelRatio, maxDpr);
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!state || reduced) {
      buildState();
    } else {
      const grid = computeGrid(cssWidth, cssHeight, fontSize, maxColumns);
      resizeRainState(state, grid.cols, grid.rows);
    }
    sync();
  }

  function onResize(): void {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(resize);
  }

  function onVisibility(): void {
    sync();
  }

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  const api: RainRenderer = {
    getIntensity: () => intensity,
    setIntensity(value) {
      intensity = clampIntensity(value);
      if (intensity > 0) restoreIntensity = intensity;
      if (!state) return;
      if (reduced) {
        buildState();
        sync();
      } else {
        setRainIntensity(state, intensity);
      }
    },
    getRestoreIntensity: () => restoreIntensity,
    setReducedMotion(value) {
      if (value === reduced) return;
      reduced = value;
      sync();
    },
    refreshColors() {
      colors = readColors();
      if (reduced) draw();
    },
    resize,
    destroy() {
      destroyed = true;
      stop();
      unwatch();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };

  const unwatch =
    options.watchMotionPreference === false
      ? () => undefined
      : watchReducedMotion((r) => api.setReducedMotion(r));

  resize();
  return api;
}
