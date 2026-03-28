import chalk from 'chalk';
import type { EffectiveTodo } from '../types';

const TAG_COLOR: Record<string, (s: string) => string> = {
  FIXME:    s => chalk.yellow(s),
  XXX:      s => chalk.yellow(s),
  HACK:     s => chalk.yellow(s),
  TODO:     s => chalk.white(s),
  NOTE:     s => chalk.cyan(s),
  OPTIMIZE: s => chalk.cyan(s),
};

function colorTag(tag: string): string {
  return (TAG_COLOR[tag] ?? chalk.white)(tag);
}

function formatOwner(owner: string | null, ticket: string | null): string {
  if (owner) return chalk.green('@' + owner);
  if (ticket) return chalk.blue(ticket);
  return chalk.red('⚠ unowned');
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function renderTable(todos: EffectiveTodo[], repoRoot: string): void {
  if (todos.length === 0) {
    console.log(chalk.dim('  No items found.'));
    return;
  }

  const useColor = process.stdout.isTTY !== false;
  const width = process.stdout.columns ?? 80;
  const msgWidth = Math.max(20, width - 55);

  // Group by file
  const byFile = new Map<string, EffectiveTodo[]>();
  for (const t of todos) {
    const arr = byFile.get(t.file) ?? [];
    arr.push(t);
    byFile.set(t.file, arr);
  }

  for (const [file, items] of byFile) {
    console.log('\n  ' + (useColor ? chalk.bold.blue(file) : file));
    items.sort((a, b) => a.line - b.line);

    for (let i = 0; i < items.length; i++) {
      const t = items[i];
      const isLast = i === items.length - 1;
      const prefix = isLast ? '  └──' : '  ├──';

      const id = useColor ? chalk.dim(`[${t.id}]`) : `[${t.id}]`;
      const lineNo = useColor ? chalk.dim(`line ${String(t.line).padEnd(4)}`) : `line ${String(t.line).padEnd(4)}`;
      const tag = useColor ? colorTag(t.tag.padEnd(8)) : t.tag.padEnd(8);
      const msg = t.message.length > msgWidth
        ? t.message.slice(0, msgWidth - 1) + '…'
        : t.message.padEnd(msgWidth);
      const owner = formatOwner(t.effectiveOwner, t.effectiveTicket);

      console.log(`${prefix} ${id}  ${lineNo}  ${tag}  ${msg}  ${owner}`);
    }
  }

  // Summary
  const unowned = todos.filter(t => !t.effectiveOwner).length;
  const byTag: Record<string, number> = {};
  for (const t of todos) byTag[t.tag] = (byTag[t.tag] ?? 0) + 1;
  const tagSummary = Object.entries(byTag)
    .filter(([tag]) => tag !== 'TODO')
    .map(([tag, n]) => `${n} ${tag}`)
    .join(' · ');

  const parts = [
    `${todos.length} item${todos.length !== 1 ? 's' : ''}`,
    unowned ? chalk.red(`${unowned} unowned`) : null,
    tagSummary || null,
  ].filter(Boolean).join(' · ');

  console.log('\n  ' + chalk.dim('─'.repeat(Math.min(60, width - 4))));
  console.log('  ' + (useColor ? chalk.dim(parts) : parts));
}
