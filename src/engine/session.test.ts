import { describe, expect, it } from 'vitest';
import { Session } from './session';
import { getSamples } from '../data/catalog';

function setup(text = 'go()', duration = 30) {
  let time = 0;
  const s = new Session([{ ...getSamples('commands')[0], text }], duration, () => time);
  const at = (t: number) => { time = t; };
  at(3000); s.tick();
  return { s, at };
}
function type(s: Session, text: string) { for (const char of text) s.input(char); }

describe('последовательный ввод', () => {
  it('засчитывает go() и сразу открывает следующий образец', () => {
    const { s } = setup(); type(s, 'go()');
    expect(s.snapshot()).toMatchObject({ completed: 1, credited: 4, prefix: '', correctAttempts: 4, errors: 0 });
  });
  it('ошибка не продвигает позицию и остаётся в точности', () => {
    const { s } = setup(); type(s, 'xg');
    expect(s.snapshot()).toMatchObject({ prefix: 'g', errors: 1, accuracy: 50 });
  });
  it('Backspace не стирает ошибки и повторный набор не завышает скорость', () => {
    const { s, at } = setup(); at(13000); type(s, 'gx'); s.backspace(); type(s, 'g');
    expect(s.snapshot()).toMatchObject({ credited: 1, speed: 6, errors: 1, correctAttempts: 2 });
  });
  it('завершённый образец нельзя удалить', () => {
    const { s } = setup(); type(s, 'go()'); s.backspace();
    expect(s.snapshot()).toMatchObject({ completed: 1, credited: 4, prefix: '' });
  });
  it('учитывает регистр и отличает кириллицу от латиницы', () => {
    const { s } = setup(); type(s, 'Gп');
    expect(s.snapshot()).toMatchObject({ prefix: '', errors: 2, layoutHint: true });
    s.input('g'); expect(s.snapshot().layoutHint).toBe(false);
  });
  it('считает каждый пробел, скобку и перенос отдельным символом', () => {
    const { s } = setup('go()\n  go()'); type(s, 'go()\n go()');
    expect(s.snapshot().completed).toBe(0);
    expect(s.snapshot().prefix).toBe('go()\n ');
    expect(s.snapshot().errors).toBe(4);
    type(s, ' go()'); expect(s.snapshot()).toMatchObject({ completed: 1, credited: 11 });
  });
  it('пустой ввод и многосимвольная вставка не начисляются', () => {
    const { s } = setup(); s.input(''); s.input('go()');
    expect(s.snapshot()).toMatchObject({ credited: 0, errors: 0, correctAttempts: 0 });
  });
  it('не добавляет кавычки и скобки, но подставляет отступ образца после двоеточия и Enter', () => {
    const { s } = setup('x("A"):\n  2'); type(s, 'x(');
    expect(s.snapshot().prefix).toBe('x(');
    type(s, '"A"):\n'); expect(s.snapshot().prefix).toBe('x("A"):\n  ');
    type(s, '2'); expect(s.snapshot()).toMatchObject({ completed: 1, credited: 9, errors: 0 });
  });
  it('после Enter добавляет четыре пробела без начисления автоматических символов', () => {
    const { s, at } = setup('for i in range(2):\n    go()');
    type(s, 'for i in range(2):');
    expect(s.snapshot().prefix).toBe('for i in range(2):');
    s.input('\n');
    expect(s.snapshot()).toMatchObject({ prefix: 'for i in range(2):\n    ', position: 23, credited: 19, correctAttempts: 19, errors: 0 });
    s.pause(); s.resume(); at(6000); s.tick();
    type(s, 'go()'); at(36000); s.tick();
    expect(s.snapshot()).toMatchObject({ completed: 1, prefix: '', credited: 23, correctAttempts: 23, accuracy: 100, speed: 46 });
  });
  it('удаление автоматического пробела не уменьшает скорость, а ручной повторный ввод учитывается', () => {
    const { s } = setup('for i in range(2):\n    go()');
    type(s, 'for i in range(2):\n'); s.backspace();
    expect(s.snapshot()).toMatchObject({ prefix: 'for i in range(2):\n   ', credited: 19 });
    s.input(' '); type(s, 'go()');
    expect(s.snapshot()).toMatchObject({ completed: 1, prefix: '', credited: 24, correctAttempts: 24, errors: 0 });
  });
  it('сохраняет отступ внутри цикла, а после четырёх Backspace продолжает без отступа', () => {
    const { s, at } = setup('for i in range(2):\n    go()\n    right()\nleft()\njump()');
    type(s, 'for i in range(2):\ngo()\n');
    expect(s.snapshot()).toMatchObject({ prefix: 'for i in range(2):\n    go()\n    ', credited: 24, errors: 0 });
    type(s, 'right()\n');
    expect(s.snapshot()).toMatchObject({ prefix: 'for i in range(2):\n    go()\n    right()\n    ', indentToRemove: 4, credited: 32 });
    for (let i = 0; i < 4; i++) s.backspace();
    expect(s.snapshot()).toMatchObject({ indentToRemove: 0, credited: 32, correctAttempts: 32, errors: 0 });
    type(s, 'left()\n');
    expect(s.snapshot().prefix).toBe('for i in range(2):\n    go()\n    right()\nleft()\n');
    type(s, 'jump()'); at(33000); s.tick();
    expect(s.snapshot()).toMatchObject({ completed: 1, credited: 45, correctAttempts: 45, speed: 90, accuracy: 100, errors: 0, indentToRemove: 0 });
  });
  it('ожидает полного снятия отступа, сохраняет его на паузе и снова включает после нового двоеточия', () => {
    const { s, at } = setup('for i in range(2):\n    go()\nfor i in range(3):\n    take()');
    type(s, 'for i in range(2):\ngo()\n');
    s.backspace(); s.backspace();
    expect(s.snapshot()).toMatchObject({ indentToRemove: 2, credited: 24 });
    s.input('f'); expect(s.snapshot()).toMatchObject({ indentToRemove: 2, credited: 24, errors: 1 });
    s.pause(); s.resume(); at(6000); s.tick();
    expect(s.snapshot().prefix).toBe('for i in range(2):\n    go()\n  ');
    s.backspace(); s.backspace(); type(s, 'for i in range(3):\n');
    expect(s.snapshot().prefix).toBe('for i in range(2):\n    go()\nfor i in range(3):\n    ');
    type(s, 'take()');
    expect(s.snapshot()).toMatchObject({ completed: 1, credited: 49, correctAttempts: 49, errors: 1, indentToRemove: 0 });
  });
  it('показывает нейтральные значения до первой попытки', () => {
    const { s } = setup(); expect(s.snapshot()).toMatchObject({ speed: null, accuracy: null });
  });
});

