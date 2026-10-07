// NOT imported into the training catalog. Add exact syntax only after checking
// a current Mark reference/editor; record its URL/document and verification date.
export const pendingCommands = [
  'Прибавить', 'Отнять', 'Присвоить',
  'Скачок на 2–10 платформ', 'СкачокНазад на 2–10 платформ',
  'Пока', 'Если', 'Иначе',
].map(title => ({ title, status: 'pending' as const, exactText: null, source: 'Русское название из пользовательского задания; текстовый синтаксис требует сверки' }));
