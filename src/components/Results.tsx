import { useEffect, useRef } from 'react';
import type { Result } from '../storage';
import { modeLabels, modeDescriptions } from '../data/catalog';
import { Icon } from './Icon';

export function Results({ result, best, saved, onRetry, onSettings, onHistory }: { result: Result; best?: Result; saved: boolean; onRetry: () => void; onSettings: () => void; onHistory: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  return <main className="main results-main">
    <span className="result-icon"><Icon name="check" size={32} /></span>
    <span className="eyebrow">ГОТОВО, МОЖНО ВЫДОХНУТЬ</span>
    <h1 ref={title} tabIndex={-1}>Тренировка завершена</h1>
    <p className="result-subtitle">{modeLabels[result.mode]} <span>·</span> {result.duration} секунд <span>·</span> {modeDescriptions[result.mode]}</p>
    <section className="result-stats card" aria-label="Результат тренировки">
      <div className="result-stat" data-testid="result-speed"><span><Icon name="keyboard" />Скорость</span><strong>{result.accuracy === null ? '—' : result.speed}</strong><small>знаков в минуту</small></div>
      <div className="result-stat" data-testid="result-accuracy"><span><Icon name="target" />Точность</span><strong>{result.accuracy === null ? '—' : `${result.accuracy.toLocaleString('ru-RU')}%`}</strong><small>{result.accuracy === null ? 'попыток ещё не было' : 'правильных попыток'}</small></div>
      <div className="result-stat" data-testid="result-errors"><span>Ошибочные вводы</span><strong>{result.errors}</strong><small>за тренировку</small></div>
      <div className="result-stat" data-testid="result-completed"><span>Готовые образцы</span><strong>{result.completed}</strong><small>перепечатаны целиком</small></div>
    </section>
    <div className="result-record"><span className="record-icon"><Icon name="trophy" size={23} /></span><div><strong>Рекорд на этом устройстве</strong><p>Для этого набора и длительности</p></div><b data-testid="record-speed">{best?.speed ?? '—'}<small>зн/мин</small></b></div>
    <div className="result-actions"><button className="button primary" onClick={onRetry}><Icon name="refresh" />Ещё раз</button><button className="button secondary" onClick={onSettings}>Изменить настройки</button></div>
    <p className="save-note">{saved ? <><Icon name="shield" size={16} /> Результат сохранён только в этом браузере <button className="text-button" onClick={onHistory}>История тренировок <Icon name="arrow" size={14} /></button></> : 'Результат не удалось сохранить в браузере. Можно продолжать тренировку.'}</p>
  </main>;
}
