import type { Sample } from '../data/catalog';
import { Deck } from './deck';
import type { SampleSource } from './deck';

export type Phase = 'countdown' | 'running' | 'paused' | 'finished';
export type Snapshot = {
  phase: Phase; sample: Sample; prefix: string; position: number; completed: number;
  credited: number; correctAttempts: number; errors: number; speed: number | null;
  accuracy: number | null; remainingMs: number; elapsedMs: number; countdown: number;
  layoutHint: boolean; errorFlash: boolean; indentToRemove: number;
};

export class Session {
  private phase: Phase = 'countdown';
  private deck: SampleSource;
  private sample: Sample;
  private characters: string[];
  private position = 0;
  private autoIndentPositions = new Set<number>();
  // Editor indentation beyond the sample's next line must be removed manually.
  private indentToRemove = 0;
  private completed = 0;
  private completedCharacters = 0;
  private correctAttempts = 0;
  private errors = 0;
  private elapsed = 0;
  private runningSince = 0;
  private countdownSince: number;
  private layoutHint = false;
  private errorUntil = 0;
  private now: () => number;
  private durationMs: number;

  constructor(samples: Sample[] | SampleSource, duration: number, now = () => performance.now(), random = Math.random) {
    if (![30, 60, 120].includes(duration)) throw new Error('Недопустимая длительность');
    this.deck = Array.isArray(samples) ? new Deck(samples, random) : samples;
    this.sample = this.deck.next();
    this.characters = Array.from(this.sample.text);
    this.now = now;
    this.durationMs = duration * 1000;
    this.countdownSince = now();
  }

  private activeTime(time: number): number {
    return Math.min(this.durationMs, this.elapsed + (this.phase === 'running' ? Math.max(0, time - this.runningSince) : 0));
  }

  tick(): void {
    const time = this.now();
    if (this.phase === 'countdown' && time - this.countdownSince >= 3000) {
      // Start when the sample is actually revealed, even after a delayed frame.
      this.phase = 'running'; this.runningSince = time;
    }
    if (this.phase === 'running' && this.activeTime(time) >= this.durationMs) {
      this.elapsed = this.durationMs; this.phase = 'finished';
    }
  }

  input(character: string): void {
    // Input never reveals the sample: only the rendering clock can end countdown.
    if (this.phase !== 'running') return;
    this.tick();
    if (this.phase !== 'running' || Array.from(character).length !== 1) return;
    if (!this.indentToRemove && character === this.characters[this.position]) {
      this.correctAttempts++; this.position++; this.layoutHint = false; this.errorUntil = 0;
      if (character === '\n' && this.position < this.characters.length) {
        let lineStart = this.position - 2;
        while (lineStart >= 0 && this.characters[lineStart] !== '\n') lineStart--;
        let indentation = 0;
        while (this.characters[lineStart + 1 + indentation] === ' ') indentation++;
        if (this.characters[this.position - 2] === ':') {
          let targetIndentation = 0;
          while (this.characters[this.position + targetIndentation] === ' ') targetIndentation++;
          indentation = targetIndentation > indentation ? targetIndentation : indentation + 4;
        }
        // Keep the previous line's indentation, including on a dedented target
        // line. Matching spaces advance the sample; excess spaces await Backspace.
        for (let i = 0; i < indentation && this.position < this.characters.length; i++) {
          if (this.characters[this.position] === ' ') this.autoIndentPositions.add(this.position++);
          else this.indentToRemove++;
        }
      }
      if (this.position === this.characters.length) {
        this.completedCharacters += this.characters.length - this.autoIndentPositions.size;
        this.completed++; this.position = 0; this.autoIndentPositions.clear(); this.indentToRemove = 0;
        this.sample = this.deck.next(); this.characters = Array.from(this.sample.text);
      }
    } else {
      this.errors++; this.errorUntil = this.now() + 350;
      this.layoutHint = /[а-яё]/i.test(character) && /[a-z]/i.test(this.characters[this.position]);
    }
  }

  backspace(): void {
    if (this.phase !== 'running') return;
    this.tick();
    if (this.phase === 'running') {
      if (this.indentToRemove) this.indentToRemove--;
      else { this.position = Math.max(0, this.position - 1); this.autoIndentPositions.delete(this.position); }
      this.layoutHint = false; this.errorUntil = 0;
    }
  }

  pause(): void {
    // Do not tick countdown here: losing focus must not reveal or start it.
    if (this.phase === 'running') {
      this.elapsed = this.activeTime(this.now());
      this.phase = this.elapsed >= this.durationMs ? 'finished' : 'paused';
    } else if (this.phase === 'countdown') this.phase = 'paused';
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'countdown'; this.countdownSince = this.now(); this.errorUntil = 0;
  }

  snapshot(): Snapshot {
    const time = this.now();
    const elapsedMs = this.activeTime(time);
    const credited = this.completedCharacters + this.position - this.autoIndentPositions.size;
    const attempts = this.correctAttempts + this.errors;
    return {
      phase: this.phase, sample: this.sample, position: this.position,
      prefix: this.characters.slice(0, this.position).join('') + ' '.repeat(this.indentToRemove), completed: this.completed,
      credited, correctAttempts: this.correctAttempts, errors: this.errors,
      speed: attempts && elapsedMs > 0 ? Math.round(credited * 60000 / elapsedMs) : null,
      accuracy: attempts ? Math.round(this.correctAttempts / attempts * 1000) / 10 : null,
      elapsedMs, remainingMs: this.durationMs - elapsedMs,
      countdown: Math.max(1, 3 - Math.floor((time - this.countdownSince) / 1000)),
      layoutHint: this.layoutHint, errorFlash: this.errorUntil > time, indentToRemove: this.indentToRemove,
    };
  }
}
