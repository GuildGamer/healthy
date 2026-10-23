/**
 * Overwrites the lock-screen SwiftUI that `expo-live-activity` generates with
 * Healthy's deck-style card (eyebrow, Pause/Resume).
 *
 * `expo-live-activity` writes its stock Swift during the `xcodeproj` mod, and
 * Expo always runs `dangerous` mods before that, so this copy must be a
 * `finalized` mod or the stock files win. The Xcode project already lists
 * files with these names; only their contents change.
 */
const { createRunOncePlugin, withFinalizedMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_FILES = ['LiveActivityView.swift', 'LiveActivityWidget.swift'];

function copyWalkLiveActivitySwift(platformProjectRoot) {
  const destinationDir = path.join(platformProjectRoot, 'LiveActivity');
  if (!fs.existsSync(destinationDir)) {
    throw new Error(
      `[walk-live-activity] ${destinationDir} is missing. expo-live-activity must be listed before this plugin.`,
    );
  }

  const sourceDir = path.join(__dirname, 'ios-files');
  for (const fileName of WIDGET_FILES) {
    fs.copyFileSync(path.join(sourceDir, fileName), path.join(destinationDir, fileName));
  }
}

function withWalkLiveActivity(config) {
  return withFinalizedMod(config, [
    'ios',
    async (modConfig) => {
      copyWalkLiveActivitySwift(modConfig.modRequest.platformProjectRoot);
      return modConfig;
    },
  ]);
}

module.exports = createRunOncePlugin(withWalkLiveActivity, 'walk-live-activity', '0.0.4');
