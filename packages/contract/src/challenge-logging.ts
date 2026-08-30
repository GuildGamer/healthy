import { z } from 'zod';

export const glucoseContextSchema = z.enum([
  'fasting',
  'before_meal',
  'after_meal',
]);

export const challengeGlucoseSchema = z.object({
  mmolL: z.number().min(1).max(40),
  context: glucoseContextSchema,
});

export const challengePeakFlowSchema = z.object({
  bestLitresPerMinute: z.number().int().min(50).max(900),
});

export const waterUnitSchema = z.enum(['glasses', 'ml']);

export const challengeWaterSchema = z.object({
  amount: z.number().int().min(1).max(10_000),
  unit: waterUnitSchema,
});

export const challengeCarbsSchema = z
  .object({
    grams: z.number().int().min(0).max(500).optional(),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => value.grams !== undefined || Boolean(value.note), {
    message: 'Log grams or a short note to finish',
  });

export const challengeVitalsDraftSchema = z.object({
  systolic: z.number().int().optional(),
  diastolic: z.number().int().optional(),
  pulse: z.number().int().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const challengeGlucoseDraftSchema = challengeGlucoseSchema.partial();
export const challengePeakFlowDraftSchema = challengePeakFlowSchema.partial();
export const challengeWaterDraftSchema = challengeWaterSchema.partial();
export const challengeCarbsDraftSchema = z.object({
  grams: z.number().int().min(0).max(500).optional(),
  note: z.string().trim().max(500).optional(),
});

export const challengeDraftSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('vitals_bp'), fields: challengeVitalsDraftSchema }),
  z.object({ kind: z.literal('glucose'), fields: challengeGlucoseDraftSchema }),
  z.object({
    kind: z.literal('peak_flow'),
    fields: challengePeakFlowDraftSchema,
  }),
  z.object({ kind: z.literal('water'), fields: challengeWaterDraftSchema }),
  z.object({ kind: z.literal('carbs'), fields: challengeCarbsDraftSchema }),
  z.object({ kind: z.literal('evidence_photo'), fields: z.object({}) }),
]);

export const challengeProgressSchema = z.object({
  filled: z.number().int().nonnegative(),
  required: z.number().int().positive(),
});

export const saveChallengeDraftInputSchema = z.object({
  userChallengeId: z.string().min(1),
  draft: challengeDraftSchema,
});

export const DEFAULT_IN_PROGRESS_NUDGE_DELAY_MINUTES = 30;
export const IN_PROGRESS_NUDGE_DELAY_MIN = 5;
export const IN_PROGRESS_NUDGE_DELAY_MAX = 1_440;

export type ChallengeDraft = z.infer<typeof challengeDraftSchema>;
export type ChallengeFieldProgress = z.infer<typeof challengeProgressSchema>;
export type ChallengeGlucose = z.infer<typeof challengeGlucoseSchema>;
export type ChallengePeakFlow = z.infer<typeof challengePeakFlowSchema>;
export type ChallengeWater = z.infer<typeof challengeWaterSchema>;
export type ChallengeCarbs = z.infer<typeof challengeCarbsSchema>;
export type GlucoseContext = z.infer<typeof glucoseContextSchema>;
export type WaterUnit = z.infer<typeof waterUnitSchema>;

function countPresent(values: readonly unknown[]): number {
  return values.filter((value) => value !== undefined && value !== '').length;
}

/**
 * Required-field progress for Home rings and resume copy.
 * Check-in and gym photo are 0/1 until complete; vitals need systolic + diastolic.
 */
export function fieldProgress(input: {
  completionKind: string;
  status: string;
  draft: ChallengeDraft | null | undefined;
}): ChallengeFieldProgress {
  if (input.status === 'completed') {
    return { filled: 1, required: 1 };
  }

  if (input.status === 'awaiting_evidence') {
    return { filled: 2, required: 3 };
  }

  if (input.completionKind === 'check_in') {
    return { filled: 0, required: 1 };
  }

  if (input.completionKind === 'evidence_photo') {
    return { filled: 0, required: 1 };
  }

  if (input.completionKind === 'vitals_bp') {
    const fields =
      input.draft?.kind === 'vitals_bp' ? input.draft.fields : undefined;
    return {
      filled: countPresent([fields?.systolic, fields?.diastolic]),
      required: 2,
    };
  }

  if (input.completionKind === 'glucose') {
    const fields =
      input.draft?.kind === 'glucose' ? input.draft.fields : undefined;
    return {
      filled: countPresent([fields?.mmolL, fields?.context]),
      required: 2,
    };
  }

  if (input.completionKind === 'peak_flow') {
    const fields =
      input.draft?.kind === 'peak_flow' ? input.draft.fields : undefined;
    return {
      filled: countPresent([fields?.bestLitresPerMinute]),
      required: 1,
    };
  }

  if (input.completionKind === 'water') {
    const fields =
      input.draft?.kind === 'water' ? input.draft.fields : undefined;
    return {
      filled: countPresent([fields?.amount, fields?.unit]),
      required: 2,
    };
  }

  if (input.completionKind === 'carbs') {
    const fields =
      input.draft?.kind === 'carbs' ? input.draft.fields : undefined;
    const hasEntry =
      fields?.grams !== undefined || Boolean(fields?.note?.trim());
    return { filled: hasEntry ? 1 : 0, required: 1 };
  }

  return { filled: 0, required: 1 };
}

export function assertDraftMatchesKind(
  completionKind: string,
  draft: ChallengeDraft,
): void {
  if (draft.kind !== completionKind) {
    throw new Error('Draft kind does not match this challenge');
  }
}
