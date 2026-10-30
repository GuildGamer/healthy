const DYNAMIC_PARENTS = new Set([
  'matches',
  'match',
  'challenge',
  'history',
  'proof',
  'v',
]);

const STATIC_SEGMENTS = new Set([
  'index',
  'pose',
  'walk',
  'session',
  'practice',
  'log',
  'confirm',
  'verify',
  'evidence',
  'history',
  'result',
  'create',
  'past',
]);

/**
 * Collapse dynamic segments so analytics never stores tokens or ids.
 * `matches/cm…` → `matches/[matchId]`.
 */
export function screenPatternFromPath(pathname: string): string {
  const trimmed = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed) {
    return 'index';
  }

  const parts = trimmed.split('/');
  const patterned = parts.map((part, index) => {
    if (part.startsWith('(') && part.endsWith(')')) {
      return part;
    }

    const parent = parts[index - 1];
    if (
      index > 0 &&
      parent &&
      DYNAMIC_PARENTS.has(parent) &&
      !STATIC_SEGMENTS.has(part) &&
      !part.startsWith('(')
    ) {
      return paramNameForParent(parent);
    }

    return part;
  });

  return patterned.join('/');
}

function paramNameForParent(parent: string): string {
  switch (parent) {
    case 'matches':
    case 'match':
      return '[matchId]';
    case 'challenge':
      return '[challengeId]';
    case 'history':
      return '[dayKey]';
    case 'proof':
    case 'v':
      return '[code]';
    default:
      return '[id]';
  }
}
