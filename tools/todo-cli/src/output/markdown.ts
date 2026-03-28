import type { EffectiveTodo } from '../types';

export function renderMarkdown(todos: EffectiveTodo[]): void {
  if (todos.length === 0) {
    console.log('_No TODO items found._');
    return;
  }

  console.log('# TODO Report\n');
  console.log(`**Total:** ${todos.length} | **Unowned:** ${todos.filter(t => !t.effectiveOwner).length}\n`);

  // Group by file
  const byFile = new Map<string, EffectiveTodo[]>();
  for (const t of todos) {
    const arr = byFile.get(t.file) ?? [];
    arr.push(t);
    byFile.set(t.file, arr);
  }

  for (const [file, items] of byFile) {
    console.log(`\n## \`${file}\`\n`);
    console.log('| ID | Line | Tag | Message | Owner |');
    console.log('|---|---|---|---|---|');
    for (const t of items.sort((a, b) => a.line - b.line)) {
      const owner = t.effectiveOwner
        ? `@${t.effectiveOwner}`
        : t.effectiveTicket ?? '⚠ unowned';
      const msg = t.message.replace(/\|/g, '\\|');
      console.log(`| \`${t.id}\` | ${t.line} | \`${t.tag}\` | ${msg} | ${owner} |`);
    }
  }
}
