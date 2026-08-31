/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@product/brand$': '<rootDir>/../../packages/brand/src/index.ts',
    '^@product/client$': '<rootDir>/../../packages/client/src/index.ts',
    '^@product/contract/country-code$':
      '<rootDir>/../../packages/contract/src/country-code.ts',
    '^@product/contract$': '<rootDir>/../../packages/contract/src/index.ts',
    '\\.tflite$': '<rootDir>/jest.tflite-mock.js',
  },
  // Empty ignore list forces Babel to transform pnpm-nested Expo/RN packages.
  transformIgnorePatterns: [
    '/node_modules/react-native-reanimated/plugin/',
  ],
};
