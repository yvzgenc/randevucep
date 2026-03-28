import { execSync } from 'child_process';

function run(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

export function getRepoRoot(cwd: string): string | null {
  const r = run('git rev-parse --show-toplevel', cwd);
  return r || null;
}

export function isGitRepo(cwd: string): boolean {
  return !!run('git rev-parse --git-dir', cwd);
}

export function getCurrentCommit(repoRoot: string): string | null {
  const r = run('git rev-parse HEAD', repoRoot);
  return r || null;
}

export function getChangedFiles(repoRoot: string, fromCommit: string): string[] {
  const committed = run(`git diff --name-only "${fromCommit}" HEAD`, repoRoot);
  const staged = run('git diff --name-only HEAD', repoRoot);
  const untracked = run('git ls-files --others --exclude-standard', repoRoot);
  const all = [
    ...committed.split('\n').filter(Boolean),
    ...staged.split('\n').filter(Boolean),
    ...untracked.split('\n').filter(Boolean),
  ];
  return [...new Set(all)];
}
