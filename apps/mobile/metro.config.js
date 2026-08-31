const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// SDK 52+ Expo auto-configures monorepo watchFolders / resolution.
// Do not set disableHierarchicalLookup — that breaks pnpm transitive deps.
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Bundle TensorFlow Lite models for on-device MoveNet.
config.resolver.assetExts.push('tflite');

// Metro does not reliably honor package.json "exports" subpaths for workspace
// packages. Jest maps this the same way in jest.config.js.
const countryCodeSource = path.resolve(
  __dirname,
  '../../packages/contract/src/country-code.ts',
);
const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@product/contract/country-code') {
    return { type: 'sourceFile', filePath: countryCodeSource };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
