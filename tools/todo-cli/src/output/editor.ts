import type { EffectiveTodo } from '../types';

// Emits file:line:col: [ID] TAG: message — parseable by editors as diagnostics
export function renderEditor(todos: EffectiveTodo[]): void {
  for (const t of todos.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    console.log(`${t.file}:${t.line}:${t.col}: [${t.id}] ${t.tag}: ${t.message}`);
  }
}
