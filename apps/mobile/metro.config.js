const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// SDK 52+ Expo auto-configures monorepo watchFolders / resolution.
// Do not set disableHierarchicalLookup — that breaks pnpm transitive deps.
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const contractSrcRoot = path.resolve(__dirname, '../../packages/contract/src');

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
    'proof-clip-limits',
    'proof-code',
  ].map((subpath) => [
    `@product/contract/${subpath}`,
    path.join(contractSrcRoot, `${subpath}.ts`),
  ]),
);

/**
 * Contract sources use NodeNext-style `./foo.js` imports. Metro remaps package
 * subpaths to `packages/contract/src/*.ts`, so those relatives must resolve to
 * the sibling `.ts` file (dist/ is gitignored and absent on EAS).
 */
function resolveContractSrcJsImport(originModulePath, moduleName) {
  if (
    !originModulePath ||
    !moduleName.startsWith('.') ||
    !moduleName.endsWith('.js') ||
    path.dirname(originModulePath) !== contractSrcRoot
  ) {
    return null;
  }
  const candidate = path.resolve(
    path.dirname(originModulePath),
    `${moduleName.slice(0, -'.js'.length)}.ts`,
  );
  if (!candidate.startsWith(contractSrcRoot + path.sep) || !fs.existsSync(candidate)) {
    return null;
  }
  return { type: 'sourceFile', filePath: candidate };
}

const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const contractSource = contractSubpathSources[moduleName];
  if (contractSource) {
    return { type: 'sourceFile', filePath: contractSource };
  }
  const contractRelative = resolveContractSrcJsImport(
    context.originModulePath,
    moduleName,
  );
  if (contractRelative) {
    return contractRelative;
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
