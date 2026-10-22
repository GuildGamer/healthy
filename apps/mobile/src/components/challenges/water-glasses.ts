import type { ChallengeDraft, TodayChallenge } from '@product/client';
import { waterGlassGoalFor } from '@product/contract/challenge-capture';
import { GLASS_ORDINALS } from './constants/water';

type WaterChallenge = Pick<TodayChallenge, 'capture' | 'draft' | 'status'>;

export function waterGlassGoal(challenge: Pick<TodayChallenge, 'capture'>): number {
  return waterGlassGoalFor(challenge.capture.target);
}

/** The running total kept in the draft; a total saved in millilitres starts the glasses afresh. */
export function waterGlassCount(challenge: WaterChallenge): number {
  if (challenge.status === 'completed') {
    return waterGlassGoal(challenge);
  }

  const draft = challenge.draft;
  if (draft?.kind !== 'water' || draft.fields.unit === 'ml') {
    return 0;
  }

  return draft.fields.amount ?? 0;
}

export function waterGlassDraft(glasses: number): ChallengeDraft {
  if (glasses <= 0) {
    return { kind: 'water', fields: { unit: 'glasses' } };
  }

  return { kind: 'water', fields: { amount: glasses, unit: 'glasses' } };
}

/** "Third glass logged", for the toast that offers to take it back. */
export function glassLoggedLine(glasses: number): string {
  const ordinal = GLASS_ORDINALS[glasses - 1];
  return ordinal ? `${ordinal} glass logged` : `Glass ${glasses} logged`;
}
