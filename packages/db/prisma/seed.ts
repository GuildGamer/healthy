import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load before importing the client — static imports are hoisted, so use dynamic import.
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env'),
});

const { prisma } = await import('../src/index.js');

type ChallengeSeed = {
  slug: string;
  title: string;
  description: string;
  category: 'hypertension' | 'diabetes' | 'asthma' | 'general';
  rewardPoints: number;
  defaultFrequency: 'daily' | 'weekly' | 'monthly';
  /** Enrolled automatically when a user picks this category. */
  isDefault: boolean;
  completionKind?: 'check_in' | 'vitals_bp';
  instruction?: string;
};

/**
 * Stands in for an admin-managed catalog. Each category needs a starter set
 * plus optional extras, otherwise the challenge picker has nothing to offer.
 */
const challengeSeeds: ChallengeSeed[] = [
  {
    slug: 'check-blood-pressure',
    title: 'Check your blood pressure',
    description: 'Measure and log your blood pressure reading.',
    category: 'hypertension',
    rewardPoints: 200,
    defaultFrequency: 'daily',
    isDefault: true,
    completionKind: 'vitals_bp',
    instruction:
      'Sit still for a minute, then measure and log your systolic and diastolic reading.',
  },
  {
    slug: 'take-morning-medication',
    title: 'Take morning medication',
    description: 'Take your prescribed medication for the day.',
    category: 'hypertension',
    rewardPoints: 150,
    defaultFrequency: 'daily',
    isDefault: true,
  },
  {
    slug: 'low-sodium-meal',
    title: 'Eat a low-sodium meal',
    description: 'Choose one meal today with little or no added salt.',
    category: 'hypertension',
    rewardPoints: 120,
    defaultFrequency: 'daily',
    isDefault: false,
  },
  {
    slug: 'blood-pressure-week-review',
    title: 'Review your week of readings',
    description: 'Look back at this week’s readings and note any pattern.',
    category: 'hypertension',
    rewardPoints: 350,
    defaultFrequency: 'weekly',
    isDefault: true,
  },
  {
    slug: 'blood-pressure-clinic-check',
    title: 'Clinic blood pressure check',
    description: 'Have your blood pressure measured by a professional.',
    category: 'hypertension',
    rewardPoints: 500,
    defaultFrequency: 'monthly',
    isDefault: false,
  },
  {
    slug: 'glucose-check',
    title: 'Check blood glucose',
    description: 'Record a fasting or mealtime glucose reading.',
    category: 'diabetes',
    rewardPoints: 200,
    defaultFrequency: 'daily',
    isDefault: true,
  },
  {
    slug: 'log-carbohydrates',
    title: 'Log your carbohydrates',
    description: 'Note the carbohydrates in your main meals today.',
    category: 'diabetes',
    rewardPoints: 120,
    defaultFrequency: 'daily',
    isDefault: false,
  },
  {
    slug: 'diabetic-foot-check',
    title: 'Check your feet',
    description: 'Inspect both feet for cuts, blisters or numbness.',
    category: 'diabetes',
    rewardPoints: 350,
    defaultFrequency: 'weekly',
    isDefault: true,
  },
  {
    slug: 'hba1c-review',
    title: 'Review your HbA1c',
    description: 'Check your latest long-term glucose result with your clinic.',
    category: 'diabetes',
    rewardPoints: 500,
    defaultFrequency: 'monthly',
    isDefault: false,
  },
  {
    slug: 'asthma-inhaler-check',
    title: 'Inhaler adherence check',
    description: 'Confirm you used your preventer inhaler as prescribed.',
    category: 'asthma',
    rewardPoints: 150,
    defaultFrequency: 'daily',
    isDefault: true,
  },
  {
    slug: 'peak-flow-reading',
    title: 'Take a peak flow reading',
    description: 'Blow into your peak flow meter and record the best of three.',
    category: 'asthma',
    rewardPoints: 180,
    defaultFrequency: 'daily',
    isDefault: false,
  },
  {
    slug: 'asthma-trigger-review',
    title: 'Review your triggers',
    description: 'Note anything that set off symptoms this week.',
    category: 'asthma',
    rewardPoints: 300,
    defaultFrequency: 'weekly',
    isDefault: false,
  },
  {
    slug: 'asthma-action-plan-review',
    title: 'Review your action plan',
    description: 'Re-read your written asthma plan and check it is current.',
    category: 'asthma',
    rewardPoints: 500,
    defaultFrequency: 'monthly',
    isDefault: false,
  },
  {
    slug: 'log-water-intake',
    title: 'Log your water intake',
    description: 'Track how much water you drank today.',
    category: 'general',
    rewardPoints: 100,
    defaultFrequency: 'daily',
    isDefault: true,
  },
  {
    slug: 'ten-minute-walk',
    title: 'Take a ten-minute walk',
    description: 'Get outside and move for at least ten minutes.',
    category: 'general',
    rewardPoints: 150,
    defaultFrequency: 'daily',
    isDefault: true,
  },
  {
    slug: 'sleep-log',
    title: 'Log last night’s sleep',
    description: 'Record roughly how long you slept and how rested you feel.',
    category: 'general',
    rewardPoints: 100,
    defaultFrequency: 'daily',
    isDefault: false,
  },
  {
    slug: 'weekly-weigh-in',
    title: 'Weigh yourself',
    description: 'Step on the scale at the same time of day each week.',
    category: 'general',
    rewardPoints: 300,
    defaultFrequency: 'weekly',
    isDefault: true,
  },
  {
    slug: 'medication-refill',
    title: 'Check your medication supply',
    description: 'Make sure you have enough medication for the coming month.',
    category: 'general',
    rewardPoints: 400,
    defaultFrequency: 'monthly',
    isDefault: true,
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
    const completionKind = challenge.completionKind ?? 'check_in';
    const instruction = challenge.instruction ?? challenge.description;

    await prisma.challenge.upsert({
      where: { slug: challenge.slug },
      create: {
        ...challenge,
        completionKind,
        instruction,
      },
      update: {
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        rewardPoints: challenge.rewardPoints,
        defaultFrequency: challenge.defaultFrequency,
        isDefault: challenge.isDefault,
        isActive: true,
        completionKind,
        instruction,
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
