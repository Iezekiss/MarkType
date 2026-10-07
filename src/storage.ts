import type { Mode, Duration } from './data/catalog';
export type Settings = { mode: Mode; duration: Duration };
export type Result = Settings & { id: string; date: string; conditions: string; speed: number; accuracy: number | null; errors: number; completed: number; credited: number };
const keys = { settings: 'mshp.speed.settings.v1', history: 'mshp.speed.history.v1', records: 'mshp.speed.records.v1' };
const defaults: Settings = { mode: 'commands', duration: 60 };
const validMode = (v: unknown): v is Mode => typeof v === 'string' && ['commands', 'algorithms', 'custom'].includes(v);
function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
function write(key: string, value: unknown): boolean { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function validResult(value: unknown): value is Result {
  if (!value || typeof value !== 'object') return false;
  const r = value as Result;
  return typeof r.id === 'string' && typeof r.date === 'string' && Number.isFinite(Date.parse(r.date)) && typeof r.conditions === 'string' && validMode(r.mode) && [30, 60, 120].includes(r.duration)
    && [r.speed, r.errors, r.completed, r.credited].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0)
    && (r.accuracy === null || (typeof r.accuracy === 'number' && Number.isFinite(r.accuracy) && r.accuracy >= 0 && r.accuracy <= 100));
}
export function readSettings(): Settings {
  const value = read(keys.settings) as Settings | null;
  return value && validMode(value.mode) && [30, 60, 120].includes(value.duration) ? { mode: value.mode, duration: value.duration } : { ...defaults };
}
export function saveSettings(settings: Settings): boolean { return write(keys.settings, { mode: settings.mode, duration: settings.duration }); }
export function readHistory(): Result[] {
  const value = read(keys.history); return Array.isArray(value) ? value.filter(validResult).slice(0, 20) : [];
}
export function readRecords(): Record<string, Result> {
  const value = read(keys.records);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, result]) => validResult(result) && result.accuracy !== null && result.conditions === key));
}
export function saveResult(result: Result): boolean {
  const history = [result, ...readHistory().filter(r => r.id !== result.id)].slice(0, 20);
  const records = readRecords(); const old = records[result.conditions];
  if (result.accuracy !== null && (!old || result.speed > old.speed || (result.speed === old.speed && result.accuracy > (old.accuracy ?? 0)))) records[result.conditions] = result;
  const historySaved = write(keys.history, history);
  const recordsSaved = write(keys.records, records);
  return historySaved && recordsSaved;
}
export function clearHistory(): boolean {
  try { localStorage.removeItem(keys.history); localStorage.removeItem(keys.records); return true; } catch { return false; }
}
