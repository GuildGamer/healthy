import type { PostAuthHref } from './post-auth-route';

type CachedTabsGate = {
  userId: string;
  href: PostAuthHref;
};

/** In-memory only — survives layout remounts within the same JS process. */
let cachedGate: CachedTabsGate | null = null;

export function getCachedTabsGate(userId: string): PostAuthHref | null {
  if (!cachedGate || cachedGate.userId !== userId) {
    return null;
  }

  return cachedGate.href;
}

export function setCachedTabsGate(userId: string, href: PostAuthHref): void {
  cachedGate = { userId, href };
}

export function clearCachedTabsGate(): void {
  cachedGate = null;
}

/** Test helper — resets process-local cache between cases. */
export function resetTabsGateCacheForTests(): void {
  cachedGate = null;
}
