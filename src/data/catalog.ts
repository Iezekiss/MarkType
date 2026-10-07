export type Mode = 'commands' | 'algorithms' | 'custom';
export type Duration = 30 | 60 | 120;
export type Sample = {
  id: string;
  title: string;
  type: 'command' | 'fragment';
  category: string;
  text: string;
  source: string;
  status: 'confirmed' | 'generated' | 'provided' | 'pending';
};

export const CATALOG_VERSION = 'mark-blocks-3';
export const modeLabels: Record<Mode, string> = { commands: 'Команды', algorithms: 'Алгоритмы', custom: 'Свой текст' };
export const modeDescriptions: Record<Mode, string> = { commands: 'Команды Марка', algorithms: 'Случайные алгоритмы', custom: 'Свой образец' };
export const colors = ['red', 'blue', 'white', 'yellow', 'purple', 'green'] as const;
export const ALGORITHM_RULES = {
  version: 'indented-loops-2', minLines: 12, maxLines: 30, minRepeats: 2, maxRepeats: 10,
  patterns: ['sequence', 'mixed', 'loops'] as const,
};
export const MARK_SOURCE = 'Команды и синтаксис предоставлены пользователем, 07.10.2026; paint(red) без кавычек подтверждён отдельно';

// Exact spellings supplied by the user. Samples are text, never executable code.
export const catalog: Sample[] = [
  ...['go', 'left', 'right', 'jump', 'put', 'take'].map((name): Sample => ({
    id: name, title: `${name}()`, type: 'command', category: 'Команды Марка',
    text: `${name}()`, source: MARK_SOURCE, status: 'confirmed',
  })),
  ...colors.map((color): Sample => ({
    id: `paint-${color}`, title: `paint(${color})`, type: 'command', category: 'Цвета',
    text: `paint(${color})`, source: MARK_SOURCE, status: 'confirmed',
  })),
  ...[
    'go()\nright()\ngo()',
    'take()\njump()\nput()',
    'paint(red)\ngo()\npaint(blue)',
    'left()\ntake()\npaint(white)',
    'for i in range(3):\n    go()\n    right()\nfor i in range(2):\n    paint(yellow)',
    'for i in range(4):\n    jump()\n    paint(purple)\npaint(green)',
  ].map((text, index): Sample => ({
    id: `example-${index + 1}`, title: `Пример фрагмента ${index + 1}`, type: 'fragment',
    category: 'Алгоритмы Марка', text, source: `Сочетание предоставленных команд. ${MARK_SOURCE}`, status: 'generated',
  })),
];

export function normalizeCustomText(text: string): string { return text.replace(/\r\n?/g, '\n').replace(/\t/g, '    '); }
export function getSamples(mode: Mode, customText = ''): Sample[] {
  if (mode === 'custom') {
    const text = normalizeCustomText(customText);
    return text.trim() ? [{ id: 'custom', title: 'Свой образец', type: text.includes('\n') ? 'fragment' : 'command', category: 'Свой текст', text, source: 'Текст преподавателя на этом устройстве; синтаксис не проверялся', status: 'provided' }] : [];
  }
  return catalog.filter(sample => sample.status !== 'pending' && sample.text.length > 0 && sample.type === (mode === 'commands' ? 'command' : 'fragment'));
}

// Four independent 32-bit accumulators fingerprint exact material without
// persisting the teacher's text. This is a comparison key, not cryptography.
export function conditionsKey(mode: Mode, duration: number, samples: Sample[], version = CATALOG_VERSION): string {
  // Random fragments share conditions only when both the command alphabet and
  // generation rules match. No realized random fragment is persisted as a key.
  const composition = JSON.stringify({
    texts: [...new Set(samples.map(s => s.text))].sort(),
    ...(mode === 'algorithms' ? { commands: getSamples('commands').map(s => s.text).sort(), rules: ALGORITHM_RULES } : {}),
    ...(mode === 'algorithms' || samples.some(s => /:\n|\n +|^ +/.test(s.text)) ? { inputRules: 'persistent-indent-2' } : {}),
  });
  const hashes = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  for (let i = 0; i < composition.length; i++) for (let j = 0; j < hashes.length; j++) {
    hashes[j] = Math.imul(hashes[j] ^ composition.charCodeAt(i), [16777619, 2246822519, 3266489917, 668265263][j]) >>> 0;
  }
  return `${mode}:${duration}:${version}:${hashes.map(h => h.toString(16).padStart(8, '0')).join('')}`;
}
