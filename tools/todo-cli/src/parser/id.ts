import * as crypto from 'crypto';
import * as path from 'path';

export function computeId(file: string, tag: string, message: string, suffix = ''): string {
  const key = [
    file.replace(/\\/g, '/'),
    tag.toUpperCase(),
    message.trim(),
    suffix,
  ].join(':');
  const hash = crypto.createHash('sha256').update(key, 'utf8').digest('hex');
  return 'T-' + hash.slice(0, 6).toUpperCase();
}

export function toRepoRelative(absPath: string, repoRoot: string): string {
  const norm = absPath.replace(/\\/g, '/');
  const base = repoRoot.replace(/\\/g, '/').replace(/\/?$/, '/');
  const rel = norm.startsWith(base) ? norm.slice(base.length) : path.relative(repoRoot, absPath).replace(/\\/g, '/');
  return rel;
}
