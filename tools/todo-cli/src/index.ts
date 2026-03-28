#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import chalk from 'chalk';
import { getRepoRoot } from './git/diff';
import { ensureTodoDir } from './config';
import type { CommandContext, OutputFormat } from './types';
import { initCommand } from './commands/init';
import { scanCommand } from './commands/scan';
import { listCommand } from './commands/list';
import { showCommand } from './commands/show';
import { assignCommand } from './commands/assign';
import { ignoreCommand } from './commands/ignore';
import { openCommand } from './commands/open';
import { gitHookCommand } from './commands/githook';
import { statsCommand } from './commands/stats';
import { unassignCommand } from './commands/unassign';

function resolveContext(cwd: string): CommandContext {
  const repoRoot = getRepoRoot(cwd) ?? cwd;
  const todoDir = path.join(repoRoot, '.todo');
  return {
    repoRoot,
    todoDir,
    cachePath: path.join(todoDir, 'cache.json'),
    overlayPath: path.join(todoDir, 'overlay.json'),
  };
}

function requireInit(ctx: CommandContext): void {
  if (!fs.existsSync(ctx.todoDir)) {
    console.error(chalk.red('  Error: .todo/ not found. Run `todo init` first.'));
    process.exit(1);
  }
}

const program = new Command();
program
  .name('todo')
  .description('Track TODO comments across your codebase')
  .version('0.1.0')
  .exitOverride();

// ── init ──────────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize .todo/ in this repo')
  .action(() => {
    const ctx = resolveContext(process.cwd());
    initCommand(ctx);
  });

// ── scan ──────────────────────────────────────────────────────────────────────
program
  .command('scan')
  .description('Scan codebase for TODO comments (default command)')
  .option('--full', 'force full rescan, ignore incremental cache')
  .option('--blame', 'populate git blame author for all found items (slow)')
  .option('--format <fmt>', 'output format: table, json, markdown, editor', 'table')
  .option('-q, --quiet', 'suppress output (useful in scripts/CI)')
  .option('--exit-code', 'exit 1 if unowned TODO items exist (for CI/hooks)')
  .action((opts) => {
    const ctx = resolveContext(process.cwd());
    ensureTodoDir(ctx.repoRoot);
    scanCommand(ctx, { ...opts, exitCode: opts.exitCode });
  });

// ── list ──────────────────────────────────────────────────────────────────────
program
  .command('list')
  .alias('ls')
  .description('List todos with optional filters')
  .option('--type <tags>', 'filter by tag(s), comma-separated (e.g. FIXME,HACK)')
  .option('--author <name>', 'filter by owner or git blame author')
  .option('--unowned', 'show only items without an owner')
  .option('--file <path>', 'filter by file path (substring match)')
  .option('--since <period>', 'items first seen within period: Nd, Nw, Nm, Nh (e.g. 2w)')
  .option('--ticket <ref>', 'filter by ticket reference (e.g. GH-42)')
  .option('--format <fmt>', 'output format: table, json, markdown, editor', 'table')
  .option('--exit-code', 'exit 1 if matching unowned items exist (for CI)')
  .action((opts) => {
    const ctx = resolveContext(process.cwd());
    requireInit(ctx);
    listCommand(ctx, {
      type: opts.type ? opts.type.split(',').map((t: string) => t.trim()) : undefined,
      author: opts.author,
      unowned: opts.unowned,
      file: opts.file,
      since: opts.since,
      ticket: opts.ticket,
      format: opts.format as OutputFormat,
      exitCode: opts.exitCode,
    });
  });

// ── show ──────────────────────────────────────────────────────────────────────
program
  .command('show <id>')
  .description('Show full details for a single TODO by ID')
  .action((id, _opts) => {
    const ctx = resolveContext(process.cwd());
    requireInit(ctx);
    showCommand(ctx, id.toUpperCase());
  });

// ── assign ────────────────────────────────────────────────────────────────────
program
  .command('assign <ids...>')
  .description('Assign owner or ticket to one or more TODO IDs')
  .option('--to <owner>', 'assign to this owner')
  .option('--ticket <ref>', 'link to this ticket reference')
  .action((ids, opts) => {
    const ctx = resolveContext(process.cwd());
    requireInit(ctx);
    assignCommand(ctx, ids.map((i: string) => i.toUpperCase()), opts);
  });

// ── ignore ────────────────────────────────────────────────────────────────────
program
  .command('ignore')
  .description('Manage ignored patterns')
  .option('--pattern <pat>', 'add an ignore pattern (T-ID, file path fragment, or message substring)')
  .option('--list', 'list all current ignore patterns')
  .option('--remove <pat>', 'remove an ignore pattern')
  .action((opts) => {
    const ctx = resolveContext(process.cwd());
    requireInit(ctx);
    ignoreCommand(ctx, opts);
  });

// ── open ──────────────────────────────────────────────────────────────────────
program
  .command('open <id>')
  .description('Open a TODO in VS Code at the exact line')
  .action((id) => {
    const ctx = resolveContext(process.cwd());
    requireInit(ctx);
    openCommand(ctx, id.toUpperCase());
  });

// ── stats ─────────────────────────────────────────────────────────────────────
program
  .command('stats')
  .description('Show statistics: by tag, owner, file, and age')
  .action(() => {
    const ctx = resolveContext(process.cwd());
    requireInit(ctx);
    statsCommand(ctx);
  });

// ── unassign ──────────────────────────────────────────────────────────────────
program
  .command('unassign <ids...>')
  .description('Remove owner/ticket assignment from one or more TODO IDs')
  .action((ids) => {
    const ctx = resolveContext(process.cwd());
    requireInit(ctx);
    unassignCommand(ctx, ids.map((i: string) => i.toUpperCase()));
  });

// ── git-hook ──────────────────────────────────────────────────────────────────
program
  .command('git-hook')
  .description('Manage the pre-commit git hook')
  .option('--install',   'install pre-commit hook (blocks commits with unowned TODOs)')
  .option('--uninstall', 'remove the pre-commit hook')
  .action((opts) => {
    const ctx = resolveContext(process.cwd());
    gitHookCommand(ctx, opts);
  });

// ── default: scan ─────────────────────────────────────────────────────────────
if (process.argv.length === 2) {
  process.argv.push('scan');
}

try {
  program.parse(process.argv);
} catch (err: any) {
  if (err.code !== 'commander.helpDisplayed' && err.code !== 'commander.version') {
    console.error(chalk.red('  Error: ' + (err.message ?? err)));
    process.exit(1);
  }
}
