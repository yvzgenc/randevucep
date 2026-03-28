import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import type { CommandContext } from '../types';

interface GitHookOptions {
  install?: boolean;
  uninstall?: boolean;
}

const HOOK_MARKER = '# todo-cli managed';

const HOOK_BODY = `#!/bin/sh
${HOOK_MARKER}
# Blocks commits when unowned TODO items exist.
# Installed by: todo git-hook install
# Remove with:  todo git-hook --uninstall

if command -v node >/dev/null 2>&1; then
  node "$(git rev-parse --show-toplevel)/tools/todo-cli/dist/index.js" scan --exit-code --quiet
  STATUS=$?
  if [ $STATUS -ne 0 ]; then
    echo ""
    echo "  Commit blocked: unowned TODO items found."
    echo "  Run \`todo list --unowned\` to see them, then assign with \`todo assign <id> --to <owner>\`."
    echo "  To skip this check: git commit --no-verify"
    echo ""
    exit 1
  fi
fi
`;

export function gitHookCommand(ctx: CommandContext, opts: GitHookOptions): void {
  const hooksDir  = path.join(ctx.repoRoot, '.git', 'hooks');
  const hookFile  = path.join(hooksDir, 'pre-commit');

  if (!fs.existsSync(path.join(ctx.repoRoot, '.git'))) {
    console.error(chalk.red('  Error: Not a git repository.'));
    process.exit(1);
  }

  // ── Uninstall ───────────────────────────────────────────────────────────────
  if (opts.uninstall) {
    if (!fs.existsSync(hookFile)) {
      console.log(chalk.dim('  No pre-commit hook found.'));
      return;
    }
    const content = fs.readFileSync(hookFile, 'utf8');
    if (!content.includes(HOOK_MARKER)) {
      console.log(chalk.yellow('  pre-commit hook exists but was not installed by todo-cli. Skipping removal.'));
      console.log(chalk.dim(`  Hook file: ${hookFile}`));
      return;
    }
    fs.unlinkSync(hookFile);
    console.log(chalk.green('  ✓') + '  pre-commit hook removed.');
    return;
  }

  // ── Install ─────────────────────────────────────────────────────────────────
  if (!opts.install) {
    console.error(chalk.red('  Error: provide --install or --uninstall'));
    process.exit(1);
  }

  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  if (fs.existsSync(hookFile)) {
    const existing = fs.readFileSync(hookFile, 'utf8');
    if (existing.includes(HOOK_MARKER)) {
      console.log(chalk.dim('  pre-commit hook already installed by todo-cli.'));
      return;
    }
    // Preserve existing hook — append our check
    const merged = existing.trimEnd() + '\n\n' + HOOK_BODY;
    fs.writeFileSync(hookFile, merged, { mode: 0o755 });
    console.log(chalk.green('  ✓') + '  Appended todo-cli check to existing pre-commit hook.');
  } else {
    fs.writeFileSync(hookFile, HOOK_BODY, { mode: 0o755 });
    console.log(chalk.green('  ✓') + '  Installed pre-commit hook.');
  }

  console.log(chalk.dim(`  Hook file: ${hookFile}`));
  console.log(chalk.dim('  Commits will be blocked when unowned TODO items exist.'));
  console.log(chalk.dim('  Remove with: todo git-hook --uninstall'));
}
