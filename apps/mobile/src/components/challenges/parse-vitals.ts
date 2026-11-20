import type { ChallengeVitals } from '@product/client';
import { BLOOD_PRESSURE_RULES, PULSE_RANGE, VITALS_NOTES_MAX } from './constants/reading-rules';

const SYSTOLIC_MIN = BLOOD_PRESSURE_RULES.top.min;
const SYSTOLIC_MAX = BLOOD_PRESSURE_RULES.top.max;
const DIASTOLIC_MIN = BLOOD_PRESSURE_RULES.bottom.min;
const DIASTOLIC_MAX = BLOOD_PRESSURE_RULES.bottom.max;
const PULSE_MIN = PULSE_RANGE.min;
const PULSE_MAX = PULSE_RANGE.max;
const NOTES_MAX = VITALS_NOTES_MAX;

export type VitalsField = 'systolic' | 'diastolic' | 'pulse' | 'notes';

export type VitalsFieldErrors = Partial<Record<VitalsField, string>>;

export type ParseVitalsInput = {
  systolic: string;
  diastolic: string;
  pulse: string;
  notes: string;
};

export type ParseVitalsResult =
  { success: true; data: ChallengeVitals } | { success: false; errors: VitalsFieldErrors };

function parseRequiredInt(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}

function parseOptionalInt(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return parseRequiredInt(trimmed);
}

export function parseVitalsForm(input: ParseVitalsInput): ParseVitalsResult {
  const errors: VitalsFieldErrors = {};
  const systolic = parseRequiredInt(input.systolic);
  const diastolic = parseRequiredInt(input.diastolic);
  const pulse = parseOptionalInt(input.pulse);
  const notes = input.notes.trim();

  if (systolic === null || systolic < SYSTOLIC_MIN || systolic > SYSTOLIC_MAX) {
    errors.systolic = `Enter a systolic reading between ${SYSTOLIC_MIN} and ${SYSTOLIC_MAX}`;
  }

  if (diastolic === null || diastolic < DIASTOLIC_MIN || diastolic > DIASTOLIC_MAX) {
    errors.diastolic = `Enter a diastolic reading between ${DIASTOLIC_MIN} and ${DIASTOLIC_MAX}`;
  }

  if (pulse === null || (pulse !== undefined && (pulse < PULSE_MIN || pulse > PULSE_MAX))) {
    errors.pulse = `Pulse must be between ${PULSE_MIN} and ${PULSE_MAX}`;
  }

  if (notes.length > NOTES_MAX) {
    errors.notes = `Keep notes under ${NOTES_MAX} characters`;
  }

  if (systolic === null || diastolic === null || Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      systolic,
      diastolic,
      ...(typeof pulse === 'number' ? { pulse } : {}),
      ...(notes.length === 0 ? {} : { notes }),
    },
  };
}
