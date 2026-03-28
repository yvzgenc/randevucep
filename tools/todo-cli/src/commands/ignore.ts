import chalk from 'chalk';
import type { CommandContext } from '../types';
import { readOverlay, writeOverlay } from '../storage/overlay';

interface IgnoreOptions {
  pattern?: string;
  list?: boolean;
  remove?: string;
}

export function ignoreCommand(ctx: CommandContext, opts: IgnoreOptions): void {
  const overlay = readOverlay(ctx.overlayPath);

  if (opts.list) {
    const patterns = overlay.ignored;
    if (patterns.length === 0) {
      console.log(chalk.dim('  No ignored patterns.'));
    } else {
      console.log('\n  ' + chalk.bold('Ignored patterns:'));
      for (const p of patterns) {
        console.log('  · ' + chalk.yellow(p));
      }
      console.log('');
    }
    return;
  }

  if (opts.remove) {
    const before = overlay.ignored.length;
    overlay.ignored = overlay.ignored.filter(p => p !== opts.remove);
    if (overlay.ignored.length < before) {
      writeOverlay(ctx.overlayPath, overlay);
      console.log(chalk.green('  ✓') + `  Removed: ${opts.remove}`);
    } else {
      console.log(chalk.yellow(`  Pattern '${opts.remove}' not found in ignore list.`));
    }
    return;
  }

  if (!opts.pattern) {
    console.error(chalk.red('  Error: provide --pattern <pattern>, --list, or --remove <pattern>'));
    process.exit(1);
  }

  const p = opts.pattern;
  if (overlay.ignored.includes(p)) {
    console.log(chalk.dim(`  '${p}' is already ignored.`));
    return;
  }

  overlay.ignored.push(p);
  writeOverlay(ctx.overlayPath, overlay);

  const isId = /^T-[A-F0-9]{6}$/.test(p);
  if (isId) {
    console.log(chalk.green('  ✓') + `  Ignoring ID: ${chalk.yellow(p)}`);
  } else {
    console.log(chalk.green('  ✓') + `  Ignoring pattern: ${chalk.yellow(p)} (matches file paths and messages)`);
  }
  console.log(chalk.dim(`  Use \`todo ignore --remove "${p}"\` to undo.`));
}
