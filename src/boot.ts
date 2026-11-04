/** Short typed boot log. Skippable by any key press or click; instant under reduced motion. */

export const BOOT_LINES: readonly string[] = [
  'ARTHURIO BIOS v1.0  (c) matrix systems',
  'checking memory ........ ok',
  'mounting /dev/rain ...... ok',
  'loading profile.ts ...... ok',
  'starting terminal ....... ok',
  '',
  'Welcome, guest.',
];

export interface BootOptions {
  element: HTMLElement;
  lines?: readonly string[];
  reducedMotion: boolean;
  charDelayMs?: number;
  lineDelayMs?: number;
  /** Called exactly once when the boot log finishes or is skipped. */
  onDone: () => void;
}

export interface BootHandle {
  skip(): void;
  readonly done: boolean;
}

export function runBoot(options: BootOptions): BootHandle {
  const { element, onDone } = options;
  const lines = options.lines ?? BOOT_LINES;
  const charDelay = options.charDelayMs ?? 8;
  const lineDelay = options.lineDelayMs ?? 90;
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function finish(): void {
    if (finished) return;
    finished = true;
    if (timer !== undefined) clearTimeout(timer);
    document.removeEventListener('keydown', skip, true);
    document.removeEventListener('pointerdown', skip, true);
    element.textContent = '';
    onDone();
  }

  function skip(): void {
    finish();
  }

  const handle: BootHandle = {
    skip: () => skip(),
    get done() {
      return finished;
    },
  };

  if (options.reducedMotion || lines.length === 0) {
    finish();
    return handle;
  }

  document.addEventListener('keydown', skip, true);
  document.addEventListener('pointerdown', skip, true);

  let lineIndex = 0;
  let charIndex = 0;
  element.textContent = '';
  let current = '';

  function tick(): void {
    if (finished) return;
    const line = lines[lineIndex];
    if (line === undefined) {
      timer = setTimeout(finish, 250);
      return;
    }
    if (charIndex < line.length) {
      current += line.charAt(charIndex);
      charIndex++;
      element.textContent = `${lines.slice(0, lineIndex).join('\n')}${lineIndex > 0 ? '\n' : ''}${current}`;
      timer = setTimeout(tick, charDelay);
    } else {
      lineIndex++;
      charIndex = 0;
      current = '';
      timer = setTimeout(tick, lineDelay);
    }
  }
  tick();
  return handle;
}
