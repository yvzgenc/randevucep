import * as fs from 'fs';
import * as path from 'path';
import type { Config } from './types';
import { SUPPORTED_EXTENSIONS } from './parser/languages';

export const DEFAULT_CONFIG: Config = {
  scan: {
    exclude: [
      'node_modules', '.git', 'dist', '.next', 'build', 'out',
      '.turbo', 'coverage', '.todo', '.cache', '__pycache__',
    ],
    includeExtensions: SUPPORTED_EXTENSIONS,
    customTags: [],
  },
  tags: {
    TODO:     { severity: 'medium' },
    FIXME:    { severity: 'high' },
    HACK:     { severity: 'medium' },
    NOTE:     { severity: 'low' },
    XXX:      { severity: 'high' },
    OPTIMIZE: { severity: 'low' },
  },
};

export function loadConfig(todoDir: string): Config {
  const configPath = path.join(todoDir, 'config.json');
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;
  try {
    const user = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
      scan: { ...DEFAULT_CONFIG.scan, ...user.scan },
      tags: { ...DEFAULT_CONFIG.tags, ...user.tags },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function ensureTodoDir(repoRoot: string): string {
  const todoDir = path.join(repoRoot, '.todo');
  if (!fs.existsSync(todoDir)) fs.mkdirSync(todoDir, { recursive: true });
  const gi = path.join(todoDir, '.gitignore');
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, 'cache.json\n');
  return todoDir;
}
