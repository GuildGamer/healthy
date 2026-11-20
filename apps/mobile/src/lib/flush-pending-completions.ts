/**
 * @deprecated Import from `@/lib/completion-sync` — kept so existing call sites
 * and tests keep resolving during the cutover.
 */
export {
  flushPendingCompletions,
  resetFlushPendingCompletionsLock,
  classifySyncError,
  nextBackoffMs,
} from './completion-sync';
