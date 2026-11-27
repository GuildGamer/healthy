import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(import.meta.dirname, '../../..');
const ALLOWED_PREFIXES = [
  'modules/shared-modules/push/',
  'modules/shared-modules/engagement/',
];

function listSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = join(directory, entry);
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') {
        continue;
      }
      files.push(...listSourceFiles(absolute));
      continue;
    }

    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(absolute);
    }
  }

  return files;
}

describe('PUSH_SENDER boundary', () => {
  it('is only referenced from push and engagement modules', () => {
    const offenders = listSourceFiles(SRC_ROOT).filter((absolute) => {
      const relativePath = relative(SRC_ROOT, absolute).replaceAll('\\', '/');
      if (ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
        return false;
      }

      const contents = readFileSync(absolute, 'utf8');
      return contents.includes('PUSH_SENDER');
    });

    expect(offenders.map((absolute) => relative(SRC_ROOT, absolute))).toEqual(
      [],
    );
  });
});
