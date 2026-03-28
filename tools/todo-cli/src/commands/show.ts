import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { CommandContext } from '../types';
import { toEffective } from '../types';
import { readCache } from '../storage/cache';
import { readOverlay } from '../storage/overlay';
import { getBlame } from '../git/blame';

export function showCommand(ctx: CommandContext, id: string): void {
  const cache = readCache(ctx.cachePath);
  const overlay = readOverlay(ctx.overlayPath);

  const todo = cache.entries[id];
  if (!todo) {
    console.error(chalk.red(`  Error: '${id}' not found. Run \`todo list\` to see available IDs.`));
    process.exit(1);
  }

  // Lazy blame resolution
  if (!todo.gitAuthor) {
    const blame = getBlame(ctx.repoRoot, todo.file, todo.line);
    if (blame) {
      todo.gitAuthor = blame.author;
      todo.gitAuthorDate = blame.date;
      todo.gitCommitHash = blame.commitHash;
    }
  }

  const effective = toEffective(todo, overlay);
  const assignment = overlay.assignments[id];

  const age = timeAgo(todo.firstSeenAt);

  // Header
  console.log('');
  const tagPart = chalk.yellow(todo.tag);
  const ownerPart = effective.effectiveOwner
    ? chalk.green('@' + effective.effectiveOwner)
    : chalk.red('unowned');
  const ticketPart = effective.effectiveTicket ? chalk.blue(effective.effectiveTicket) : null;
  const headerParts = [
    chalk.bold(`[${todo.id}]`),
    tagPart,
    '·',
    ownerPart,
    ticketPart ? '·' : '',
    ticketPart ?? '',
    '·',
    chalk.dim(`first seen ${age}`),
  ].filter(Boolean).join('  ');
  console.log('  ' + headerParts);
  console.log('');

  // Details
  console.log('  ' + chalk.dim('File:') + `    ${todo.file} : ${todo.line}`);
  if (todo.gitAuthor) {
    console.log('  ' + chalk.dim('Author:') + `  ${todo.gitAuthor}${todo.gitAuthorDate ? ' (' + todo.gitAuthorDate + ')' : ''}`);
  }
  if (todo.gitCommitHash) {
    console.log('  ' + chalk.dim('Commit:') + `  ${todo.gitCommitHash}`);
  }
  if (assignment) {
    console.log('  ' + chalk.dim('Assigned:') + ` ${assignment.owner ?? assignment.ticket ?? '—'} (${timeAgo(assignment.updatedAt)})`);
  }
  console.log('');

  // Context lines
  showContext(ctx.repoRoot, todo.file, todo.line);

  // Suggested actions
  console.log('');
  console.log('  ' + chalk.dim('Suggested actions:'));
  if (!effective.effectiveOwner) {
    console.log('  ' + chalk.dim(`  todo assign ${id} --to <owner>`));
  }
  if (!effective.effectiveTicket) {
    console.log('  ' + chalk.dim(`  todo assign ${id} --ticket <ticket>`));
  }
  if (effective.effectiveOwner || effective.effectiveTicket) {
    console.log('  ' + chalk.dim(`  todo ignore ${id}   (suppress this item)`));
  }
  console.log('');
}

function showContext(repoRoot: string, relFile: string, targetLine: number): void {
  const absPath = path.join(repoRoot, relFile);
  let content: string;
  try { content = fs.readFileSync(absPath, 'utf8'); }
  catch { console.log(chalk.dim('  (file not readable)')); return; }

  const lines = content.split('\n');
  const startLine = Math.max(1, targetLine - 3);
  const endLine = Math.min(lines.length, targetLine + 3);

  console.log('  ' + chalk.dim('Context:'));
  for (let i = startLine; i <= endLine; i++) {
    const text = (lines[i - 1] ?? '').trimEnd();
    const lineNo = String(i).padStart(4);
    if (i === targetLine) {
      console.log('  ' + chalk.bold.white(`→ ${lineNo}  │  ${text}`));
    } else {
      console.log('  ' + chalk.dim(`  ${lineNo}  │  ${text}`));
    }
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
}
