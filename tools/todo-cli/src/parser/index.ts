import * as fs from 'fs';
import * as path from 'path';
import type { TodoEntry } from '../types';
import { getLanguage } from './languages';
import { computeId, toRepoRelative } from './id';

const TICKET_RE = /\b([A-Z][A-Z0-9]+-\d+|#\d+)\b/;

function findLineCommentStart(line: string, marker: string): number {
  let inStr = false;
  let strChar = '';
  for (let i = 0; i <= line.length - marker.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (ch === strChar && (i === 0 || line[i - 1] !== '\\')) inStr = false;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true;
      strChar = ch;
    } else if (line.slice(i, i + marker.length) === marker) {
      return i;
    }
  }
  return -1;
}

function parseAnnotation(ownerRaw: string | undefined, msgRaw: string) {
  const message = msgRaw.trim();
  let parsedOwner: string | null = null;
  let ticket: string | null = null;

  if (ownerRaw) {
    const t = ownerRaw.trim();
    if (TICKET_RE.test(t)) ticket = t;
    else parsedOwner = t || null;
  }

  if (!ticket) {
    const m = TICKET_RE.exec(message);
    if (m) ticket = m[0];
  }

  return { parsedOwner, ticket, message };
}

type PartialEntry = Omit<TodoEntry, 'firstSeenAt'>;

export function parseFile(absPath: string, repoRoot: string, allTags: string[], now: string): PartialEntry[] {
  const relPath = toRepoRelative(absPath, repoRoot);
  const ext = path.extname(absPath);
  const lang = getLanguage(ext);
  if (!lang) return [];

  let content: string;
  try {
    const buf = fs.readFileSync(absPath);
    for (let i = 0; i < Math.min(buf.length, 8000); i++) {
      if (buf[i] === 0) return [];
    }
    content = buf.toString('utf8');
  } catch { return []; }

  const tagRe = new RegExp(
    `\\b(${allTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})` +
    `\\s*(?:\\(([^)]*)\\))?\\s*[:\\-]?\\s*(.*)`,
    'i'
  );

  const lines = content.split('\n');
  const results: PartialEntry[] = [];
  const seenIds = new Set<string>();

  function push(lineNum: number, col: number, m: RegExpExecArray) {
    const [, tag, ownerRaw, msgRaw] = m;
    const { parsedOwner, ticket, message } = parseAnnotation(ownerRaw, msgRaw);

    let id = computeId(relPath, tag, message);
    let counter = 1;
    while (seenIds.has(id)) {
      id = computeId(relPath, tag, message, String(counter++));
    }
    seenIds.add(id);

    results.push({
      id,
      file: relPath,
      line: lineNum,
      col,
      tag: tag.toUpperCase(),
      message,
      parsedOwner,
      ticket,
      gitAuthor: null,
      gitAuthorDate: null,
      gitCommitHash: null,
      scannedAt: now,
    });
  }

  let inBlock = false;
  let blockEnd = '';

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const lineNum = i + 1;

    if (!inBlock) {
      // Try line comments first
      let foundLineComment = false;
      for (const lc of lang.lineComments) {
        const ci = findLineCommentStart(text, lc);
        if (ci !== -1) {
          const inner = text.slice(ci + lc.length);
          const m = tagRe.exec(inner);
          if (m) push(lineNum, ci + 1, m);
          foundLineComment = true;
          break;
        }
      }

      // Try block comments (only if no line comment on this line)
      if (!foundLineComment) {
        for (const [start, end] of lang.blockComments) {
          const si = text.indexOf(start);
          if (si === -1) continue;
          const ei = text.indexOf(end, si + start.length);
          if (ei !== -1) {
            // Same-line block comment
            const inner = text.slice(si + start.length, ei);
            const m = tagRe.exec(inner);
            if (m) push(lineNum, si + 1, m);
          } else {
            // Opening of multi-line block comment
            inBlock = true;
            blockEnd = end;
            const inner = text.slice(si + start.length);
            const m = tagRe.exec(inner);
            if (m) push(lineNum, si + 1, m);
          }
          break;
        }
      }
    } else {
      // Inside block comment
      const ei = text.indexOf(blockEnd);
      const inner = ei !== -1 ? text.slice(0, ei) : text;
      const m = tagRe.exec(inner);
      if (m) push(lineNum, 1, m);
      if (ei !== -1) { inBlock = false; blockEnd = ''; }
    }
  }

  return results;
}

export function walkDir(
  dir: string,
  repoRoot: string,
  excludePatterns: string[],
  includeExtensions: string[]
): string[] {
  const results: string[] = [];

  function walk(current: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const rel = toRepoRelative(abs, repoRoot);

      if (shouldExclude(rel, entry.name, excludePatterns)) continue;

      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        if (includeExtensions.includes(path.extname(entry.name).toLowerCase())) {
          results.push(rel);
        }
      }
    }
  }

  walk(dir);
  return results;
}

function shouldExclude(relPath: string, name: string, patterns: string[]): boolean {
  for (const p of patterns) {
    if (p.includes('/')) {
      if (relPath.startsWith(p) || relPath === p) return true;
    } else {
      if (name === p || relPath.split('/').includes(p)) return true;
    }
  }
  return false;
}
