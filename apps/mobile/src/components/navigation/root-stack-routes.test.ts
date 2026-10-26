import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const APP_DIR = join(__dirname, '../../../app');
const ROOT_LAYOUT = readFileSync(join(APP_DIR, '_layout.tsx'), 'utf8');
const SCREEN_PATTERN = /<Stack\.Screen\s+name="([^"]+)"([\s\S]*?)\/>/g;

/** Every route the root stack owns: files, or a folder that brings its own layout. */
function rootStackRoutes(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (entry.startsWith('_') || entry.startsWith('+')) {
      return [];
    }

    if (statSync(path).isDirectory()) {
      return existsSync(join(path, '_layout.tsx'))
        ? [relative(APP_DIR, path)]
        : rootStackRoutes(path);
    }

    return entry.endsWith('.tsx') ? [relative(APP_DIR, path).replace(/\.tsx$/, '')] : [];
  });
}

function registeredScreens(): Map<string, string> {
  return new Map(
    [...ROOT_LAYOUT.matchAll(SCREEN_PATTERN)].map((match) => [match[1]!, match[2]!]),
  );
}

/**
 * The root stack draws a native "Back / Healthy" header by default, and every
 * page draws its own `DeckPageNav`. A route left out of `_layout.tsx` shows both.
 */
describe('root stack routes', () => {
  it('registers every route file', () => {
    const registered = registeredScreens();
    const missing = rootStackRoutes(APP_DIR).filter((route) => !registered.has(route));

    expect(missing).toEqual([]);
  });

  it('hides the native header on every registered route', () => {
    const withNativeHeader = [...registeredScreens()]
      .filter(([, options]) => !/headerShown: false|_SCREEN_OPTIONS/.test(options))
      .map(([name]) => name);

    expect(withNativeHeader).toEqual([]);
  });
});
