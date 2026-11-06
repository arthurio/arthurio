/** Extensible command registry. Commands return structured lines, never HTML. */

import type { Profile } from '../data/profile';
import { parseInput } from './parser';
import type { CompletionSource } from './completion';
import { THEMES, nextTheme, type ThemeControl } from './theme';
import type { ProjectsResult } from './github';
import { blank, dim, error, heading, link, out, type CommandResult, type Line } from './types';

/** Minimal rain surface the `matrix` command needs. */
export interface RainControl {
  getIntensity(): number;
  setIntensity(value: number): void;
  getRestoreIntensity(): number;
}

export interface CommandContext {
  profile: Profile;
  registry: CommandRegistry;
  rain: RainControl;
  theme: ThemeControl;
  loadProjects(): Promise<ProjectsResult>;
}

export interface Command {
  name: string;
  summary: string;
  usage?: string;
  /** First-argument candidates, used for tab completion. */
  args?: readonly string[];
  run(args: string[], ctx: CommandContext): CommandResult | Promise<CommandResult>;
}

export class CommandRegistry implements CompletionSource {
  private readonly byName = new Map<string, Command>();

  register(command: Command): this {
    const key = command.name.toLowerCase();
    if (this.byName.has(key)) throw new Error(`Command already registered: ${key}`);
    this.byName.set(key, command);
    return this;
  }

  get(name: string): Command | undefined {
    return this.byName.get(name.toLowerCase());
  }

  get names(): string[] {
    return [...this.byName.keys()];
  }

  /** CompletionSource */
  get commands(): string[] {
    return this.names;
  }

  get commandsList(): Command[] {
    return [...this.byName.values()];
  }

  argsFor(command: string): readonly string[] {
    return this.get(command)?.args ?? [];
  }

  /** Parse and run a line. Never throws; failures become error lines. */
  async execute(input: string, ctx: CommandContext): Promise<CommandResult> {
    const parsed = parseInput(input);
    if (!parsed) return { lines: [] };
    const command = this.get(parsed.command);
    if (!command) {
      return { lines: [error(`command not found: ${parsed.command} — type help`)] };
    }
    try {
      return await command.run(parsed.args, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { lines: [error(`${command.name}: ${message}`)] };
    }
  }
}

const MATRIX_SYNTAX = 'matrix [up|down|on|off|0-10]';

function formatIntensity(value: number): string {
  return value <= 0 ? 'off' : `${Math.round(value * 10) / 10}/10`;
}

export function runMatrix(args: string[], rain: RainControl): CommandResult {
  const arg = args[0]?.toLowerCase();
  const current = rain.getIntensity();
  let next: number;
  if (arg === undefined) {
    next = current > 0 ? 0 : rain.getRestoreIntensity();
  } else if (arg === 'off') {
    next = 0;
  } else if (arg === 'on') {
    next = current > 0 ? current : rain.getRestoreIntensity();
  } else if (arg === 'up') {
    next = Math.min(10, current + 2);
  } else if (arg === 'down') {
    next = Math.max(0, current - 2);
  } else if (/^\d+$/.test(arg) && Number(arg) <= 10) {
    next = Number(arg);
  } else {
    return {
      lines: [error(`matrix: invalid argument '${args[0] ?? ''}'`), dim(`usage: ${MATRIX_SYNTAX}`)],
    };
  }
  rain.setIntensity(next);
  return { lines: [out(`matrix rain: ${formatIntensity(rain.getIntensity())}`)] };
}

export function runTheme(args: string[], theme: ThemeControl): CommandResult {
  const arg = args[0]?.toLowerCase();
  if (arg === undefined) {
    const next = nextTheme(theme.get());
    theme.set(next);
    return { lines: [out(`theme: ${next}`)] };
  }
  if (theme.names.includes(arg)) {
    theme.set(arg);
    return { lines: [out(`theme: ${arg}`)] };
  }
  return {
    lines: [
      error(`theme: unknown theme '${args[0] ?? ''}'`),
      dim(`available: ${theme.names.join(', ')}`),
    ],
  };
}

const help: Command = {
  name: 'help',
  summary: 'list available commands',
  run: (_args, ctx) => ({
    lines: [
      heading('Available commands:'),
      ...ctx.registry.commandsList.flatMap((c) => [
        out(`  ${c.usage ?? c.name}`),
        dim(`      ${c.summary}`),
      ]),
      blank(),
      dim('Tab completes, arrow up/down browse history.'),
    ],
  }),
};

const whoami: Command = {
  name: 'whoami',
  summary: 'who am I',
  run: (_args, { profile }) => ({
    lines: [
      heading(`${profile.name} (${profile.handle})`),
      out(`Pronouns: ${profile.pronouns}`),
      out(profile.headline),
      out(profile.currentWork),
      out(`Currently learning: ${profile.learning.join(', ')}`),
    ],
  }),
};

const experience: Command = {
  name: 'experience',
  summary: 'work experience',
  run: (_args, { profile }) => ({
    lines: profile.experience.flatMap((e): Line[] => [
      heading(`${e.role} @ ${e.org} (${e.period})`),
      out(`  ${e.summary}`),
    ]),
  }),
};

const skills: Command = {
  name: 'skills',
  summary: 'technical skills',
  run: (_args, { profile }) => ({
    lines: [heading('Skills:'), ...profile.skills.map((s) => out(`  - ${s}`))],
  }),
};

const projects: Command = {
  name: 'projects',
  summary: 'open source projects (live from GitHub)',
  run: async (_args, ctx) => {
    const { projects: list, source } = await ctx.loadProjects();
    const lines: Line[] = [heading('Projects:')];
    for (const p of list) {
      lines.push(link(`  ${p.name}`, p.url));
      if (p.description) lines.push(out(`    ${p.description}`));
    }
    lines.push(dim(source === 'github' ? 'source: GitHub API' : 'source: built-in list (offline)'));
    return { lines };
  },
};

const contact: Command = {
  name: 'contact',
  summary: 'how to reach me',
  run: (_args, { profile }) => ({
    lines: [
      heading('Contact:'),
      link(`  Email:    ${profile.email}`, `mailto:${profile.email}`),
      link(`  LinkedIn: ${profile.linkedin}`, profile.linkedin),
      link(`  GitHub:   ${profile.github}`, profile.github),
    ],
  }),
};

const clear: Command = {
  name: 'clear',
  summary: 'clear the screen',
  run: () => ({ lines: [], clear: true }),
};

const matrix: Command = {
  name: 'matrix',
  summary: 'toggle or set rain intensity',
  usage: MATRIX_SYNTAX,
  args: ['up', 'down', 'on', 'off'],
  run: (args, ctx) => runMatrix(args, ctx.rain),
};

const theme: Command = {
  name: 'theme',
  summary: 'cycle or set the colour theme',
  usage: 'theme [name]',
  run: (args, ctx) => runTheme(args, ctx.theme),
};

export function createDefaultRegistry(themeNames: readonly string[] = THEMES): CommandRegistry {
  const registry = new CommandRegistry();
  for (const command of [help, whoami, experience, skills, projects, contact, clear, matrix]) {
    registry.register(command);
  }
  registry.register({ ...theme, args: themeNames });
  return registry;
}
