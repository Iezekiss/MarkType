import type { CSSProperties } from 'react';
type Name = 'arrow' | 'clock' | 'keyboard' | 'history' | 'check' | 'pause' | 'play' | 'code' | 'lines' | 'text' | 'shield' | 'trophy' | 'refresh' | 'back' | 'close' | 'target';
const paths: Record<Name, React.ReactNode> = {
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  keyboard: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10" /></>,
  history: <><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  play: <path d="m9 5 10 7-10 7Z" />,
  code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18" /></>,
  lines: <><path d="M9 6h12M9 12h8M9 18h12M3 6h.01M3 12h.01M3 18h.01" /></>,
  text: <><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M15 3h6v6M21 3 10 14" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
  trophy: <><path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6m-4 1h8" /></>,
  refresh: <><path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5" /></>,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 11v2" /></>,
};
export function Icon({ name, size = 20, style }: { name: Name; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
