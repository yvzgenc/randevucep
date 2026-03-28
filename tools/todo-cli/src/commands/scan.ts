import * as path from 'path';
import chalk from 'chalk';
import type { CommandContext, TodoEntry, EffectiveTodo } from '../types';
import { DEFAULT_TAGS, toEffective } from '../types';
import { readCache, writeCache } from '../storage/cache';
import { readOverlay } from '../storage/overlay';
import { loadConfig, ensureTodoDir } from '../config';
import { parseFile, walkDir } from '../parser/index';
import { getCurrentCommit, getChangedFiles } from '../git/diff';
import { getBlame } from '../git/blame';
import { renderTable } from '../output/table';
import { renderJson } from '../output/json';
import { renderMarkdown } from '../output/markdown';
import { renderEditor } from '../output/editor';

interface ScanOptions {
  full?: boolean;
  blame?: boolean;
  format?: string;
  quiet?: boolean;
  exitCode?: boolean;
}

export function scanCommand(ctx: CommandContext, opts: ScanOptions): void {
  ensureTodoDir(ctx.repoRoot);
  const config = loadConfig(ctx.todoDir);
  const cache = readCache(ctx.cachePath);
  const overlay = readOverlay(ctx.overlayPath);
  const now = new Date().toISOString();
  const allTags = [...DEFAULT_TAGS, ...config.scan.customTags];

  // Determine what to scan
  const currentCommit = getCurrentCommit(ctx.repoRoot);
  let filesToScan: string[] = [];
  let isIncremental = false;
  let skipped = false;

  if (opts.full || !cache.lastCommit) {
    // Full scan
    cache.entries = {};
    filesToScan = walkDir(ctx.repoRoot, ctx.repoRoot, config.scan.exclude, config.scan.includeExtensions);
  } else if (currentCommit && currentCommit === cache.lastCommit) {
    // Nothing changed since last scan
    skipped = true;
    filesToScan = [];
  } else if (currentCommit) {
    // Incremental
    isIncremental = true;
    const changed = getChangedFiles(ctx.repoRoot, cache.lastCommit);
    filesToScan = changed.filter(f =>
      config.scan.includeExtensions.includes(path.extname(f).toLowerCase())
    );
    // Remove stale entries for changed files
    const changedSet = new Set(filesToScan);
    for (const id of Object.keys(cache.entries)) {
      if (changedSet.has(cache.entries[id].file)) delete cache.entries[id];
    }
  } else {
    // No git — full scan every time
    cache.entries = {};
    filesToScan = walkDir(ctx.repoRoot, ctx.repoRoot, config.scan.exclude, config.scan.includeExtensions);
  }

  // Parse files
  for (const relFile of filesToScan) {
    const absFile = path.join(ctx.repoRoot, relFile);
    const parsed = parseFile(absFile, ctx.repoRoot, allTags, now);
    for (const todo of parsed) {
      const existing = cache.entries[todo.id];
      const entry: TodoEntry = {
        ...todo,
        // Preserve git data from previous scan if unchanged
        gitAuthor: existing?.gitAuthor ?? todo.gitAuthor,
        gitAuthorDate: existing?.gitAuthorDate ?? todo.gitAuthorDate,
        gitCommitHash: existing?.gitCommitHash ?? todo.gitCommitHash,
        firstSeenAt: existing?.firstSeenAt ?? now,
      };
      cache.entries[todo.id] = entry;
    }
  }

  // Populate git blame if requested
  if (opts.blame) {
    for (const entry of Object.values(cache.entries)) {
      if (!entry.gitAuthor) {
        const blame = getBlame(ctx.repoRoot, entry.file, entry.line);
        if (blame) {
          entry.gitAuthor = blame.author;
          entry.gitAuthorDate = blame.date;
          entry.gitCommitHash = blame.commitHash;
        }
      }
    }
  }

  // Update state and save
  cache.lastCommit = currentCommit;
  cache.lastScanAt = now;
  cache.repoRoot = ctx.repoRoot;
  writeCache(ctx.cachePath, cache);

  // Collect visible todos (not ignored)
  const allTodos = Object.values(cache.entries);
  const visible = allTodos.filter(t => !isIgnored(t, overlay.ignored));
  const effective: EffectiveTodo[] = visible.map(t => toEffective(t, overlay));

  if (!opts.quiet) {
    render(effective, opts.format ?? 'table', ctx.repoRoot);

    const scannedMsg = skipped
      ? chalk.dim('  (cache warm — no changes detected)')
      : chalk.dim(`  Scanned ${filesToScan.length} file${filesToScan.length !== 1 ? 's' : ''}${isIncremental ? ' (incremental)' : ''}`);
    console.log(scannedMsg);
  }

  if (opts.exitCode) {
    const unowned = effective.filter((t) => !t.effectiveOwner);
    if (unowned.length > 0) {
      if (!opts.quiet) {
        console.error(chalk.red(`\n  ✗ ${unowned.length} unowned TODO item${unowned.length !== 1 ? 's' : ''} found (--exit-code)`));
      }
      process.exit(1);
    }
  }
}

function render(todos: EffectiveTodo[], format: string, repoRoot: string) {
  switch (format) {
    case 'json':     return renderJson(todos);
    case 'markdown': return renderMarkdown(todos);
    case 'editor':   return renderEditor(todos);
    default:         return renderTable(todos, repoRoot);
  }
}

export function isIgnored(todo: { id: string; file: string; message: string }, patterns: string[]): boolean {
  for (const p of patterns) {
    if (/^T-[A-F0-9]{6}$/.test(p)) {
      if (todo.id === p) return true;
    } else {
      if (todo.file.includes(p) || todo.message.toLowerCase().includes(p.toLowerCase())) return true;
    }
  }
  return false;
}
