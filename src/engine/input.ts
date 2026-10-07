import type { Session } from './session';

export type KeyInput = { key: string; repeat: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean; isComposing: boolean; getModifierState?: (key: string) => boolean };
// Returns true only when the field must prevent the browser's default edit.
export function handleKey(session: Session, event: KeyInput): boolean {
  if (event.key === 'Escape') { if (!event.repeat) session.pause(); return true; }
  if (event.ctrlKey || event.metaKey) {
    // Let AltGraph produce actual characters on layouts that need it.
    if (!event.getModifierState?.('AltGraph')) return event.key.toLowerCase() === 'v';
  }
  const character = event.key === 'Enter' ? '\n' : event.key;
  if (event.key === 'Backspace') { if (!event.repeat) session.backspace(); return true; }
  if (Array.from(character).length !== 1 || event.isComposing) return false;
  if (!event.repeat) session.input(character);
  return true;
}
