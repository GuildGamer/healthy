import { oc } from '@orpc/contract';
import { z } from 'zod';

export const healthCategorySchema = z.enum([
  'hypertension',
  'diabetes',
  'asthma',
  'general',
]);

export const userChallengeStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
]);

export const healthOutputSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export const meOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  categories: z.array(healthCategorySchema),
  pointsBalance: z.number().int().nonnegative(),
  currentStreakDays: z.number().int().nonnegative(),
});

export const updateCategoriesInputSchema = z.object({
  categories: z.array(healthCategorySchema).min(1).max(healthCategorySchema.options.length),
});

export const todayChallengeSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  title: z.string(),
  description: z.string(),
  category: healthCategorySchema,
  rewardPoints: z.number().int().positive(),
  status: userChallengeStatusSchema,
  dayKey: z.string(),
});

export const listTodayChallengesOutputSchema = z.object({
  dayKey: z.string(),
  challenges: z.array(todayChallengeSchema),
  completedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

export const startChallengeInputSchema = z.object({
  userChallengeId: z.string().min(1),
});

/** Starting only moves the assignment along; points are awarded on completion. */
export const startChallengeOutputSchema = z.object({
  challenge: todayChallengeSchema,
});

export const completeChallengeInputSchema = z.object({
  userChallengeId: z.string().min(1),
});

export const completeChallengeOutputSchema = z.object({
  challenge: todayChallengeSchema,
  pointsBalance: z.number().int().nonnegative(),
  currentStreakDays: z.number().int().nonnegative(),
  pointsAwarded: z.number().int().nonnegative(),
});

export const activityItemSchema = z.object({
  id: z.string(),
  delta: z.number().int(),
  reason: z.string(),
  createdAt: z.string().datetime(),
});

export const listActivityOutputSchema = z.object({
  items: z.array(activityItemSchema),
});

export const healthContract = oc
  .route({ method: 'GET', path: '/health' })
  .output(healthOutputSchema);

export const meContract = oc.route({ method: 'GET', path: '/me' }).output(meOutputSchema);

export const updateCategoriesContract = oc
  .route({ method: 'PUT', path: '/me/categories' })
  .input(updateCategoriesInputSchema)
  .output(meOutputSchema);

export const listTodayChallengesContract = oc
  .route({ method: 'GET', path: '/challenges/today' })
  .output(listTodayChallengesOutputSchema);

export const startChallengeContract = oc
  .route({ method: 'POST', path: '/challenges/start' })
  .input(startChallengeInputSchema)
  .output(startChallengeOutputSchema);

export const completeChallengeContract = oc
  .route({ method: 'POST', path: '/challenges/complete' })
  .input(completeChallengeInputSchema)
  .output(completeChallengeOutputSchema);

export const listActivityContract = oc
  .route({ method: 'GET', path: '/activity' })
  .output(listActivityOutputSchema);

export const waitlistInputSchema = z.object({
  email: z.string().email(),
  source: z.string().max(100).optional(),
});

export const waitlistOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

export const waitlistContract = oc
  .route({ method: 'POST', path: '/waitlist' })
  .input(waitlistInputSchema)
  .output(waitlistOutputSchema);

export const appContract = {
  health: healthContract,
  me: meContract,
  updateCategories: updateCategoriesContract,
  listTodayChallenges: listTodayChallengesContract,
  startChallenge: startChallengeContract,
  completeChallenge: completeChallengeContract,
  listActivity: listActivityContract,
  waitlist: waitlistContract,
};

export type AppContract = typeof appContract;
export type HealthCategory = z.infer<typeof healthCategorySchema>;
export type HealthOutput = z.infer<typeof healthOutputSchema>;
export type MeOutput = z.infer<typeof meOutputSchema>;
export type UpdateCategoriesInput = z.infer<typeof updateCategoriesInputSchema>;
export type TodayChallenge = z.infer<typeof todayChallengeSchema>;
export type ListTodayChallengesOutput = z.infer<typeof listTodayChallengesOutputSchema>;
export type UserChallengeStatus = z.infer<typeof userChallengeStatusSchema>;
export type StartChallengeInput = z.infer<typeof startChallengeInputSchema>;
export type StartChallengeOutput = z.infer<typeof startChallengeOutputSchema>;
export type CompleteChallengeInput = z.infer<typeof completeChallengeInputSchema>;
export type CompleteChallengeOutput = z.infer<typeof completeChallengeOutputSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ListActivityOutput = z.infer<typeof listActivityOutputSchema>;
export type WaitlistInput = z.infer<typeof waitlistInputSchema>;
export type WaitlistOutput = z.infer<typeof waitlistOutputSchema>;
