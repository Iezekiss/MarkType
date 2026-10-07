import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => { localStorage.clear(); vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
function start() {
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
  advance(3000);
  return screen.getByRole('textbox', { name: 'Перепечатай образец' });
}
function prepareGo() {
  fireEvent.click(screen.getByRole('radio', { name: /Свой текст/ }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Текст для тренировки' }), { target: { value: 'go()' } });
}
function type(input: HTMLElement, text: string) { for (const key of text) fireEvent.keyDown(input, { key: key === '\n' ? 'Enter' : key }); }

describe('тренировка в настоящем поле', () => {
  it('проходит старт, отсчёт, ошибку, следующий образец, результат и повторный запуск', () => {
    render(<App />); expect(screen.getByRole('radio', { name: /60 секунд/ })).toBeChecked(); prepareGo();
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
    expect(screen.getByText('Приготовься')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Перепечатай образец' })).not.toBeInTheDocument();
    advance(3000);
    const input = screen.getByRole('textbox', { name: 'Перепечатай образец' });
    expect(input).toHaveFocus(); type(input, 'xgo()g');
    expect(input).toHaveValue('g');
    advance(60000);
    expect(screen.getByRole('heading', { name: 'Тренировка завершена' })).toBeVisible();
    expect(within(screen.getByTestId('result-errors')).getByText('1')).toBeVisible();
    expect(within(screen.getByTestId('result-completed')).getByText('1')).toBeVisible();
    expect(within(screen.getByTestId('result-speed')).getByText('5')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' })); advance(3000);
    expect(screen.getByRole('textbox', { name: 'Перепечатай образец' })).toHaveValue('');
  });
  it('не принимает paste, drop, автоповтор и не засчитывает input второй раз', () => {
    render(<App />); prepareGo(); const input = start();
    expect(fireEvent.paste(input, { clipboardData: { getData: () => 'go()' } })).toBe(false);
    expect(fireEvent.drop(input)).toBe(false);
    fireEvent.keyDown(input, { key: 'v', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'v', metaKey: true });
    fireEvent.keyDown(input, { key: 'g', repeat: true });
    expect(input).toHaveValue('');
    fireEvent.keyDown(input, { key: 'g' }); fireEvent.input(input, { target: { value: 'gg' } });
    expect(input).toHaveValue('g');
    advance(60000); expect(within(screen.getByTestId('result-speed')).getByText('1')).toBeVisible();
    expect(within(screen.getByTestId('result-errors')).getByText('0')).toBeVisible();
  });
  it('Backspace удаляет принятый символ, Tab и сочетания не дают ошибок', () => {
    render(<App />); prepareGo(); const input = start(); type(input, 'go');
    fireEvent.keyDown(input, { key: 'Backspace' }); expect(input).toHaveValue('g');
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    fireEvent.keyDown(input, { key: 'Shift' }); fireEvent.keyDown(input, { key: 'a', metaKey: true });
    advance(60000); expect(within(screen.getByTestId('result-errors')).getByText('0')).toBeVisible();
  });
  it('Esc скрывает образец, продолжение требует новый отсчёт', () => {
    render(<App />); prepareGo(); const input = start(); type(input, 'go'); advance(10000);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByRole('heading', { name: 'Можно передохнуть' })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Перепечатай образец' })).not.toBeInTheDocument();
    advance(90000); fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(screen.getByText('Приготовься')).toBeVisible(); advance(3000);
    expect(screen.getByRole('textbox', { name: 'Перепечатай образец' })).toHaveValue('go');
    advance(50000); expect(screen.getByRole('heading', { name: 'Тренировка завершена' })).toBeVisible();
  });
  it('при потере фокуса окна и скрытой вкладке включает паузу без автоматического продолжения', () => {
    render(<App />); start(); fireEvent(window, new Event('blur'));
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeVisible();
    fireEvent(window, new Event('focus')); advance(10000);
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' })); advance(3000);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeVisible();
  });
  it('показывает подсказку раскладки только после реальной кириллицы', () => {
    render(<App />); prepareGo(); const input = start(); type(input, 'п');
    expect(screen.getByText('Проверь английскую раскладку')).toBeVisible();
    expect(input).toHaveValue(''); type(input, 'g');
    expect(screen.queryByText('Проверь английскую раскладку')).not.toBeInTheDocument();
  });
});

describe('подготовка и хранение', () => {
  it('не показывает подпись Демо и описывает случайные алгоритмы', () => {
    render(<App />);
    expect(screen.queryAllByText(/демо/i)).toHaveLength(0);
    fireEvent.click(screen.getByRole('radio', { name: /Алгоритмы/ }));
    expect(screen.getByText(/Новые сочетания команд и циклов/)).toBeVisible();
  });
  it('в режиме алгоритмов сохраняет образец при тиках и генерирует следующий после ввода', () => {
    render(<App />); fireEvent.click(screen.getByRole('radio', { name: /Алгоритмы/ }));
    const input = start();
    const currentText = () => screen.getByRole('region', { name: 'Готовый образец' }).querySelector('.sr-only')!.textContent!;
    const first = currentText(); expect(first.split('\n').length).toBeGreaterThanOrEqual(3);
    advance(5000); expect(currentText()).toBe(first);
    const manualText = first.replace(/^ +/gm, '');
    const lines = first.split('\n');
    for (const [index, line] of lines.entries()) {
      if (index) type(input, '\n');
      if (!line.startsWith('    ') && index && lines[index - 1].startsWith('    ')) {
        for (let i = 0; i < 4; i++) fireEvent.keyDown(input, { key: 'Backspace' });
      }
      type(input, line.trimStart());
    }
    expect(input).toHaveValue(''); expect(currentText()).not.toBe(first);
    advance(55000);
    expect(within(screen.getByTestId('result-completed')).getByText('1')).toBeVisible();
    expect(within(screen.getByTestId('result-speed')).getByText(String(manualText.length))).toBeVisible();
  });
  it('после Enter в заголовке цикла ставит отступ и принимает команду сразу после него', () => {
    render(<App />); fireEvent.click(screen.getByRole('radio', { name: /Свой текст/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Текст для тренировки' }), { target: { value: 'for i in range(2):\n    go()' } });
    const input = start(); type(input, 'for i in range(2):\n');
    expect(input).toHaveValue('for i in range(2):\n    ');
    type(input, 'go()'); expect(input).toHaveValue(''); advance(60000);
    expect(within(screen.getByTestId('result-completed')).getByText('1')).toBeVisible();
    expect(within(screen.getByTestId('result-speed')).getByText('23')).toBeVisible();
    expect(within(screen.getByTestId('result-errors')).getByText('0')).toBeVisible();
  });
  it('продолжает строки цикла с отступом и позволяет выйти четырьмя Backspace', () => {
    render(<App />); fireEvent.click(screen.getByRole('radio', { name: /Свой текст/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Текст для тренировки' }), { target: { value: 'for i in range(2):\n    go()\n    right()\nleft()\njump()' } });
    const input = start(); type(input, 'for i in range(2):\ngo()\n');
    expect(input).toHaveValue('for i in range(2):\n    go()\n    ');
    type(input, 'right()\n');
    expect(screen.getByRole('status')).toHaveTextContent(/Backspace/);
    for (let i = 0; i < 4; i++) fireEvent.keyDown(input, { key: 'Backspace' });
    type(input, 'left()\n');
    expect(input).toHaveValue('for i in range(2):\n    go()\n    right()\nleft()\n');
    type(input, 'jump()'); advance(60000);
    expect(within(screen.getByTestId('result-completed')).getByText('1')).toBeVisible();
    expect(within(screen.getByTestId('result-speed')).getByText('45')).toBeVisible();
    expect(within(screen.getByTestId('result-errors')).getByText('0')).toBeVisible();
  });
  it('завершает тренировку на обычном HTTP-хостинге без crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {});
    render(<App />); type(start(), 'go()'); advance(60000);
    expect(screen.getByRole('heading', { name: 'Тренировка завершена' })).toBeVisible();
  });
  it('показывает нейтральную скорость и не создаёт рекорд, если не было попыток ввода', () => {
    render(<App />); start(); advance(60000);
    expect(within(screen.getByTestId('result-speed')).getByText('—')).toBeVisible();
    expect(screen.getByTestId('record-speed')).toHaveTextContent('—');
  });
  it('разрешает вставку своего текста, показывает нормализацию и не запускает пустой образец', () => {
    render(<App />); fireEvent.click(screen.getByRole('radio', { name: /Свой текст/ }));
    const prep = screen.getByRole('textbox', { name: 'Текст для тренировки' });
    expect(screen.getByRole('button', { name: 'Начать' })).toBeDisabled();
    expect(fireEvent.paste(prep)).toBe(true);
    fireEvent.change(prep, { target: { value: 'go()\r\n\tgo() ' } });
    expect(screen.getByTestId('custom-preview').textContent).toBe('go()\n    go() ');
    const input = start(); type(input, 'go()\n    go() '); advance(60000);
    expect(within(screen.getByTestId('result-completed')).getByText('1')).toBeVisible();
  });
  it('запускает и завершает тренировку даже без localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    render(<App />); type(start(), 'go()'); advance(60000);
    expect(screen.getByRole('heading', { name: 'Тренировка завершена' })).toBeVisible();
    expect(screen.getByText(/не удалось сохранить/i)).toBeVisible();
  });
});
