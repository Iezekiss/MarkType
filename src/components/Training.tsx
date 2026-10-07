import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Settings } from '../storage';
import { modeLabels, modeDescriptions } from '../data/catalog';
import { Session } from '../engine/session';
import type { Snapshot } from '../engine/session';
import { handleKey } from '../engine/input';
import { Icon } from './Icon';
import { caretScrollLeft } from './caret-scroll';

function timeLabel(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function SampleView({ snapshot }: { snapshot: Snapshot }) {
  const scroller = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLSpanElement>(null);
  const chars = Array.from(snapshot.sample.text);
  const lines: { offset: number; chars: string[]; indent: number; syntax: string[] }[] = [];
  let offset = 0;
  for (const line of snapshot.sample.text.split('\n')) {
    const row = Array.from(line); const hasEnter = offset + row.length < chars.length;
    const syntax = row.map(() => '');
    for (const token of line.matchAll(/\b(for|in|range)\b|\b\d+\b|\b(red|blue|white|yellow|purple|green)\b/g)) {
      const start = Array.from(line.slice(0, token.index)).length;
      const kind = token[1] ? 'syntax-keyword' : token[2] ? 'syntax-color' : 'syntax-number';
      syntax.fill(kind, start, start + token[0].length);
    }
    lines.push({ offset, chars: hasEnter ? [...row, '\n'] : row, indent: line.match(/^ */)![0].length, syntax }); offset += row.length + (hasEnter ? 1 : 0);
  }
  useLayoutEffect(() => {
    const box = scroller.current, cursor = current.current;
    if (!box || !cursor) return;
    const b = box.getBoundingClientRect(), c = cursor.getBoundingClientRect();
    if (c.bottom > b.bottom - 16) box.scrollTop += c.bottom - b.bottom + 24;
    if (c.top < b.top + 16) box.scrollTop -= b.top - c.top + 24;
    if (c.right > b.right - 24) box.scrollLeft += c.right - b.right + 32;
    if (c.left < b.left + 48) box.scrollLeft -= b.left - c.left + 64;
  }, [snapshot.position, snapshot.completed]);
  return <div className="sample-scroll code-type" ref={scroller} aria-label="Готовый образец" role="region" tabIndex={0}>
    <span className="sr-only">{snapshot.sample.text}</span>
    <div aria-hidden="true">{lines.map((line, index) => <div className={`code-line ${snapshot.position >= line.offset && snapshot.position < line.offset + line.chars.length ? 'active-line' : ''}`} key={index}><span className="line-number">{index + 1}</span><span className="line-content">{line.chars.map((char, j) => {
      const position = line.offset + j;
      return <span key={j} ref={position === snapshot.position ? current : undefined} className={`${line.syntax[j] || ''} ${position < snapshot.position ? 'accepted' : ''} ${position === snapshot.position ? `current-character ${snapshot.errorFlash ? 'character-error' : ''}` : ''} ${char === '\n' || char === ' ' ? 'whitespace' : ''} ${char === '\n' ? 'line-ending' : ''}`}>{char === '\n' ? '↵' : char === ' ' && (j < line.indent || position === snapshot.position) ? '·' : char}</span>;
    })}</span></div>)}</div>
  </div>;
}

export function Training({ session, settings, onFinish, onExit }: { session: Session; settings: Settings; onFinish: (snapshot: Snapshot) => void; onExit: () => void }) {
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const caretMeasure = useRef<HTMLSpanElement>(null);
  const inputNumbers = useRef<HTMLDivElement>(null);
  const overlayTitle = useRef<HTMLHeadingElement>(null);
  const finished = useRef(false);
  const finishHandler = useRef(onFinish);
  finishHandler.current = onFinish;
  const update = () => setSnapshot(session.snapshot());

  useEffect(() => {
    const sync = () => {
      const state = session.snapshot(); setSnapshot(state);
      if (state.phase === 'finished' && !finished.current) { finished.current = true; finishHandler.current(state); }
    };
    const pause = () => { session.pause(); sync(); };
    const visibility = () => { if (document.hidden) pause(); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape' && !event.repeat) { event.preventDefault(); pause(); } };
    if (document.hidden) pause();
    const interval = window.setInterval(() => { session.tick(); sync(); }, 50);
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility); window.addEventListener('keydown', escape);
    return () => { clearInterval(interval); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', escape); };
  }, [session]);

  useEffect(() => {
    if (snapshot.phase === 'running') { input.current?.focus({ preventScroll: true }); setNotice(''); }
    else overlayTitle.current?.focus({ preventScroll: true });
  }, [snapshot.phase]);

  useLayoutEffect(() => {
    const field = input.current; if (!field) return;
    field.setSelectionRange(snapshot.prefix.length, snapshot.prefix.length);
    // Browser caret scrolling differs by engine; follow the accepted line inside
    // the textarea without moving the outer document.
    const line = snapshot.prefix.split('\n').length - 1;
    const style = getComputedStyle(field);
    const lineHeight = parseFloat(style.lineHeight) || 42;
    const y = line * lineHeight;
    if (y < field.scrollTop) field.scrollTop = y;
    else if (y + lineHeight > field.scrollTop + field.clientHeight - 48) field.scrollTop = y + lineHeight - field.clientHeight + 48;
    const padding = parseFloat(style.paddingLeft) || 20;
    const caretX = padding + (caretMeasure.current?.getBoundingClientRect().width ?? 0);
    field.scrollLeft = caretScrollLeft(field.scrollLeft, caretX, field.clientWidth, padding);
    if (inputNumbers.current) inputNumbers.current.style.transform = `translateY(${-field.scrollTop}px)`;
  }, [snapshot.prefix, snapshot.completed, snapshot.phase]);

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const wasRepeat = event.repeat;
    if (handleKey(session, event.nativeEvent)) event.preventDefault();
    if (!wasRepeat) setNotice('');
    update();
  };
  const blocked = (event: { preventDefault(): void }) => { event.preventDefault(); setNotice('Здесь печатаем самостоятельно — вставка отключена'); };
  const multiline = snapshot.sample.type === 'fragment';
  return <main className="main training-main">
    <div className="training-heading"><div><span className="eyebrow">ТВОЯ ТРЕНИРОВКА</span><h1>{modeLabels[settings.mode]}</h1></div><span className="session-badge">{settings.duration} секунд <span>·</span> {modeDescriptions[settings.mode]}</span></div>
    <section className="stats-bar" aria-label="Статистика тренировки">
      <div className="live-stat time-stat"><Icon name="clock" size={24} /><div><span>Осталось</span><strong aria-label={`Осталось ${timeLabel(snapshot.remainingMs)}`}>{timeLabel(snapshot.remainingMs)}</strong></div></div>
      <div className="live-stat"><div><span>Скорость</span><strong>{snapshot.speed ?? '—'}<small>зн/мин</small></strong></div></div>
      <div className="live-stat"><div><span>Точность</span><strong>{snapshot.accuracy === null ? '—' : `${snapshot.accuracy.toLocaleString('ru-RU')}%`}</strong></div></div>
      <button className="button pause-button" disabled={snapshot.phase !== 'running' && snapshot.phase !== 'countdown'} onClick={() => { session.pause(); update(); }}><Icon name="pause" size={17} />Пауза <kbd>Esc</kbd></button>
      <div className="time-progress" aria-hidden="true"><span style={{ width: `${snapshot.remainingMs / (settings.duration * 10)}%` }} /></div>
    </section>
    <section className={`card typing-card ${multiline ? 'multiline' : ''}`} aria-label="Зона печати">
      {snapshot.phase === 'running' ? <>
        <div className="caret-measure-wrap" aria-hidden="true"><span ref={caretMeasure} className="caret-measure code-type">{snapshot.prefix.split('\n').at(-1)}</span></div>
        <div className="typing-topline"><span className="preview-label">ПЕРЕПЕЧАТАЙ КОД</span><span className="muted small">Готово: <strong>{snapshot.completed}</strong></span></div>
        <div className="editor-panels">
          <div className="editor-pane sample-pane">
            <div className="editor-heading"><span>Образец</span><span>Строк: {snapshot.sample.text.split('\n').length}</span></div>
            <SampleView snapshot={snapshot} />
          </div>
          <div className="editor-pane input-pane">
            <div className="editor-heading"><label htmlFor="typing-input">Твой ввод</label><span>Строка {snapshot.prefix.split('\n').length}</span></div>
            <div className={`input-editor ${snapshot.errorFlash ? 'input-error' : ''}`}>
              <div className="input-gutter" aria-hidden="true"><div ref={inputNumbers}>{snapshot.prefix.split('\n').map((_, index) => <div className="input-line-number" key={index}>{index + 1}</div>)}</div></div>
              <textarea ref={input} id="typing-input" className="typing-input code-type" aria-label="Перепечатай образец" aria-describedby="typing-feedback" value={snapshot.prefix} onKeyDown={keyDown} onChange={e => { e.currentTarget.value = session.snapshot().prefix; }} onScroll={e => { if (inputNumbers.current) inputNumbers.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`; }} onBeforeInput={e => e.preventDefault()} onPaste={blocked} onDrop={blocked} onDragOver={e => e.preventDefault()} onCut={e => e.preventDefault()} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" wrap="off" placeholder="Печатай здесь…" />
            </div>
          </div>
        </div>
        <div id="typing-feedback" className={`typing-feedback ${snapshot.layoutHint || snapshot.errorFlash ? 'feedback-error' : ''}`} role="status" aria-live="polite">
          {snapshot.indentToRemove ? `Удали отступ клавишей Backspace. Осталось пробелов: ${snapshot.indentToRemove}.` : snapshot.layoutHint ? 'Проверь английскую раскладку' : snapshot.errorFlash ? 'Другой символ. Попробуй ещё раз.' : notice || <><span className="success-dot" /> {snapshot.sample.text.includes('for i in range(') ? 'Enter сохраняет отступ. Backspace — выйти из цикла.' : 'Печатай точно как в образце.'}</>}
        </div>
      </> : <div className="training-overlay">
        {snapshot.phase === 'countdown' ? <>
          <h2 ref={overlayTitle} tabIndex={-1}>Приготовься</h2><p>Положи руки на клавиатуру</p><strong className="countdown-number" aria-live="assertive" aria-atomic="true">{snapshot.countdown}</strong><span className="muted">Образец появится после отсчёта</span>
        </> : <><span className="overlay-icon"><Icon name="pause" size={30} /></span><h2 ref={overlayTitle} tabIndex={-1}>Можно передохнуть</h2><p>Время остановлено. Продолжим, когда будешь готов.</p><button className="button primary" onClick={() => { session.resume(); update(); }}><Icon name="play" size={18} />Продолжить</button><button className="text-button" onClick={onExit}>Изменить настройки</button></>}
      </div>}
    </section>
    <div className="training-bottom"><span><kbd>Backspace</kbd> исправить ввод</span><span><kbd>Tab</kbd> перейти к кнопкам</span><span><kbd>Esc</kbd> сделать паузу</span></div>
  </main>;
}
