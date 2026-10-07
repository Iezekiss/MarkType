import { conditionsKey, getSamples, modeLabels, normalizeCustomText, ALGORITHM_RULES } from '../data/catalog';
import type { Duration, Mode } from '../data/catalog';
import type { Result, Settings } from '../storage';
import { Icon } from './Icon';

const modes = [
  { mode: 'commands' as const, icon: 'code' as const, description: 'Одна команда за раз' },
  { mode: 'algorithms' as const, icon: 'lines' as const, description: 'Случайные команды и циклы' },
  { mode: 'custom' as const, icon: 'text' as const, description: 'Образец от преподавателя' },
];

export function Setup({ settings, onSettings, customText, onCustomText, onStart, records, onHistory }: {
  settings: Settings; onSettings: (settings: Settings) => void; customText: string;
  onCustomText: (text: string) => void; onStart: () => void; records: Record<string, Result>; onHistory: () => void;
}) {
  const samples = getSamples(settings.mode, customText);
  const record = records[conditionsKey(settings.mode, settings.duration, samples)];
  const normalized = normalizeCustomText(customText);
  const previewLines = settings.mode === 'algorithms' ? ['go()', 'for i in range(4):', '    jump()', '    right()', 'paint(red)'] : ['paint(red)'];
  const changeMode = (mode: Mode) => onSettings({ ...settings, mode });
  return <main className="main setup-main">
    <div className="intro">
      <span className="eyebrow"><span className="tiny-dot" /> ТРЕНАЖЁР ДЛЯ MARK.ONLINE</span>
      <h1>Код на скорость<span className="heading-dot">.</span></h1>
      <p>Перепечатывай код. Тренируй скорость и точность</p>
    </div>
    <div className="setup-layout">
      <section className="card settings-card" aria-labelledby="settings-title">
        <div className="card-title"><span className="step-badge">01</span><h2 id="settings-title">Выбери, что печатать</h2></div>
        <fieldset className="mode-options">
          <legend className="sr-only">Набор для тренировки</legend>
          {modes.map(({ mode, icon, description }) => <label className={`mode-card ${settings.mode === mode ? 'selected' : ''}`} key={mode}>
            <input type="radio" name="mode" value={mode} checked={settings.mode === mode} onChange={() => changeMode(mode)} />
            <span className="mode-top"><span className="mode-icon"><Icon name={icon} size={25} /></span><span className="radio-mark">{settings.mode === mode && <span />}</span></span>
            <strong>{modeLabels[mode]}</strong><span className="mode-description">{description}</span>
          </label>)}
        </fieldset>
        {settings.mode === 'custom' && <div className="custom-preparation">
          <label htmlFor="custom-text">Текст для тренировки</label>
          <textarea id="custom-text" value={customText} onChange={e => onCustomText(e.target.value)} placeholder="Вставьте готовую команду или фрагмент кода" spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" />
          <p className="small muted">Вставка здесь разрешена. Табуляции заменятся четырьмя пробелами.</p>
          <div className="preview-label">ИТОГОВЫЙ ОБРАЗЕЦ</div>
          <pre data-testid="custom-preview" className="custom-preview">{normalized}</pre>
          {!samples.length && <p className="small muted">Добавь текст, чтобы начать тренировку.</p>}
        </div>}
        <div className="duration-section">
          <div className="card-title"><span className="step-badge">02</span><h2>Выбери время</h2></div>
          <fieldset className="duration-options"><legend className="sr-only">Длительность тренировки</legend>
            {([30, 60, 120] as Duration[]).map(duration => <label className={`duration-option ${duration === settings.duration ? 'selected' : ''}`} key={duration}>
              <input type="radio" name="duration" aria-label={`${duration} секунд`} checked={duration === settings.duration} onChange={() => onSettings({ ...settings, duration })} />
              <Icon name="clock" size={17} /><strong>{duration}</strong><span>сек</span>
            </label>)}
          </fieldset>
        </div>
        <div className="start-row"><button className="button primary start-button" disabled={!samples.length} onClick={onStart}>Начать <Icon name="arrow" /></button><span className="start-note">Три секунды на подготовку —<br />и можно печатать</span></div>
      </section>
      <aside className="preview-card">
        <div className="preview-header"><span>Всё начинается с одной строки</span><Icon name="keyboard" /></div>
        <div className="example-window" aria-hidden="true">
          <div className="window-top"><span /><span /><span /><em>образец</em></div>
          <div className={`example-code ${settings.mode === 'algorithms' ? 'multiple' : ''}`}>{previewLines.map((line, index) => <div className="preview-code-line" key={index}><span className="line-number">{index + 1}</span><code>{line}</code>{index === previewLines.length - 1 && <i />}</div>)}</div>
        </div>
        <h2>В своём темпе.<br />С каждой строкой увереннее.</h2>
        <ol className="how-list">
          <li><span>1</span>Посмотри на образец</li>
          <li><span>2</span>Перепечатай каждый символ</li>
          <li><span>3</span>Узнай скорость и точность</li>
        </ol>
        <p className="keyboard-note"><Icon name="keyboard" size={17} /> Удобнее с обычной клавиатурой</p>
      </aside>
    </div>
    <div className="setup-bottom">
      <p className="material-note">{settings.mode === 'custom' ? 'Свой текст сохраняется только до закрытия страницы.' : settings.mode === 'algorithms' ? `Новые сочетания команд и циклов: ${ALGORITHM_RULES.minLines}–${ALGORITHM_RULES.maxLines} строк, ${ALGORITHM_RULES.minRepeats}–${ALGORITHM_RULES.maxRepeats} повторений в цикле.` : 'Движение, прыжки, предметы и 6 цветов — команды появляются в случайном порядке.'}</p>
      <button className="record-link" onClick={onHistory}><Icon name="trophy" size={18} /><span>Рекорд на этом устройстве <strong>{record ? `${record.speed} зн/мин` : '—'}</strong></span><Icon name="arrow" size={16} /></button>
    </div>
  </main>;
}
