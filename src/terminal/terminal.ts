/**
 * Terminal DOM component. Builds all DOM with createElement/textContent only
 * (never innerHTML) so command output, including GitHub-sourced text, cannot
 * inject markup.
 */

import { complete } from './completion';
import type { CommandContext, CommandRegistry } from './commands';
import { History } from './history';
import { dim, isSafeHref, type CommandResult, type Line } from './types';

export const PROMPT = 'guest@arthurio:~$';
const MAX_LOG_LINES = 500;

const promptLine = (input: string): Line => ({ text: `${PROMPT} ${input}`, kind: 'input' });

export interface TerminalOptions {
  output: HTMLElement;
  input: HTMLInputElement;
  form: HTMLFormElement;
  registry: CommandRegistry;
  context: CommandContext;
  history?: History;
}

/** Build the DOM node for one line. Exported for tests. */
export function renderLine(line: Line, doc: Document = document): HTMLElement {
  const el = doc.createElement('div');
  el.className = `line line-${line.kind}`;
  const text = line.text === '' ? ' ' : line.text;
  if (line.href !== undefined && isSafeHref(line.href)) {
    const a = doc.createElement('a');
    a.textContent = text;
    a.href = line.href;
    if (!line.href.startsWith('mailto:')) a.target = '_blank';
    a.rel = 'noopener noreferrer';
    el.appendChild(a);
  } else {
    el.textContent = text;
  }
  return el;
}

export class Terminal {
  private readonly output: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly form: HTMLFormElement;
  private readonly registry: CommandRegistry;
  private readonly context: CommandContext;
  private readonly history: History;
  private queue: Promise<void> = Promise.resolve();
  private readonly cleanup: (() => void)[] = [];

  constructor(options: TerminalOptions) {
    this.output = options.output;
    this.input = options.input;
    this.form = options.form;
    this.registry = options.registry;
    this.context = options.context;
    this.history = options.history ?? new History();

    const onSubmit = (event: Event): void => {
      event.preventDefault();
      const value = this.input.value;
      this.input.value = '';
      void this.run(value);
    };
    const onKeydown = (event: KeyboardEvent): void => this.handleKey(event);
    this.form.addEventListener('submit', onSubmit);
    this.input.addEventListener('keydown', onKeydown);
    this.cleanup.push(
      () => this.form.removeEventListener('submit', onSubmit),
      () => this.input.removeEventListener('keydown', onKeydown),
    );
  }

  focus(): void {
    this.input.focus({ preventScroll: true });
  }

  clear(): void {
    this.output.replaceChildren();
  }

  print(lines: readonly Line[]): void {
    if (lines.length === 0) return;
    const fragment = document.createDocumentFragment();
    for (const line of lines) fragment.appendChild(renderLine(line));
    this.output.appendChild(fragment);
    while (this.output.childElementCount > MAX_LOG_LINES) {
      this.output.firstElementChild?.remove();
    }
    this.output.scrollTop = this.output.scrollHeight;
  }

  /** Echo and execute a line. Runs are serialised so async output stays ordered. */
  run(input: string): Promise<void> {
    const task = this.queue.then(() => this.execute(input));
    this.queue = task.catch(() => undefined);
    return task;
  }

  destroy(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup.length = 0;
  }

  private async execute(input: string): Promise<void> {
    this.history.push(input);
    this.print([promptLine(input)]);
    const result: CommandResult = await this.registry.execute(input, this.context);
    if (result.clear) this.clear();
    this.print(result.lines);
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const value = this.history.previous(this.input.value);
      if (value !== null) this.setInput(value);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const value = this.history.next();
      if (value !== null) this.setInput(value);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const result = complete(this.input.value, this.registry);
      if (result.completed !== this.input.value) this.setInput(result.completed);
      if (result.matches.length > 1) {
        this.print([promptLine(this.input.value), dim(result.matches.join('  '))]);
      }
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      this.clear();
    }
  }

  private setInput(value: string): void {
    this.input.value = value;
    this.input.setSelectionRange(value.length, value.length);
  }
}
