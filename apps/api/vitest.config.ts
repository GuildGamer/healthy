import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only. Integration tests need Postgres and run from
    // vitest.integration.config.ts via `pnpm test:integration`.
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'src/**/*.integration.test.ts'],
  },
});
