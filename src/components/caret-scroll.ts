export function caretScrollLeft(current: number, caretX: number, viewportWidth: number, padding: number): number {
  if (caretX > current + viewportWidth - padding - 20) return Math.max(0, caretX - viewportWidth + padding + 20);
  if (caretX < current + padding) return Math.max(0, caretX - padding);
  return current;
}
