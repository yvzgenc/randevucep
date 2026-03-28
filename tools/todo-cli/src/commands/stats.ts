import chalk from 'chalk';
import type { CommandContext, EffectiveTodo } from '../types';
import { toEffective } from '../types';
import { readCache } from '../storage/cache';
import { readOverlay } from '../storage/overlay';
import { isIgnored } from './scan';

const COL = process.stdout.isTTY ? process.stdout.columns ?? 80 : 80;

function bar(count: number, max: number, width = 20): string {
  const filled = max === 0 ? 0 : Math.round((count / max) * width);
  return chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(width - filled));
}

function pct(n: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((n / total) * 100)}%`;
}

export function statsCommand(ctx: CommandContext): void {
  const cache   = readCache(ctx.cachePath);
  const overlay = readOverlay(ctx.overlayPath);

  const entries = Object.values(cache.entries);
  if (entries.length === 0) {
    console.log(chalk.dim('  No todos in cache. Run `todo scan` first.'));
    return;
  }

  const visible: EffectiveTodo[] = entries
    .filter(t => !isIgnored(t, overlay.ignored))
    .map(t => toEffective(t, overlay));

  const total   = visible.length;
  const unowned = visible.filter(t => !t.effectiveOwner).length;
  const owned   = total - unowned;

  console.log('\n  ' + chalk.bold('TODO Stats') + chalk.dim(` — ${total} items`));
  console.log('  ' + '─'.repeat(Math.min(COL - 4, 56)));

  // ── By tag ──────────────────────────────────────────────────────────────────
  const byTag: Record<string, number> = {};
  for (const t of visible) byTag[t.tag] = (byTag[t.tag] ?? 0) + 1;

  const tagOrder = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
  const maxTag   = tagOrder[0]?.[1] ?? 0;

  console.log('\n  ' + chalk.bold('By tag'));
  for (const [tag, n] of tagOrder) {
    const label = tag.padEnd(10);
    const tagColored =
      tag === 'FIXME' || tag === 'XXX' ? chalk.red(label)    :
      tag === 'HACK'  || tag === 'TODO' ? chalk.yellow(label) :
      chalk.cyan(label);
    console.log(`  ${tagColored} ${bar(n, maxTag)}  ${String(n).padStart(3)}  ${chalk.dim(pct(n, total))}`);
  }

  // ── By owner ────────────────────────────────────────────────────────────────
  const byOwner: Record<string, number> = {};
  for (const t of visible) {
    const key = t.effectiveOwner ?? '(unowned)';
    byOwner[key] = (byOwner[key] ?? 0) + 1;
  }

  const ownerOrder = Object.entries(byOwner).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxOwner   = ownerOrder[0]?.[1] ?? 0;

  console.log('\n  ' + chalk.bold('By owner'));
  for (const [owner, n] of ownerOrder) {
    const label   = owner === '(unowned)' ? chalk.red('(unowned)') : chalk.green('@' + owner);
    const padded  = owner.padEnd(16).slice(0, 16);
    const colored = owner === '(unowned)' ? chalk.red(padded) : chalk.green(padded);
    console.log(`  ${colored}  ${bar(n, maxOwner)}  ${String(n).padStart(3)}  ${chalk.dim(pct(n, total))}`);
  }

  // ── By file (top 5) ─────────────────────────────────────────────────────────
  const byFile: Record<string, number> = {};
  for (const t of visible) byFile[t.file] = (byFile[t.file] ?? 0) + 1;

  const fileOrder = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxFile   = fileOrder[0]?.[1] ?? 0;

  if (fileOrder.length > 0) {
    console.log('\n  ' + chalk.bold('Most todos (top 5 files)'));
    for (const [file, n] of fileOrder) {
      const short = file.length > 36 ? '…' + file.slice(-35) : file;
      console.log(`  ${chalk.dim(short.padEnd(36))}  ${bar(n, maxFile, 12)}  ${String(n).padStart(3)}`);
    }
  }

  // ── Age ─────────────────────────────────────────────────────────────────────
  const now   = Date.now();
  const ages  = visible.map(t => (now - new Date(t.firstSeenAt).getTime()) / 86400000);
  const avg   = ages.reduce((a, b) => a + b, 0) / ages.length;
  const oldest = Math.max(...ages);

  console.log('\n  ' + chalk.bold('Age'));
  console.log(`  Avg age   ${chalk.yellow(avg.toFixed(1) + ' days')}`);
  console.log(`  Oldest    ${chalk.yellow(oldest.toFixed(0) + ' days')}`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n  ' + '─'.repeat(Math.min(COL - 4, 56)));
  console.log(
    `  ${chalk.bold(String(total))} items · ` +
    `${chalk.green(String(owned))} owned · ` +
    `${chalk.red(String(unowned))} unowned\n`,
  );
}
