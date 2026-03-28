import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import type { CommandContext } from '../types';
import { readCache } from '../storage/cache';

export function openCommand(ctx: CommandContext, id: string): void {
  const cache = readCache(ctx.cachePath);
  const entry = cache.entries[id];

  if (!entry) {
    console.error(chalk.red(`  Error: ID not found: ${id}`));
    console.error(chalk.dim('  Run `todo list` to see available IDs.'));
    process.exit(1);
  }

  const absFile = path.join(ctx.repoRoot, entry.file);
  const target  = `${absFile}:${entry.line}:${entry.col}`;

  try {
    execSync(`code --goto "${target}"`, { stdio: 'ignore' });
    console.log(
      chalk.green('  ✓') +
      `  Opened ${chalk.yellow(id)} → ${chalk.cyan(entry.file)}:${entry.line}`,
    );
  } catch {
    console.error(chalk.red('  Error: Could not open VS Code. Is `code` in your PATH?'));
    console.error(chalk.dim(`  File: ${absFile}  line ${entry.line}`));
    process.exit(1);
  }
}
