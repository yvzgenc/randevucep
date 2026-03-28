import chalk from 'chalk';
import type { CommandContext } from '../types';
import { readCache } from '../storage/cache';
import { readOverlay, writeOverlay } from '../storage/overlay';

export function unassignCommand(ctx: CommandContext, ids: string[]): void {
  const cache   = readCache(ctx.cachePath);
  const overlay = readOverlay(ctx.overlayPath);

  let removed = 0;
  const notFound: string[] = [];
  const notAssigned: string[] = [];

  for (const id of ids) {
    if (!cache.entries[id]) {
      notFound.push(id);
      continue;
    }
    if (!overlay.assignments[id]) {
      notAssigned.push(id);
      continue;
    }
    delete overlay.assignments[id];
    removed++;
  }

  if (notFound.length > 0) {
    console.error(chalk.red(`  Error: ID(s) not found in cache: ${notFound.join(', ')}`));
    if (removed === 0 && notAssigned.length === 0) process.exit(1);
  }

  if (notAssigned.length > 0) {
    for (const id of notAssigned) {
      console.log(chalk.dim(`  [${id}] has no overlay assignment — nothing to remove.`));
    }
  }

  if (removed > 0) {
    writeOverlay(ctx.overlayPath, overlay);
    for (const id of ids.filter(i => !notFound.includes(i) && !notAssigned.includes(i))) {
      console.log(chalk.green('  ✓') + `  [${id}] unassigned`);
    }
  }
}
