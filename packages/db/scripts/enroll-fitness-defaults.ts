/**
 * One-off backfill: enroll every existing user in active fitness defaults
 * (isDefault + isActive + category general). Idempotent via skipDuplicates.
 * Does not seed reminders — those are opt-in after the reminders intro.
 *
 *   pnpm --filter @product/db exec tsx scripts/enroll-fitness-defaults.ts
 */
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env'),
});

const { getPrisma } = await import('../src/index.js');
const prisma = getPrisma();

async function main(): Promise<void> {
  const defaults = await prisma.challenge.findMany({
    where: { isActive: true, isDefault: true, category: 'general' },
    select: { id: true, defaultFrequency: true },
  });

  if (defaults.length === 0) {
    console.log('No active fitness defaults found. Nothing to enroll.');
    return;
  }

  const users = await prisma.user.findMany({ select: { id: true } });
  let created = 0;

  for (const user of users) {
    const result = await prisma.challengeEnrollment.createMany({
      data: defaults.map((challenge) => ({
        userId: user.id,
        challengeId: challenge.id,
        frequency: challenge.defaultFrequency,
      })),
      skipDuplicates: true,
    });
    created += result.count;
  }

  // Ensure profiles have at least `general` so catalog scope stays consistent.
  await prisma.$executeRaw`
    UPDATE "user_profiles"
    SET "healthCategories" = ARRAY['general']::"HealthCategory"[]
    WHERE cardinality("healthCategories") = 0
  `;

  console.log(
    `Enrolled ${created} new rows across ${users.length} users into ${defaults.length} defaults.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
