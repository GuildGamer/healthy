import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    globalSetup: ['test/integration-setup.ts'],
    // One database, and each file truncates it — running files in parallel
    // would let them wipe each other's rows mid-test.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
