import { useLayoutEffect, useState } from 'react';
import { conditionsKey, getSamples } from './data/catalog';
import { AlgorithmDeck } from './data/algorithms';
import { Session } from './engine/session';
import type { Snapshot } from './engine/session';
import { clearHistory, readHistory, readRecords, readSettings, saveResult, saveSettings } from './storage';
import type { Result, Settings } from './storage';
import { Setup } from './components/Setup';
import { Training } from './components/Training';
import { Results } from './components/Results';
import { History } from './components/History';
import { Icon } from './components/Icon';

export default function App() {
  const [screen, setScreen] = useState<'setup' | 'training' | 'results' | 'history'>('setup');
  const [settings, setSettings] = useState(readSettings);
  const [customText, setCustomText] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [records, setRecords] = useState(readRecords);
  const [saved, setSaved] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(true);
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0; document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0; document.body.scrollLeft = 0;
  }, [screen]);
  const updateSettings = (next: Settings) => { setSettings(next); setSettingsSaved(saveSettings(next)); };
  const start = () => {
    const samples = getSamples(settings.mode, customText); if (!samples.length) return;
    setSession(new Session(settings.mode === 'algorithms' ? new AlgorithmDeck() : samples, settings.duration)); setScreen('training');
  };
  const finish = (snapshot: Snapshot) => {
    const newResult: Result = {
      ...settings, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, date: new Date().toISOString(),
      conditions: conditionsKey(settings.mode, settings.duration, getSamples(settings.mode, customText)),
      speed: snapshot.speed ?? 0, accuracy: snapshot.accuracy, errors: snapshot.errors, completed: snapshot.completed, credited: snapshot.credited,
    };
    const wasSaved = saveResult(newResult);
    setSaved(wasSaved); setResult(newResult);
    setHistory(wasSaved ? readHistory() : current => [newResult, ...current].slice(0, 20));
    setRecords(current => {
      const best = current[newResult.conditions];
      return newResult.accuracy !== null && (!best || newResult.speed > best.speed || (newResult.speed === best.speed && newResult.accuracy > (best.accuracy ?? 0))) ? { ...current, [newResult.conditions]: newResult } : current;
    });
    setScreen('results');
  };
  const openHistory = () => setScreen('history');
  const showSetup = () => setScreen('setup');
  return <div className={`app-shell screen-${screen}`}>
    <header className="site-header"><div className="header-inner">
      <div className="wordmark" aria-label="МШП · Код на скорость"><strong>МШП</strong><span className="brand-divider" /> <span>Код на скорость</span></div>
      {screen !== 'training' ? <nav aria-label="Главная навигация"><button className={`nav-button ${screen !== 'history' ? 'active' : ''}`} onClick={showSetup}><Icon name="keyboard" size={18} />Тренировка</button><button className={`nav-button ${screen === 'history' ? 'active' : ''}`} onClick={openHistory}><Icon name="history" size={18} />История</button></nav> : <span className="header-training-label"><span className="tiny-dot" /> Время для практики</span>}
    </div></header>
    {screen === 'setup' && <><Setup settings={settings} onSettings={updateSettings} customText={customText} onCustomText={setCustomText} onStart={start} records={records} onHistory={openHistory} />{!settingsSaved && <p className="storage-warning" role="status">Настройки не удалось сохранить. Тренировка по-прежнему доступна.</p>}</>}
    {screen === 'training' && session && <Training key={String(session)} session={session} settings={settings} onFinish={finish} onExit={showSetup} />}
    {screen === 'results' && result && <Results result={result} best={records[result.conditions]} saved={saved} onRetry={start} onSettings={showSetup} onHistory={openHistory} />}
    {screen === 'history' && <History history={history} onBack={showSetup} onClear={() => { const ok = clearHistory(); if (ok) { setHistory([]); setRecords({}); } return ok; }} />}
    <footer className="site-footer"><span>Московская школа программистов <span className="footer-dot">·</span> Практика начинается с клавиатуры</span><span><Icon name="shield" size={15} /> Без регистрации. Результаты только здесь.</span></footer>
  </div>;
}
