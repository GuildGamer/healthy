import {
  ENGAGEMENT_HOLDOUT_VARIANT_HOLDOUT,
  ENGAGEMENT_HOLDOUT_VARIANT_TREATMENT,
} from '../constants/engagement-holdout.js';
import {
  HOLDOUT_HABIT_SLOT_MINUTES,
  TREATMENT_HABIT_SLOT_MINUTES,
} from './constants.js';

/**
 * Treatment gets three slots. Holdout and unassigned keep all six
 * (fail closed on new limits).
 */
export function habitSlotMinutesFor(
  variantKey: string | null | undefined,
): readonly number[] {
  if (variantKey === ENGAGEMENT_HOLDOUT_VARIANT_TREATMENT) {
    return TREATMENT_HABIT_SLOT_MINUTES;
  }

  if (
    variantKey === ENGAGEMENT_HOLDOUT_VARIANT_HOLDOUT ||
    variantKey == null ||
    variantKey === ''
  ) {
    return HOLDOUT_HABIT_SLOT_MINUTES;
  }

  return HOLDOUT_HABIT_SLOT_MINUTES;
}

export function isTreatmentVariant(variantKey: string | null | undefined): boolean {
  return variantKey === ENGAGEMENT_HOLDOUT_VARIANT_TREATMENT;
}
