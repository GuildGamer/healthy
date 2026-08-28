const { getDefaultConfig } = require('expo/metro-config');

// SDK 52+ Expo auto-configures monorepo watchFolders / resolution.
// Do not set disableHierarchicalLookup — that breaks pnpm transitive deps.
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
