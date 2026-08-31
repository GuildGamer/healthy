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
  'awaiting_evidence',
  'completed',
]);

export const challengeFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);

export const challengeCompletionKindSchema = z.enum([
  'check_in',
  'vitals_bp',
  'evidence_photo',
  'glucose',
  'peak_flow',
  'water',
  'carbs',
]);

/**
 * Material Community Icons glyph name. Admin picks from that pack so the
 * catalog can cover walks, pills, meters, and whatever comes next.
 */
export const DEFAULT_CHALLENGE_ICON = 'checkbox-marked-circle-outline';

export const challengeIconSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export function toChallengeIcon(value: string | null | undefined): string {
  const parsed = challengeIconSchema.safeParse((value ?? '').trim());
  return parsed.success ? parsed.data : DEFAULT_CHALLENGE_ICON;
}

export type HealthCategory = z.infer<typeof healthCategorySchema>;
export type UserChallengeStatus = z.infer<typeof userChallengeStatusSchema>;
export type ChallengeFrequency = z.infer<typeof challengeFrequencySchema>;
export type ChallengeCompletionKind = z.infer<
  typeof challengeCompletionKindSchema
>;
