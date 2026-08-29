import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/load-env.js';
import { testDatabaseUrl } from './integration-db.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * `migrate deploy` creates the database when it is missing, so this doubles as
 * first-run provisioning. Replaying the committed migrations rather than
 * pushing the schema also proves the migration history still builds a
 * working database.
 */
export default function setup(): void {
  execFileSync(
    'pnpm',
    ['--filter', '@product/db', 'exec', 'prisma', 'migrate', 'deploy'],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
      stdio: 'inherit',
    },
  );
}
