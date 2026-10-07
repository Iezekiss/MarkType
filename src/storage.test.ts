import { beforeEach, expect, it, vi } from 'vitest';
import { readHistory, saveResult, clearHistory, readSettings, saveSettings, readRecords } from './storage';
import type { Result } from './storage';

const result: Result = { id: '1', date: '2026-10-07T12:00:00.000Z', mode: 'commands', duration: 60, conditions: 'commands:60:v1:a', speed: 44, accuracy: 98, errors: 1, completed: 11, credited: 44 };
beforeEach(() => localStorage.clear());
it('хранит последние 20 результатов и рекорд отдельно от ограниченной истории', () => {
  saveResult({ ...result, speed: 500 });
  for (let i = 2; i <= 25; i++) saveResult({ ...result, id: String(i) });
  expect(readHistory()).toHaveLength(20); expect(readHistory()[0].id).toBe('25');
  expect(readRecords()[result.conditions].speed).toBe(500);
});
it('один результат не записывается дважды', () => { saveResult(result); saveResult(result); expect(readHistory()).toHaveLength(1); });
it('сохраняет сессию без ввода в истории, но не создаёт рекорд', () => {
  saveResult({ ...result, speed: 0, accuracy: null, errors: 0, credited: 0, completed: 0 });
  expect(readHistory()).toHaveLength(1); expect(readRecords()).toEqual({});
});
it('очищает историю и рекорды, сохраняя настройки', () => {
  saveSettings({ mode: 'algorithms', duration: 120 }); saveResult(result); expect(clearHistory()).toBe(true);
  expect(readHistory()).toEqual([]); expect(readRecords()).toEqual({}); expect(readSettings()).toEqual({ mode: 'algorithms', duration: 120 });
});
it('при недоступном localStorage возвращает безопасные значения', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
  expect(readHistory()).toEqual([]); expect(readSettings()).toEqual({ mode: 'commands', duration: 60 });
  expect(saveResult(result)).toBe(false); expect(clearHistory()).toBe(false);
});
it('отбрасывает повреждённую историю и невалидные метрики', () => {
  localStorage.setItem('mshp.speed.history.v1', '{broken'); expect(readHistory()).toEqual([]);
  localStorage.setItem('mshp.speed.history.v1', JSON.stringify([{ ...result, speed: -1 }, null, result]));
  expect(readHistory()).toEqual([result]);
  localStorage.setItem('mshp.speed.settings.v1', JSON.stringify({ mode: 'unknown', duration: 1 }));
  expect(readSettings()).toEqual({ mode: 'commands', duration: 60 });
});
it('отбрасывает mode в виде объекта или массива, не вызывая преобразование типов', () => {
  for (const mode of [{ toString: null }, ['commands']]) {
    localStorage.setItem('mshp.speed.settings.v1', JSON.stringify({ mode, duration: 60 }));
    expect(readSettings()).toEqual({ mode: 'commands', duration: 60 });
    localStorage.setItem('mshp.speed.history.v1', JSON.stringify([{ ...result, mode }]));
    expect(readHistory()).toEqual([]);
  }
});
