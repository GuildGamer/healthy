import { prisma } from '../src/index';

/**
 * Disposable seed data for local/E2E environments.
 * Safe to re-run: waitlist email is upserted.
 */
async function main(): Promise<void> {
  await prisma.waitlistEntry.upsert({
    where: { email: 'seed@example.com' },
    create: {
      email: 'seed@example.com',
      source: 'seed',
    },
    update: {
      source: 'seed',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete: waitlist seed@example.com');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
