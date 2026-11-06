import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profile } from '../data/profile';
import { createDefaultRegistry } from './commands';
import { parseRepos } from './github';
import { Terminal, renderLine } from './terminal';
import { THEMES, createDomTheme } from './theme';
import { isSafeHref } from './types';

describe('isSafeHref / renderLine', () => {
  it('allows only http(s) and mailto', () => {
    expect(isSafeHref('https://github.com/arthurio')).toBe(true);
    expect(isSafeHref('mailto:a@b.c')).toBe(true);
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('not a url')).toBe(false);
  });

  it('renders text via textContent, never markup', () => {
    const el = renderLine({ text: '<img src=x onerror=alert(1)>', kind: 'output' });
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('renders safe links with rel=noopener and drops unsafe hrefs', () => {
    const a = renderLine({ text: 'x', kind: 'link', href: 'https://example.com' }).querySelector(
      'a',
    );
    expect(a?.rel).toContain('noopener');
    expect(a?.target).toBe('_blank');
    const bad = renderLine({ text: 'x', kind: 'link', href: 'javascript:alert(1)' });
    expect(bad.querySelector('a')).toBeNull();
  });
});

describe('Terminal component', () => {
  let output: HTMLElement;
  let input: HTMLInputElement;
  let terminal: Terminal;

  beforeEach(() => {
    document.body.replaceChildren();
    output = document.createElement('div');
    input = document.createElement('input');
    const form = document.createElement('form');
    form.appendChild(input);
    document.body.append(output, form);
    const registry = createDefaultRegistry(THEMES);
    terminal = new Terminal({
      output,
      input,
      form,
      registry,
      context: {
        profile,
        registry,
        rain: { getIntensity: () => 5, setIntensity: vi.fn(), getRestoreIntensity: () => 5 },
        theme: createDomTheme(document.documentElement),
        loadProjects: () => Promise.resolve({ projects: profile.projects, source: 'static' }),
      },
    });
  });

  it('echoes input and prints output', async () => {
    await terminal.run('whoami');
    expect(output.textContent).toContain('guest@arthurio:~$ whoami');
    expect(output.textContent).toContain('Arthur Rio');
  });

  it('prints command not found for unknown commands', async () => {
    await terminal.run('nope');
    expect(output.textContent).toContain('command not found: nope — type help');
  });

  it('clear empties the log', async () => {
    await terminal.run('help');
    await terminal.run('clear');
    expect(output.children).toHaveLength(0);
  });

  it('navigates history and completes with keys', async () => {
    await terminal.run('skills');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(input.value).toBe('skills');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(input.value).toBe('');
    input.value = 'wh';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(input.value).toBe('whoami ');
  });

  it('runs the typed command on form submit and clears the input', async () => {
    input.value = 'help';
    input.form?.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(input.value).toBe('');
    await terminal.run('');
    expect(output.textContent).toContain('Available commands');
  });
});

describe('parseRepos', () => {
  it('filters forks, archived and the profile repo, and ignores junk', () => {
    const repos = parseRepos(
      [
        {
          name: 'a',
          html_url: 'https://github.com/arthurio/a',
          stargazers_count: 1,
          description: 'x',
        },
        {
          name: 'b',
          html_url: 'https://github.com/arthurio/b',
          stargazers_count: 9,
          description: null,
        },
        { name: 'f', html_url: 'https://github.com/arthurio/f', fork: true },
        { name: 'z', html_url: 'https://github.com/arthurio/z', archived: true },
        { name: 'arthurio', html_url: 'https://github.com/arthurio/arthurio' },
        { name: 'evil', html_url: 'javascript:alert(1)' },
        null,
        'str',
      ],
      'arthurio',
    );
    expect(repos.map((r) => r.name)).toEqual(['b', 'a']);
    expect(parseRepos({}, 'arthurio')).toEqual([]);
  });
});
