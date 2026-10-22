import type { BloodPressureField, ReadingRules } from '../types/reading-entry';

/** What a home monitor can show, not a judgement on the reading. */
export const BLOOD_PRESSURE_RULES: Record<BloodPressureField, ReadingRules> = {
  top: {
    min: 50,
    max: 250,
    maxDigits: 3,
    decimals: 0,
    rangeMessage: 'The top number should be between 50 and 250.',
  },
  bottom: {
    min: 30,
    max: 180,
    maxDigits: 3,
    decimals: 0,
    rangeMessage: 'The bottom number should be between 30 and 180.',
  },
};

export const PULSE_RANGE = { min: 30, max: 220 } as const;
export const VITALS_NOTES_MAX = 500;

export const GLUCOSE_RULES: ReadingRules = {
  min: 1,
  max: 40,
  maxDigits: 2,
  decimals: 1,
  rangeMessage: 'Glucose should be between 1 and 40 mmol/L.',
};

export const PEAK_FLOW_RULES: ReadingRules = {
  min: 50,
  max: 900,
  maxDigits: 3,
  decimals: 0,
  rangeMessage: 'Peak flow should be between 50 and 900 L/min.',
};

export const CARBS_RULES: ReadingRules = {
  min: 0,
  max: 500,
  maxDigits: 3,
  decimals: 0,
  rangeMessage: 'Carbs should be between 0 and 500 grams.',
};
