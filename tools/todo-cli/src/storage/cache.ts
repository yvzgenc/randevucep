import * as fs from 'fs';
import type { CacheFile } from '../types';

const CURRENT_VERSION = 1;

function blank(): CacheFile {
  return { version: CURRENT_VERSION, repoRoot: '', lastCommit: null, lastScanAt: null, entries: {} };
}

export function readCache(cachePath: string): CacheFile {
  if (!fs.existsSync(cachePath)) return blank();
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return migrate(raw);
  } catch {
    return blank();
  }
}

export function writeCache(cachePath: string, cache: CacheFile): void {
  const tmp = cachePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, cachePath);
}

function migrate(raw: any): CacheFile {
  if (!raw || typeof raw !== 'object') return blank();
  return {
    version: CURRENT_VERSION,
    repoRoot: raw.repoRoot ?? '',
    lastCommit: raw.lastCommit ?? null,
    lastScanAt: raw.lastScanAt ?? null,
    entries: raw.entries ?? {},
  };
}
