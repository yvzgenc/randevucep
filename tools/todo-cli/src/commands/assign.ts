import chalk from 'chalk';
import type { CommandContext } from '../types';
import { readCache } from '../storage/cache';
import { readOverlay, writeOverlay } from '../storage/overlay';

interface AssignOptions {
  to?: string;
  ticket?: string;
}

export function assignCommand(ctx: CommandContext, ids: string[], opts: AssignOptions): void {
  if (!opts.to && !opts.ticket) {
    console.error(chalk.red('  Error: provide --to <owner> or --ticket <ref>'));
    process.exit(1);
  }

  const cache = readCache(ctx.cachePath);
  const overlay = readOverlay(ctx.overlayPath);

  const now = new Date().toISOString();
  let updated = 0;
  const notFound: string[] = [];

  for (const id of ids) {
    if (!cache.entries[id]) {
      notFound.push(id);
      continue;
    }

    const existing = overlay.assignments[id];
    overlay.assignments[id] = {
      owner: opts.to !== undefined ? opts.to : (existing?.owner ?? null),
      ticket: opts.ticket !== undefined ? opts.ticket : (existing?.ticket ?? null),
      updatedAt: now,
    };
    updated++;
  }

  if (notFound.length > 0) {
    console.error(chalk.red(`  Error: ID(s) not found: ${notFound.join(', ')}`));
    console.error(chalk.dim('  Run `todo list` to see available IDs.'));
    if (updated === 0) process.exit(1);
  }

  writeOverlay(ctx.overlayPath, overlay);

  for (const id of ids.filter(i => !notFound.includes(i))) {
    const a = overlay.assignments[id];
    const parts = [
      opts.to ? chalk.green('@' + opts.to) : null,
      opts.ticket ? chalk.blue(opts.ticket) : null,
    ].filter(Boolean).join(' · ');
    console.log(chalk.green('  ✓') + `  [${id}] assigned → ${parts}`);
  }
}
