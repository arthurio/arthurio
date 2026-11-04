/** Pure input tokenizer: splits a command line into a command and arguments. */

export interface ParsedInput {
  /** Lower-cased command name. */
  command: string;
  args: string[];
  raw: string;
}

/**
 * Split on whitespace, honouring single/double quotes and backslash escapes.
 * An unterminated quote consumes the rest of the line.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inToken = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === '\\' && quote === '"' && i + 1 < input.length) {
        i++;
        current += input.charAt(i);
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inToken = true;
    } else if (ch === '\\' && i + 1 < input.length) {
      i++;
      current += input.charAt(i);
      inToken = true;
    } else if (/\s/.test(ch)) {
      if (inToken) {
        tokens.push(current);
        current = '';
        inToken = false;
      }
    } else {
      current += ch;
      inToken = true;
    }
  }
  if (inToken) tokens.push(current);
  return tokens;
}

/** Returns null for empty / whitespace-only input. */
export function parseInput(input: string): ParsedInput | null {
  const tokens = tokenize(input);
  const [first, ...args] = tokens;
  if (first === undefined) return null;
  return { command: first.toLowerCase(), args, raw: input.trim() };
}
