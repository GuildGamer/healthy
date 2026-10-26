/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Turbo runs this beside the API suite and a dev server is often running too;
  // render-heavy tests need headroom over Jest's 5 s default on a busy machine.
  maxWorkers: '50%',
  testTimeout: 15_000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@product/brand$': '<rootDir>/../../packages/brand/src/index.ts',
    '^@product/client$': '<rootDir>/../../packages/client/src/index.ts',
    '^@product/contract/country-code$':
      '<rootDir>/../../packages/contract/src/country-code.ts',
    '^@product/contract/display-name$':
      '<rootDir>/../../packages/contract/src/display-name.ts',
    '^@product/contract/challenge-title$':
      '<rootDir>/../../packages/contract/src/challenge-title.ts',
    '^@product/contract/challenge-sort$':
      '<rootDir>/../../packages/contract/src/challenge-sort.ts',
    '^@product/contract/challenge-capture$':
      '<rootDir>/../../packages/contract/src/challenge-capture.ts',
    '^@product/contract/match-board$':
      '<rootDir>/../../packages/contract/src/match-board.ts',
    '^@product/contract/account-deletion$':
      '<rootDir>/../../packages/contract/src/account-deletion.ts',
    '^@product/contract/proof-clip-limits$':
      '<rootDir>/../../packages/contract/src/proof-clip-limits.ts',
    '^@product/contract/proof-code$': '<rootDir>/../../packages/contract/src/proof-code.ts',
    '^@product/contract$': '<rootDir>/../../packages/contract/src/index.ts',
    '\\.tflite$': '<rootDir>/jest.tflite-mock.js',
  },
  // Empty ignore list forces Babel to transform pnpm-nested Expo/RN packages.
  transformIgnorePatterns: [
    '/node_modules/react-native-reanimated/plugin/',
  ],
};
