import { describe, expect, it, vi } from 'vitest';
import { profile } from '../data/profile';
import {
  createDefaultRegistry,
  type CommandContext,
  type CommandRegistry,
  type RainControl,
} from './commands';
import { THEMES, createDomTheme } from './theme';

type FakeRain = RainControl & { value: number };

function setup(): { registry: CommandRegistry; ctx: CommandContext; rain: FakeRain } {
  const rain: FakeRain = {
    value: 5,
    getIntensity() {
      return this.value;
    },
    setIntensity(v: number) {
      this.value = v;
    },
    getRestoreIntensity: () => 5,
  };
  const registry = createDefaultRegistry(THEMES);
  const ctx: CommandContext = {
    profile,
    registry,
    rain,
    theme: createDomTheme(document.createElement('html')),
    loadProjects: vi.fn().mockResolvedValue({ projects: profile.projects, source: 'static' }),
  };
  return { registry, ctx, rain };
}

const texts = (r: { lines: { text: string }[] }): string => r.lines.map((l) => l.text).join('\n');

describe('registry', () => {
  it('registers all required commands', () => {
    const { registry } = setup();
    expect(registry.names).toEqual(
      expect.arrayContaining([
        'help',
        'whoami',
        'experience',
        'skills',
        'projects',
        'contact',
        'clear',
        'matrix',
        'theme',
      ]),
    );
  });

  it('rejects duplicates and is extensible', async () => {
    const { registry, ctx } = setup();
    expect(() =>
      registry.register({ name: 'help', summary: '', run: () => ({ lines: [] }) }),
    ).toThrow();
    registry.register({
      name: 'echo',
      summary: 'e',
      run: (a) => ({ lines: [{ text: a.join(' '), kind: 'output' }] }),
    });
    expect(texts(await registry.execute('echo hi there', ctx))).toBe('hi there');
  });

  it('handles unknown commands', async () => {
    const { registry, ctx } = setup();
    const r = await registry.execute('Foo bar', ctx);
    expect(r.lines).toEqual([{ text: 'command not found: foo — type help', kind: 'error' }]);
  });

  it('returns no lines for empty input', async () => {
    const { registry, ctx } = setup();
    expect((await registry.execute('   ', ctx)).lines).toEqual([]);
  });

  it('turns thrown errors into error lines', async () => {
    const { registry, ctx } = setup();
    registry.register({
      name: 'boom',
      summary: '',
      run: () => {
        throw new Error('bad');
      },
    });
    expect((await registry.execute('boom', ctx)).lines[0]).toEqual({
      text: 'boom: bad',
      kind: 'error',
    });
  });
});

describe('content commands', () => {
  it('help lists every command', async () => {
    const { registry, ctx } = setup();
    const t = texts(await registry.execute('help', ctx));
    for (const name of registry.names) expect(t).toContain(name);
  });

  it('whoami, experience, skills use profile data', async () => {
    const { registry, ctx } = setup();
    expect(texts(await registry.execute('whoami', ctx))).toContain('Arthur Rio');
    expect(texts(await registry.execute('experience', ctx))).toContain('modelcode.ai');
    expect(texts(await registry.execute('skills', ctx))).toContain('FastAPI');
  });

  it('contact returns safe link data, not HTML', async () => {
    const { registry, ctx } = setup();
    const r = await registry.execute('contact', ctx);
    const hrefs = r.lines.map((l) => l.href).filter(Boolean);
    expect(hrefs).toContain(`mailto:${profile.email}`);
    expect(texts(r)).not.toContain('<a');
  });

  it('projects uses the loader', async () => {
    const { registry, ctx } = setup();
    const r = await registry.execute('projects', ctx);
    expect(r.lines.some((l) => l.href === profile.projects[0]?.url)).toBe(true);
    expect(texts(r)).toContain('offline');
  });
});

describe('clear', () => {
  it('requests a clear', async () => {
    const { registry, ctx } = setup();
    expect(await registry.execute('clear', ctx)).toEqual({ lines: [], clear: true });
  });
});

describe('matrix', () => {
  it('toggles with no argument', async () => {
    const { registry, ctx, rain } = setup();
    await registry.execute('matrix', ctx);
    expect(rain.value).toBe(0);
    await registry.execute('matrix', ctx);
    expect(rain.value).toBe(5);
  });

  it('supports up, down, on, off and numeric levels', async () => {
    const { registry, ctx, rain } = setup();
    await registry.execute('matrix up', ctx);
    expect(rain.value).toBe(7);
    await registry.execute('matrix up', ctx);
    await registry.execute('matrix up', ctx);
    expect(rain.value).toBe(10);
    await registry.execute('matrix down', ctx);
    expect(rain.value).toBe(8);
    await registry.execute('matrix off', ctx);
    expect(rain.value).toBe(0);
    await registry.execute('matrix down', ctx);
    expect(rain.value).toBe(0);
    await registry.execute('matrix on', ctx);
    expect(rain.value).toBe(5);
    await registry.execute('matrix 3', ctx);
    expect(rain.value).toBe(3);
  });

  it('rejects invalid arguments without changing intensity', async () => {
    const { registry, ctx, rain } = setup();
    for (const bad of ['matrix 11', 'matrix -1', 'matrix 2.5', 'matrix sideways']) {
      const r = await registry.execute(bad, ctx);
      expect(r.lines[0]?.kind).toBe('error');
    }
    expect(rain.value).toBe(5);
  });
});

describe('theme', () => {
  it('cycles through all themes and wraps', async () => {
    const { registry, ctx } = setup();
    const seen: string[] = [ctx.theme.get()];
    for (let i = 0; i < THEMES.length; i++) {
      await registry.execute('theme', ctx);
      seen.push(ctx.theme.get());
    }
    expect(seen).toEqual(['purple', 'green', 'amber', 'cyan', 'purple']);
  });

  it('sets a named theme and rejects unknown ones', async () => {
    const { registry, ctx } = setup();
    await registry.execute('theme cyan', ctx);
    expect(ctx.theme.get()).toBe('cyan');
    const r = await registry.execute('theme pink', ctx);
    expect(r.lines[0]?.kind).toBe('error');
    expect(ctx.theme.get()).toBe('cyan');
  });

  it('writes data-theme on the root element', async () => {
    const root = document.createElement('html');
    const theme = createDomTheme(root);
    theme.set('amber');
    expect(root.dataset['theme']).toBe('amber');
    theme.set('bogus');
    expect(root.dataset['theme']).toBe('amber');
  });
});
