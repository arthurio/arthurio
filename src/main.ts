import './styles/main.css';
import './styles/crt.css';

import { runBoot } from './boot';
import { profile } from './data/profile';
import { renderFallback } from './fallback';
import { createRainRenderer, prefersReducedMotion } from './rain';
import { Terminal, createDefaultRegistry, createDomTheme, loadProjects } from './terminal';
import { dim, heading, out } from './terminal/types';

function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`Missing required element #${id}`);
  return node;
}

function start(): void {
  const canvas = byId('rain', HTMLCanvasElement);
  const bootEl = byId('boot', HTMLElement);
  const output = byId('terminal-output', HTMLElement);
  const input = byId('terminal-input', HTMLInputElement);
  const form = byId('terminal-form', HTMLFormElement);

  const fallback = document.getElementById('fallback');
  if (fallback) renderFallback(fallback, profile);

  const rain = createRainRenderer({ canvas });
  const theme = createDomTheme();
  // Keep rain colours in sync with theme changes.
  new MutationObserver(() => rain.refreshColors()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const registry = createDefaultRegistry(theme.names);
  const terminal = new Terminal({
    output,
    input,
    form,
    registry,
    context: { profile, registry, rain, theme, loadProjects: () => loadProjects() },
  });

  terminal.print([
    heading(`${profile.name} (${profile.handle}) - ${profile.headline}`),
    out('Welcome. Type help for a list of commands.'),
    dim('Tip: Tab completes, arrow up/down browse history.'),
    out(''),
  ]);

  // Clicking anywhere on the page returns focus to the prompt, unless the user is
  // selecting text or following a link.
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    terminal.focus();
  });

  runBoot({
    element: bootEl,
    reducedMotion: prefersReducedMotion(),
    onDone: () => terminal.focus(),
  });
}

start();
