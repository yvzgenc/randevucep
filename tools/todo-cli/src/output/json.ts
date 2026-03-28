import type { EffectiveTodo } from '../types';

export function renderJson(todos: EffectiveTodo[]): void {
  const out = {
    total: todos.length,
    unowned: todos.filter(t => !t.effectiveOwner).length,
    todos: todos.map(t => ({
      id: t.id,
      file: t.file,
      line: t.line,
      col: t.col,
      tag: t.tag,
      message: t.message,
      owner: t.effectiveOwner,
      ticket: t.effectiveTicket,
      gitAuthor: t.gitAuthor,
      gitAuthorDate: t.gitAuthorDate,
      firstSeenAt: t.firstSeenAt,
      scannedAt: t.scannedAt,
    })),
  };
  console.log(JSON.stringify(out, null, 2));
}
