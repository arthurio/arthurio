/** Pure command history with shell-like arrow-key navigation. */

export class History {
  private entries: string[] = [];
  /** entries.length means "not navigating". */
  private index = 0;
  private draft = '';

  constructor(private readonly max = 100) {}

  get size(): number {
    return this.entries.length;
  }

  toArray(): string[] {
    return [...this.entries];
  }

  /** Record a submitted line. Blank lines and consecutive duplicates are ignored. */
  push(entry: string): void {
    const trimmed = entry.trim();
    if (trimmed !== '' && this.entries[this.entries.length - 1] !== trimmed) {
      this.entries.push(trimmed);
      if (this.entries.length > this.max) this.entries.shift();
    }
    this.reset();
  }

  /** Arrow up. `current` is the live input, saved as a draft on first use. */
  previous(current: string): string | null {
    if (this.entries.length === 0) return null;
    if (this.index === this.entries.length) this.draft = current;
    if (this.index > 0) this.index--;
    return this.entries[this.index] ?? null;
  }

  /** Arrow down. Returns the saved draft after the newest entry. */
  next(): string | null {
    if (this.index >= this.entries.length) return null;
    this.index++;
    if (this.index === this.entries.length) return this.draft;
    return this.entries[this.index] ?? null;
  }

  reset(): void {
    this.index = this.entries.length;
    this.draft = '';
  }
}