describe('монотонный таймер', () => {
  it('открывает образец только после отсчёта и запускает часы в этот момент', () => {
    let time = 0; const s = new Session(getSamples('commands'), 30, () => time);
    s.input('g'); expect(s.snapshot()).toMatchObject({ phase: 'countdown', credited: 0, countdown: 3 });
    time = 2900; s.tick(); expect(s.snapshot().countdown).toBe(1);
    time = 3500; s.tick(); expect(s.snapshot()).toMatchObject({ phase: 'running', elapsedMs: 0 });
  });
  it('отклоняет новый ввод ровно на границе времени без ожидания перерисовки', () => {
    const { s, at } = setup(); at(32999); s.input('g'); at(33000); s.input('o');
    expect(s.snapshot()).toMatchObject({ phase: 'finished', credited: 1, elapsedMs: 30000, remainingMs: 0, speed: 2 });
  });
  it('пауза и повторный отсчёт исключаются из активного времени', () => {
    const { s, at } = setup(); at(13000); s.pause();
    at(100000); s.input('g'); expect(s.snapshot()).toMatchObject({ credited: 0, elapsedMs: 10000, phase: 'paused' });
    s.resume(); at(102999); s.input('g'); expect(s.snapshot().credited).toBe(0);
    at(103000); s.tick(); s.input('g'); at(113000); s.tick();
    expect(s.snapshot()).toMatchObject({ elapsedMs: 20000, remainingMs: 10000, credited: 1, speed: 3 });
  });
  it('пауза во время отсчёта не открывает образец в фоне', () => {
    let time = 0; const s = new Session(getSamples('commands'), 30, () => time);
    time = 1000; s.pause(); time = 10000; s.tick();
    expect(s.snapshot()).toMatchObject({ phase: 'paused', elapsedMs: 0 });
    s.resume(); time = 13000; s.tick(); expect(s.snapshot()).toMatchObject({ phase: 'running', elapsedMs: 0 });
  });
  it('после завершения нельзя ни возобновить, ни стереть символы', () => {
    const { s, at } = setup(); s.input('g'); at(40000); s.tick(); s.resume(); s.backspace(); s.pause();
    expect(s.snapshot()).toMatchObject({ phase: 'finished', credited: 1 });
  });
  it('не запускает пустой набор', () => { expect(() => new Session([], 30)).toThrow(); });
});
