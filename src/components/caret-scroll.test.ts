import { expect, it } from 'vitest';
import { caretScrollLeft } from './caret-scroll';

it('прокручивает длинную строку к курсору и оставляет внутренний отступ', () => {
  expect(caretScrollLeft(0, 1200, 330, 20)).toBe(910);
});
it('возвращается к началу после перевода строки или удаления текста', () => {
  expect(caretScrollLeft(910, 20, 330, 20)).toBe(0);
});
it('не двигает прокрутку, когда позиция уже видна', () => {
  expect(caretScrollLeft(50, 200, 330, 20)).toBe(50);
});
