/**
 * Boots the compiled AppModule far enough to catch Nest DI failures without
 * binding a port. Run after `pnpm exec nest build` from apps/api:
 *   node scripts/smoke-boot.mjs
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
config({ path: resolve(root, '.env') });

const require = createRequire(import.meta.url);

await import('reflect-metadata');
const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../dist/app.module.js');

const app = await NestFactory.create(AppModule, {
  bodyParser: false,
  logger: ['error', 'warn'],
});
await app.init();
await app.close();
console.log('SMOKE_BOOT_OK');
