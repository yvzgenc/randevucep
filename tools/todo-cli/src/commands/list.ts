import chalk from 'chalk';
import type { CommandContext, FilterOptions, EffectiveTodo } from '../types';
import { toEffective } from '../types';
import { readCache } from '../storage/cache';
import { readOverlay } from '../storage/overlay';
import { renderTable } from '../output/table';
import { renderJson } from '../output/json';
import { renderMarkdown } from '../output/markdown';
import { renderEditor } from '../output/editor';
import { isIgnored } from './scan';

export function listCommand(ctx: CommandContext, opts: FilterOptions): void {
  const cache = readCache(ctx.cachePath);
  const overlay = readOverlay(ctx.overlayPath);

  if (Object.keys(cache.entries).length === 0) {
    console.log(chalk.dim('  No todos in cache. Run `todo scan` first.'));
    return;
  }

  const effective: EffectiveTodo[] = Object.values(cache.entries)
    .filter(t => !isIgnored(t, overlay.ignored))
    .map(t => toEffective(t, overlay));

  const filtered = applyFilters(effective, opts);

  switch (opts.format ?? 'table') {
    case 'json':     renderJson(filtered); break;
    case 'markdown': renderMarkdown(filtered); break;
    case 'editor':   renderEditor(filtered); break;
    default:         renderTable(filtered, ctx.repoRoot);
  }

  if (opts.exitCode) {
    const unowned = filtered.filter((t) => !t.effectiveOwner);
    if (unowned.length > 0) {
      console.error(chalk.red(`\n  ✗ ${unowned.length} unowned TODO item${unowned.length !== 1 ? 's' : ''} found (--exit-code)`));
      process.exit(1);
    }
  }
}

function applyFilters(todos: EffectiveTodo[], opts: FilterOptions): EffectiveTodo[] {
  return todos.filter(t => {
    if (opts.type?.length) {
      const upper = opts.type.map(x => x.toUpperCase());
      if (!upper.includes(t.tag)) return false;
    }

    if (opts.author) {
      const q = opts.author.toLowerCase();
      const match =
        (t.parsedOwner?.toLowerCase().includes(q)) ||
        (t.effectiveOwner?.toLowerCase().includes(q)) ||
        (t.gitAuthor?.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (opts.unowned && t.effectiveOwner) return false;

    if (opts.file && !t.file.toLowerCase().includes(opts.file.toLowerCase())) return false;

    if (opts.ticket) {
      if (t.effectiveTicket !== opts.ticket && t.ticket !== opts.ticket) return false;
    }

    if (opts.since) {
      const cutoff = parseSince(opts.since);
      if (cutoff && new Date(t.firstSeenAt) < cutoff) return false;
    }

    return true;
  });
}

function parseSince(s: string): Date | null {
  const m = /^(\d+)([dhwm])$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const factor = ({ d: 1, h: 1 / 24, w: 7, m: 30 } as Record<string, number>)[m[2]] ?? 1;
  return new Date(Date.now() - n * factor * 86400000);
}
