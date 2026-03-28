import * as fs from 'fs';
import type { OverlayFile } from '../types';

const CURRENT_VERSION = 1;

function blank(): OverlayFile {
  return { version: CURRENT_VERSION, assignments: {}, ignored: [] };
}

export function readOverlay(overlayPath: string): OverlayFile {
  if (!fs.existsSync(overlayPath)) return blank();
  try {
    const raw = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
    return {
      version: CURRENT_VERSION,
      assignments: raw.assignments ?? {},
      ignored: raw.ignored ?? [],
    };
  } catch {
    return blank();
  }
}

export function writeOverlay(overlayPath: string, overlay: OverlayFile): void {
  const tmp = overlayPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(overlay, null, 2));
  fs.renameSync(tmp, overlayPath);
}
