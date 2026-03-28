export type CommentTag = 'TODO' | 'FIXME' | 'HACK' | 'NOTE' | 'XXX' | 'OPTIMIZE';

export const DEFAULT_TAGS: string[] = ['TODO', 'FIXME', 'HACK', 'NOTE', 'XXX', 'OPTIMIZE'];

export const TAG_SEVERITY: Record<string, 'high' | 'medium' | 'low'> = {
  FIXME:    'high',
  XXX:      'high',
  TODO:     'medium',
  HACK:     'medium',
  NOTE:     'low',
  OPTIMIZE: 'low',
};

export interface TodoEntry {
  id: string;           // T-XXXXXX
  file: string;         // repo-relative, forward slashes
  line: number;
  col: number;
  tag: string;          // uppercase
  message: string;
  parsedOwner: string | null;  // from TODO(owner) annotation
  ticket: string | null;       // extracted ticket ref
  gitAuthor: string | null;    // from git blame (lazy)
  gitAuthorDate: string | null;
  gitCommitHash: string | null;
  scannedAt: string;           // ISO8601 - last scan
  firstSeenAt: string;         // ISO8601 - first discovered
}

export interface CacheFile {
  version: number;
  repoRoot: string;
  lastCommit: string | null;
  lastScanAt: string | null;
  entries: Record<string, TodoEntry>;
}

export interface AssignmentRecord {
  owner: string | null;
  ticket: string | null;
  updatedAt: string;
}

export interface OverlayFile {
  version: number;
  assignments: Record<string, AssignmentRecord>;
  ignored: string[];  // T-IDs or substring patterns
}

export interface Config {
  scan: {
    exclude: string[];
    includeExtensions: string[];
    customTags: string[];
  };
  tags: Record<string, { severity: 'high' | 'medium' | 'low' }>;
}

export interface FilterOptions {
  type?: string[];
  author?: string;
  unowned?: boolean;
  file?: string;
  since?: string;
  ticket?: string;
  format?: OutputFormat;
  exitCode?: boolean;
}

export type OutputFormat = 'table' | 'json' | 'markdown' | 'editor';

export interface CommandContext {
  repoRoot: string;
  todoDir: string;
  cachePath: string;
  overlayPath: string;
}

export interface EffectiveTodo extends TodoEntry {
  effectiveOwner: string | null;
  effectiveTicket: string | null;
}

export function toEffective(todo: TodoEntry, overlay: OverlayFile): EffectiveTodo {
  const assignment = overlay.assignments[todo.id];
  return {
    ...todo,
    effectiveOwner: assignment?.owner ?? todo.parsedOwner,
    effectiveTicket: assignment?.ticket ?? todo.ticket,
  };
}
