import type { ChallengeVitals } from '@product/client';

const SYSTOLIC_MIN = 50;
const SYSTOLIC_MAX = 250;
const DIASTOLIC_MIN = 30;
const DIASTOLIC_MAX = 180;
const PULSE_MIN = 30;
const PULSE_MAX = 220;
const NOTES_MAX = 500;

export type VitalsField = 'systolic' | 'diastolic' | 'pulse' | 'notes';

export type VitalsFieldErrors = Partial<Record<VitalsField, string>>;

export type ParseVitalsInput = {
  systolic: string;
  diastolic: string;
  pulse: string;
  notes: string;
};

export type ParseVitalsResult =
  | { success: true; data: ChallengeVitals }
  | { success: false; errors: VitalsFieldErrors };

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

  if (
    diastolic === null ||
    diastolic < DIASTOLIC_MIN ||
    diastolic > DIASTOLIC_MAX
  ) {
    errors.diastolic = `Enter a diastolic reading between ${DIASTOLIC_MIN} and ${DIASTOLIC_MAX}`;
  }

  if (
    pulse === null ||
    (pulse !== undefined && (pulse < PULSE_MIN || pulse > PULSE_MAX))
  ) {
    errors.pulse = `Pulse must be between ${PULSE_MIN} and ${PULSE_MAX}`;
  }

  if (notes.length > NOTES_MAX) {
    errors.notes = `Keep notes under ${NOTES_MAX} characters`;
  }

  if (
    systolic === null ||
    diastolic === null ||
    Object.keys(errors).length > 0
  ) {
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
