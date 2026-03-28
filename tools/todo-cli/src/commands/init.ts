import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../config';
import type { CommandContext } from '../types';

export function initCommand(ctx: CommandContext): void {
  const configPath = path.join(ctx.todoDir, 'config.json');

  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow('  .todo/config.json already exists. Remove it first to re-initialize.'));
    return;
  }

  fs.mkdirSync(ctx.todoDir, { recursive: true });

  const gi = path.join(ctx.todoDir, '.gitignore');
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, 'cache.json\n');

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));

  console.log(chalk.green('  Initialized .todo/'));
  console.log(chalk.dim('  config.json  — edit to customize tags and scan patterns'));
  console.log(chalk.dim('  cache.json   — gitignored, rebuilt on scan'));
  console.log('');
  console.log('  Run ' + chalk.bold('todo scan') + ' to find all TODOs in this project.');
}
