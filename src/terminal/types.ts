/** Structured terminal output. Commands never produce HTML. */

export type LineKind = 'output' | 'heading' | 'dim' | 'error' | 'input' | 'link';

export interface Line {
  text: string;
  kind: LineKind;
  /** When set (and safe), the line is rendered as a link. */
  href?: string;
}

export interface CommandResult {
  lines: Line[];
  /** Clear the terminal log before printing `lines`. */
  clear?: boolean;
}

export const out = (text: string): Line => ({ text, kind: 'output' });
export const heading = (text: string): Line => ({ text, kind: 'heading' });
export const dim = (text: string): Line => ({ text, kind: 'dim' });
export const error = (text: string): Line => ({ text, kind: 'error' });
export const link = (text: string, href: string): Line => ({ text, kind: 'link', href });
export const blank = (): Line => out('');

const SAFE_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:'];

/** Only http(s) and mailto links are ever rendered as anchors. */
export function isSafeHref(href: string): boolean {
  try {
    return SAFE_PROTOCOLS.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}
