/**
 * In-memory “this user may enter tabs” flag.
 *
 * Survives layout remounts within the same JS process. Never stores one-shot
 * routes (`/match/…`, onboarding) — those must not bounce the user back after
 * they leave a group board.
 */
let allowedUserId: string | null = null;

export function isTabsGateAllowed(userId: string): boolean {
  return allowedUserId === userId;
}

export function markTabsGateAllowed(userId: string): void {
  allowedUserId = userId;
}

export function clearCachedTabsGate(): void {
  allowedUserId = null;
}

/** Test helper — resets process-local cache between cases. */
export function resetTabsGateCacheForTests(): void {
  allowedUserId = null;
}

/**
 * Apply a post-auth resolve result to the tabs gate.
 * Only `/(tabs)` marks the process-local allowed flag.
 */
export function applyTabsGateResolve(
  userId: string,
  href: string,
): { markAllowed: boolean } {
  if (href === '/(tabs)') {
    markTabsGateAllowed(userId);
    return { markAllowed: true };
  }

  return { markAllowed: false };
}
