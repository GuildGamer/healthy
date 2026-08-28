import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load before importing the client — static imports are hoisted, so use dynamic import.
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env'),
});

const { prisma } = await import('../src/index.js');

const challengeSeeds = [
  {
    slug: 'check-blood-pressure',
    title: 'Check your blood pressure',
    description: 'Measure and log your blood pressure reading.',
    category: 'hypertension' as const,
    rewardPoints: 200,
  },
  {
    slug: 'take-morning-medication',
    title: 'Take morning medication',
    description: 'Take your prescribed medication for the day.',
    category: 'hypertension' as const,
    rewardPoints: 150,
  },
  {
    slug: 'log-water-intake',
    title: 'Log your water intake',
    description: 'Track how much water you drank today.',
    category: 'general' as const,
    rewardPoints: 100,
  },
  {
    slug: 'glucose-check',
    title: 'Check blood glucose',
    description: 'Record a fasting or mealtime glucose reading.',
    category: 'diabetes' as const,
    rewardPoints: 200,
  },
  {
    slug: 'asthma-inhaler-check',
    title: 'Inhaler adherence check',
    description: 'Confirm you used your preventer inhaler as prescribed.',
    category: 'asthma' as const,
    rewardPoints: 150,
  },
];

/**
 * Disposable seed data for local/E2E environments.
 * Safe to re-run: waitlist email and challenge slugs are upserted.
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

  for (const challenge of challengeSeeds) {
    await prisma.challenge.upsert({
      where: { slug: challenge.slug },
      create: challenge,
      update: {
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        rewardPoints: challenge.rewardPoints,
        isActive: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete: waitlist seed@example.com, ${challengeSeeds.length} challenges`,
  );
}

try {
  await main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
