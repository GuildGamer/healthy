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
const contractSubpathSources = Object.fromEntries(
  [
    'country-code',
    'display-name',
    'challenge-title',
    'challenge-sort',
    'challenge-capture',
    'match-board',
    'account-deletion',
  ].map((subpath) => [
    `@product/contract/${subpath}`,
    path.resolve(__dirname, `../../packages/contract/src/${subpath}.ts`),
  ]),
);

const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const contractSource = contractSubpathSources[moduleName];
  if (contractSource) {
    return { type: 'sourceFile', filePath: contractSource };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
