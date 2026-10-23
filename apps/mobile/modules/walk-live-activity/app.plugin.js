/**
 * After `expo-live-activity` generates the widget extension, overwrite the
 * lock-screen SwiftUI with Healthy’s deck-style card (eyebrow, Pause/Resume).
 * Listing this plugin only once, and after `expo-live-activity`, avoids a
 * second Xcode target.
 */
const {
  createRunOncePlugin,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_FILES = ['LiveActivityView.swift', 'LiveActivityWidget.swift'];

function copyWalkLiveActivitySwift(projectRoot) {
  const destinationDir = path.join(projectRoot, 'ios', 'LiveActivity');
  if (!fs.existsSync(destinationDir)) {
    return;
  }

  const sourceDir = path.join(__dirname, 'ios-files');
  for (const fileName of WIDGET_FILES) {
    const source = path.join(sourceDir, fileName);
    const destination = path.join(destinationDir, fileName);
    if (!fs.existsSync(source)) {
      continue;
    }
    fs.copyFileSync(source, destination);
  }
}

function withWalkLiveActivity(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      copyWalkLiveActivitySwift(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withWalkLiveActivity,
  'walk-live-activity',
  '0.0.3',
);
