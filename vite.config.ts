/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

/**
 * Deployment base path.
 *
 * Defaults to './' (relative URLs), which works for a GitHub Pages project
 * site (https://arthurio.github.io/arthurio/), a user site, and
 * `vite preview` without any configuration. Override with an absolute base
 * when needed, e.g. `VITE_BASE=/arthurio/ npm run build`.
 */
const base = process.env['VITE_BASE'] ?? './';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
