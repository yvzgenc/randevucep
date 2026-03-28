import { execSync } from 'child_process';

export interface BlameResult {
  author: string;
  date: string;
  commitHash: string;
}

// Session-level cache
const cache = new Map<string, BlameResult | null>();

export function getBlame(repoRoot: string, relFile: string, line: number): BlameResult | null {
  const key = `${relFile}:${line}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const out = execSync(
      `git blame -L ${line},${line} --porcelain -- "${relFile.replace(/\\/g, '/')}"`,
      { cwd: repoRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const lines = out.trim().split('\n');
    const commitHash = lines[0]?.split(' ')[0] ?? '';
    if (!commitHash || commitHash === '0'.repeat(40)) {
      cache.set(key, null);
      return null;
    }
    const authorLine = lines.find(l => l.startsWith('author '));
    const timeLine = lines.find(l => l.startsWith('author-time '));
    if (!authorLine) { cache.set(key, null); return null; }

    const author = authorLine.slice('author '.length).trim();
    const ts = timeLine ? parseInt(timeLine.slice('author-time '.length).trim(), 10) : 0;
    const date = ts ? new Date(ts * 1000).toISOString().split('T')[0] : '';

    const result: BlameResult = { author, date, commitHash: commitHash.slice(0, 7) };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
