import { expect, it } from 'vitest';
import { Deck } from './deck';
import { getSamples, normalizeCustomText, conditionsKey } from '../data/catalog';

it('перемешивает весь набор и не повторяет текст на стыках', () => {
  const samples = getSamples('algorithms'); const deck = new Deck(samples, () => 0);
  const first = samples.map(() => deck.next());
  expect(new Set(first.map(s => s.id)).size).toBe(samples.length);
  expect(first.map(s => s.id)).not.toEqual(samples.map(s => s.id));
  let prev = first.at(-1)!;
  for (let i = 0; i < 100; i++) { const next = deck.next(); expect(next.text).not.toBe(prev.text); prev = next; }
});
it('один образец можно повторять', () => {
  const d = new Deck([getSamples('commands')[0]]); expect(d.next().text).toBe('go()'); expect(d.next().text).toBe('go()');
});
it('отвергает пустые и неподтверждённые образцы', () => {
  expect(() => new Deck([])).toThrow();
  expect(() => new Deck([{ ...getSamples('commands')[0], text: '' }])).toThrow();
  expect(() => new Deck([{ ...getSamples('commands')[0], status: 'pending' }])).toThrow();
});
it('разные id одного текста не допускают соседний повтор при наличии другого текста', () => {
  const base = getSamples('commands')[0];
  const d = new Deck([{ ...base, id: 'a' }, { ...base, id: 'b' }, { ...base, id: 'c', text: 'go()\ngo()' }], () => 0.99);
  for (let i = 0; i < 10; i++) { expect(d.next().text).toBe('go()'); expect(d.next().text).toBe('go()\ngo()'); }
});
it('нормализует только переводы строк и табы, сохраняя значимые пробелы', () => {
  expect(normalizeCustomText(' go()\r\n\tgo()  \n')).toBe(' go()\n    go()  \n');
});
it('условия рекорда учитывают длительность, режим, версию и состав', () => {
  const a = getSamples('commands');
  expect(conditionsKey('commands', 30, a)).not.toBe(conditionsKey('commands', 60, a));
  expect(conditionsKey('commands', 30, a)).not.toBe(conditionsKey('custom', 30, a));
  expect(conditionsKey('commands', 30, a)).not.toBe(conditionsKey('commands', 30, [{ ...a[0], text: 'go() ' }]));
  expect(conditionsKey('commands', 30, a, 'v2')).not.toBe(conditionsKey('commands', 30, a, 'v1'));
  const b = getSamples('algorithms'); expect(conditionsKey('algorithms', 30, b)).toBe(conditionsKey('algorithms', 30, [...b].reverse()));
});
