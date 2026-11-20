const SESSION_IDLE_MS = 30 * 60 * 1000;

let sessionId = createSessionId();
let lastBackgroundAt: number | null = null;

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsSessionId(): string {
  return sessionId;
}

/** Call when the app leaves the foreground. */
export function markAnalyticsSessionBackground(): void {
  lastBackgroundAt = Date.now();
}

/**
 * Call when the app returns to the foreground. Starts a new session after
 * 30 minutes idle. Returns whether this was a cold/new session start.
 */
export function resumeAnalyticsSession(): { sessionId: string; isNew: boolean } {
  const idleMs =
    lastBackgroundAt == null ? Number.POSITIVE_INFINITY : Date.now() - lastBackgroundAt;
  lastBackgroundAt = null;

  if (idleMs >= SESSION_IDLE_MS) {
    sessionId = createSessionId();
    return { sessionId, isNew: true };
  }

  return { sessionId, isNew: false };
}

/** Test-only: reset module state. */
export function __resetAnalyticsSessionForTests(): void {
  sessionId = createSessionId();
  lastBackgroundAt = null;
}
