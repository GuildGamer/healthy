import { flushPendingCompletions } from '@/lib/completion-sync';

/**
 * OS-scheduled flush for queued sets. Needs a store / dev-client binary that
 * includes `expo-background-task` — OTA cannot add it. Stale binaries skip
 * registration and rely on foreground / reconnect flush instead.
 */
export const COMPLETION_BACKGROUND_TASK = 'healthy-completion-sync';

let didDefineTask = false;

function defineTaskIfPossible(): boolean {
  if (didDefineTask) {
    return true;
  }

  try {
    // Lazy require so an OTA on a binary without the native module still boots.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');

    TaskManager.defineTask(COMPLETION_BACKGROUND_TASK, async () => {
      try {
        await flushPendingCompletions();
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
    didDefineTask = true;
    return true;
  } catch {
    return false;
  }
}

/** Registers the task once per install. Safe to call on every launch. */
export async function registerCompletionBackgroundSync(): Promise<void> {
  if (!defineTaskIfPossible()) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');

    const isRegistered = await TaskManager.isTaskRegisteredAsync(COMPLETION_BACKGROUND_TASK);
    if (isRegistered) {
      return;
    }

    await BackgroundTask.registerTaskAsync(COMPLETION_BACKGROUND_TASK, {
      // OS may wait longer; this is the earliest we ask for another run.
      minimumInterval: 15,
    });
  } catch {
    // Missing native module or restricted OS status — foreground sync covers it.
  }
}

// Define at module load when the native module exists (store / dev builds).
defineTaskIfPossible();
