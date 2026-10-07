import { ALGORITHM_RULES, getSamples, MARK_SOURCE } from './catalog';
import type { Sample } from './catalog';
import type { SampleSource } from '../engine/deck';

/** Generates typing material only. It does not execute or validate Mark logic. */
export class AlgorithmDeck implements SampleSource {
  private commands = getSamples('commands').map(sample => sample.text);
  private patterns: (typeof ALGORITHM_RULES.patterns[number])[] = [];
  private previous = '';
  private count = 0;
  private random: () => number;

  constructor(random = Math.random) { this.random = random; }

  private integer(min: number, max: number) {
    return min + Math.min(max - min, Math.max(0, Math.floor(this.random() * (max - min + 1))));
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.integer(0, i); [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  next(): Sample {
    if (!this.patterns.length) this.patterns = this.shuffle([...ALGORITHM_RULES.patterns]);
    const pattern = this.patterns.shift()!;
    const length = this.integer(ALGORITHM_RULES.minLines, ALGORITHM_RULES.maxLines);
    const command = () => this.commands[this.integer(0, this.commands.length - 1)];
    const loopCount = pattern === 'sequence' ? 0 : this.integer(1, 3);
    const blocks: string[][] = Array.from({ length: loopCount }, () => [
      `for i in range(${this.integer(ALGORITHM_RULES.minRepeats, ALGORITHM_RULES.maxRepeats)}):`,
      `    ${command()}`,
    ]);
    const outside: string[][] = pattern === 'mixed' ? [[command()]] : [];
    let remaining = length - loopCount * 2 - outside.length;
    while (remaining-- > 0) {
      if (loopCount && (pattern === 'loops' || this.random() < .6)) {
        blocks[this.integer(0, loopCount - 1)].push(`    ${command()}`);
      } else outside.push([command()]);
    }
    // Shuffle whole blocks so their indented bodies stay attached to the header.
    // Commands are sampled independently; repeats such as left(), left() are valid.
    const lines = this.shuffle([...blocks, ...outside]).flat();
    if (lines.join('\n') === this.previous) {
      // Bounded fallback even if the injected RNG always returns the same value.
      const last = lines.at(-1)!;
      const prefix = last.startsWith('    ') ? '    ' : '';
      const command = last.slice(prefix.length);
      lines[lines.length - 1] = prefix + this.commands[(this.commands.indexOf(command) + 1) % this.commands.length];
    }
    const text = lines.join('\n'); this.previous = text;
    return {
      id: `algorithm-${++this.count}`, title: `Фрагмент ${this.count}`, type: 'fragment',
      category: 'Случайные алгоритмы', text, status: 'generated',
      source: `Случайное сочетание команд по правилам ${ALGORITHM_RULES.version}. ${MARK_SOURCE}`,
    };
  }
}
