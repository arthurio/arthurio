/** Pure tab completion for command names and first arguments. */

export interface CompletionSource {
  commands: readonly string[];
  /** Candidate first arguments for a command (empty when none). */
  argsFor(command: string): readonly string[];
}

export interface CompletionResult {
  /** The new input value (equal to the input when nothing could be completed). */
  completed: string;
  /** All candidates when more than one remains ambiguous. */
  matches: string[];
}

export function commonPrefix(words: readonly string[]): string {
  const [first, ...rest] = words;
  if (first === undefined) return '';
  let prefix = first;
  for (const word of rest) {
    while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function completeWord(
  head: string,
  word: string,
  candidates: readonly string[],
  input: string,
): CompletionResult {
  const lower = word.toLowerCase();
  const matches = candidates.filter((c) => c.toLowerCase().startsWith(lower)).sort();
  if (matches.length === 0) return { completed: input, matches: [] };
  if (matches.length === 1) return { completed: `${head}${matches[0]} `, matches: [] };
  const prefix = commonPrefix(matches);
  const completed = prefix.length > word.length ? `${head}${prefix}` : input;
  return { completed, matches };
}

export function complete(input: string, source: CompletionSource): CompletionResult {
  const match = /^(\s*)(\S*)$/.exec(input);
  if (match) {
    const lead = match[1] ?? '';
    const word = match[2] ?? '';
    return completeWord(lead, word, source.commands, input);
  }
  const argMatch = /^(\s*(\S+)\s+)(\S*)$/.exec(input);
  if (argMatch) {
    const head = argMatch[1] ?? '';
    const command = (argMatch[2] ?? '').toLowerCase();
    const word = argMatch[3] ?? '';
    return completeWord(head, word, source.argsFor(command), input);
  }
  return { completed: input, matches: [] };
}
