import { useEffect, useRef, useState } from 'react';
import type { Result } from '../storage';
import { modeLabels } from '../data/catalog';
import { Icon } from './Icon';

export function History({ history, onClear, onBack }: { history: Result[]; onClear: () => boolean; onBack: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  return <main className="main history-main">
    <button className="text-button back-button" onClick={onBack}><Icon name="back" size={18} />К тренировке</button>
    <div className="history-heading"><div><span className="eyebrow">НА ЭТОМ УСТРОЙСТВЕ</span><h1 ref={title} tabIndex={-1}>История тренировок</h1><p className="muted">Последние 20 результатов в этом браузере</p></div>{history.length > 0 && <button className="button secondary" onClick={() => setConfirm(true)}>Очистить историю</button>}</div>
    {confirm && <div className="clear-confirm" role="alert"><span>Удалить историю и рекорды на этом устройстве?</span><button className="button secondary" onClick={() => { const ok = onClear(); setError(!ok); setConfirm(false); }}>Удалить</button><button className="text-button" onClick={() => setConfirm(false)}>Отмена</button></div>}
    {error && <p role="alert">Не удалось очистить историю: браузер запретил доступ к хранилищу.</p>}
    {!history.length ? <div className="card empty-history"><span className="overlay-icon"><Icon name="history" size={32} /></span><h2>Здесь появятся результаты</h2><p>Пройди первую тренировку — мы сохраним скорость и точность.</p><button className="button primary" onClick={onBack}>К тренировке <Icon name="arrow" /></button></div> : <div className="card history-table-wrap"><table><caption className="sr-only">Завершённые тренировки</caption><thead><tr><th>Когда</th><th>Набор</th><th>Время</th><th>Скорость</th><th>Точность</th><th>Ошибки</th><th>Образцы</th></tr></thead><tbody>{history.map(result => <tr key={result.id}><td>{new Date(result.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>{modeLabels[result.mode]}</td><td>{result.duration} сек</td><td><strong>{result.accuracy === null ? '—' : result.speed}</strong> <span className="muted">зн/мин</span></td><td>{result.accuracy === null ? '—' : `${result.accuracy.toLocaleString('ru-RU')}%`}</td><td>{result.errors}</td><td>{result.completed}</td></tr>)}</tbody></table></div>}
    <p className="small muted history-note"><Icon name="shield" size={16} /> Здесь нет имён и общих рейтингов. Рекорды сравниваются только для одинакового набора и времени.</p>
  </main>;
}
