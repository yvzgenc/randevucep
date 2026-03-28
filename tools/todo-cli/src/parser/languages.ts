export interface Language {
  id: string;
  extensions: string[];
  lineComments: string[];
  blockComments: [string, string][];
}

export const LANGUAGES: Language[] = [
  {
    id: 'ts',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'css',
    extensions: ['.css', '.scss', '.sass', '.less'],
    lineComments: [],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'html',
    extensions: ['.html', '.htm', '.vue', '.svelte'],
    lineComments: [],
    blockComments: [['<!--', '-->']],
  },
  {
    id: 'py',
    extensions: ['.py'],
    lineComments: ['#'],
    blockComments: [['"""', '"""'], ["'''", "'''"]],
  },
  {
    id: 'go',
    extensions: ['.go'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'rs',
    extensions: ['.rs'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'c',
    extensions: ['.c', '.cpp', '.h', '.hpp', '.cs', '.java', '.kt', '.swift'],
    lineComments: ['//'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'sql',
    extensions: ['.sql'],
    lineComments: ['--'],
    blockComments: [['/*', '*/']],
  },
  {
    id: 'sh',
    extensions: ['.sh', '.bash', '.zsh', '.fish'],
    lineComments: ['#'],
    blockComments: [],
  },
  {
    id: 'rb',
    extensions: ['.rb'],
    lineComments: ['#'],
    blockComments: [],
  },
  {
    id: 'conf',
    extensions: ['.toml', '.ini', '.cfg', '.conf', '.yaml', '.yml'],
    lineComments: ['#'],
    blockComments: [],
  },
];

export function getLanguage(ext: string): Language | null {
  return LANGUAGES.find(l => l.extensions.includes(ext.toLowerCase())) ?? null;
}

export const SUPPORTED_EXTENSIONS: string[] = LANGUAGES.flatMap(l => l.extensions);
