import { describe, expect, it } from 'vitest';
import { AlgorithmDeck } from './algorithms';
import { getSamples, conditionsKey, CATALOG_VERSION } from './catalog';
import { Session } from '../engine/session';

function seeded(seed: number) {
  let state = seed;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
const commands = ['go()', 'left()', 'right()', 'jump()', 'put()', 'take()', 'paint(red)', 'paint(blue)', 'paint(white)', 'paint(yellow)', 'paint(purple)', 'paint(green)'];

describe('предоставленные команды Марка', () => {
  it('содержит все команды и шесть цветов без кавычек', () => {
    const samples = getSamples('commands');
    expect(samples.map(s => s.text).sort()).toEqual([...commands].sort());
    expect(samples.every(s => s.source.includes('пользовател') && s.status === 'confirmed')).toBe(true);
    expect(new Set(samples.map(s => s.id)).size).toBe(samples.length);
  });
});

describe('генератор алгоритмов', () => {
  it('создаёт новые фрагменты из разрешённых команд, цветов и циклов', () => {
    const deck = new AlgorithmDeck(seeded(42));
    const texts = new Set<string>(), observedCommands = new Set<string>(), counts = new Set<number>();
    let previous = '', sawSequence = false, sawMixed = false, sawLoops = false, sawRepeatedCommand = false;
    for (let i = 0; i < 500; i++) {
      const sample = deck.next(); const lines = sample.text.split('\n');
      expect(sample.type).toBe('fragment'); expect(sample.source).toBeTruthy();
      expect(lines.length).toBeGreaterThanOrEqual(12); expect(lines.length).toBeLessThanOrEqual(30);
      expect(sample.text).not.toBe(previous); previous = sample.text; texts.add(sample.text);
      let loops = 0, outside = 0, inLoop = false;
      for (const [index, line] of lines.entries()) {
        const loop = /^for i in range\(([2-9]|10)\):$/.exec(line);
        if (loop) {
          loops++; counts.add(Number(loop[1])); inLoop = true;
          expect(lines[index + 1]?.startsWith('    ')).toBe(true);
          continue;
        }
        const indented = line.startsWith('    ');
        if (indented) expect(inLoop).toBe(true);
        else { inLoop = false; outside++; }
        const command = indented ? line.slice(4) : line;
        expect(commands).toContain(command); observedCommands.add(command);
        sawRepeatedCommand ||= command === lines[index - 1]?.trim();
      }
      sawSequence ||= loops === 0; sawMixed ||= loops > 0 && outside > 0; sawLoops ||= loops > 0 && outside === 0;
    }
    expect(texts.size).toBeGreaterThan(450);
    expect([...observedCommands].sort()).toEqual([...commands].sort());
    expect([...counts].sort((a,b) => a-b)).toEqual([2,3,4,5,6,7,8,9,10]);
    expect([sawSequence, sawMixed, sawLoops]).toEqual([true, true, true]);
    expect(sawRepeatedCommand).toBe(true);
  });
  it('не зацикливается и не повторяет соседние образцы при постоянном random', () => {
    const deck = new AlgorithmDeck(() => 0);
    let previous = '';
    for (let i = 0; i < 30; i++) { const sample = deck.next(); expect(sample.text).not.toBe(previous); previous = sample.text; }
  });
  it('новая сессия генерирует новые сочетания', () => {
    const first = new AlgorithmDeck(seeded(1)), second = new AlgorithmDeck(seeded(2));
    expect(Array.from({length: 10}, () => first.next().text)).not.toEqual(Array.from({length: 10}, () => second.next().text));
  });
  it('сразу переходит к новому сгенерированному образцу после точного ввода', () => {
    let time = 0; const session = new Session(new AlgorithmDeck(seeded(5)), 60, () => time);
    time = 3000; session.tick(); const first = session.snapshot().sample.text;
    const manualText = first.replace(/^ +/gm, '');
    for (const [index, line] of first.split('\n').entries()) {
      if (index) session.input('\n');
      if (!line.startsWith('    ') && index && first.split('\n')[index - 1].startsWith('    ')) {
        for (let i = 0; i < 4; i++) session.backspace();
      }
      for (const char of line.trimStart()) session.input(char);
    }
    expect(session.snapshot()).toMatchObject({ completed: 1, credited: manualText.length, prefix: '', errors: 0 });
    expect(session.snapshot().sample.text).not.toBe(first);
  });
  it('сохраняет сопоставимые условия генератора и отделяет старый набор', () => {
    expect(CATALOG_VERSION).not.toBe('mark-demo-1');
    const baseline = getSamples('algorithms');
    const first = conditionsKey('algorithms', 60, baseline);
    new AlgorithmDeck(seeded(999)).next();
    expect(conditionsKey('algorithms', 60, baseline)).toBe(first);
    expect(first).not.toBe(conditionsKey('algorithms', 60, baseline, 'mark-demo-1'));
    expect(first).not.toBe(conditionsKey('commands', 60, getSamples('commands')));
  });
});
