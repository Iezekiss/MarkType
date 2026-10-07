import type { Sample } from '../data/catalog';
export interface SampleSource { next(): Sample; }

export class Deck {
  private readonly samples: Sample[];
  private bag: Sample[] = [];
  private previous = '';
  private random: () => number;

  constructor(samples: Sample[], random = Math.random) {
    this.samples = [...new Map(samples.filter(s => s.text.length && s.status !== 'pending').map(s => [s.text, { ...s }])).values()];
    if (!this.samples.length) throw new Error('В наборе нет доступных образцов');
    this.random = random;
  }

  next(): Sample {
    if (!this.bag.length) {
      this.bag = [...this.samples];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.max(0, Math.floor(this.random() * (i + 1))));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag.length > 1 && this.bag[0].text === this.previous) [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
    }
    const sample = this.bag.shift()!;
    this.previous = sample.text;
    return sample;
  }
}
