/**
 * Clears expo-task-manager's persisted task registry before React Native
 * loads. Older Android binaries registered walk location tasks; those prefs
 * survive Auto Backup / reinstall while location permission does not. On the
 * next launch TaskService.restoreTasks starts a location foreground service
 * and Android 14+ kills the process with an uncatchable SecurityException —
 * before any JS (including ensureWalkLocationTaskStopped) can run.
 *
 * Current JS never registers TaskManager location tasks on Android
 * (useWalkRecorder.ts and walk-offer-monitor.ts return early). Deleting the
 * prefs every launch is therefore safe. Remove this plugin if Android ever
 * registers TaskManager tasks again.
 */
const { createRunOncePlugin, withMainApplication } = require('expo/config-plugins');

const TASK_MANAGER_PREFS = 'TaskManagerModule';
const RESET_LINE = `deleteSharedPreferences("${TASK_MANAGER_PREFS}")`;
const ANCHOR = 'super.onCreate()';

/**
 * Inserts the prefs wipe after `super.onCreate()` and before `loadReactNative`.
 * Idempotent. Throws when the anchor is missing so a template change fails the
 * build instead of shipping without the fix.
 *
 * @param {string} contents
 * @returns {string}
 */
function injectStaleLocationTaskReset(contents) {
  if (contents.includes(RESET_LINE)) {
    return contents;
  }

  const anchorIndex = contents.indexOf(ANCHOR);
  if (anchorIndex === -1) {
    throw new Error(
      `[with-stale-location-task-reset] Expected "${ANCHOR}" in MainApplication so the TaskManager wipe can run before loadReactNative.`,
    );
  }

  const lineStart = contents.lastIndexOf('\n', anchorIndex) + 1;
  const indent = contents.slice(lineStart, anchorIndex).match(/^[ \t]*/)?.[0] ?? '    ';
  const insertion = `\n${indent}${RESET_LINE}`;
  const insertAt = anchorIndex + ANCHOR.length;

  return `${contents.slice(0, insertAt)}${insertion}${contents.slice(insertAt)}`;
}

function withStaleLocationTaskReset(config) {
  return withMainApplication(config, (modConfig) => {
    modConfig.modResults.contents = injectStaleLocationTaskReset(modConfig.modResults.contents);
    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withStaleLocationTaskReset,
  'with-stale-location-task-reset',
  '1.0.0',
);
module.exports.injectStaleLocationTaskReset = injectStaleLocationTaskReset;
module.exports.RESET_LINE = RESET_LINE;
