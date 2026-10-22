import type { KeypadKey } from '@/components/deck';
import { BLOOD_PRESSURE_RULES } from './constants/reading-rules';
import type { BloodPressureEntry, ReadingRules } from './types/reading-entry';

function integerPart(value: string): string {
  return value.split('.')[0] ?? '';
}

function appendDigit(value: string, digit: string, rules: ReadingRules): string {
  if (value === '0' && rules.decimals === 0) {
    return digit;
  }

  if (value.includes('.')) {
    const decimalPart = value.split('.')[1] ?? '';
    return decimalPart.length >= rules.decimals ? value : value + digit;
  }

  return integerPart(value).length >= rules.maxDigits ? value : value + digit;
}

function appendPoint(value: string, rules: ReadingRules): string {
  if (rules.decimals === 0 || value.includes('.')) {
    return value;
  }

  return value === '' ? '0.' : `${value}.`;
}

/** One keypad press applied to a number, within what that number accepts. */
export function applyKeypadKey(value: string, key: KeypadKey, rules: ReadingRules): string {
  if (key === 'delete') {
    return value.slice(0, -1);
  }

  if (key === '.') {
    return appendPoint(value, rules);
  }

  return appendDigit(value, key, rules);
}

/** The number typed so far, or null while it is empty or ends in a bare point. */
export function readingValue(value: string): number | null {
  if (value === '' || value.endsWith('.')) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isInRange(value: string, rules: ReadingRules): boolean {
  const parsed = readingValue(value);
  return parsed !== null && parsed >= rules.min && parsed <= rules.max;
}

/** No further digit fits, so what is there is what was meant. */
export function isEntryComplete(value: string, rules: ReadingRules): boolean {
  const parsed = readingValue(value);
  if (parsed === null) {
    return false;
  }

  if (value.includes('.')) {
    return (value.split('.')[1] ?? '').length >= rules.decimals;
  }

  return integerPart(value).length >= rules.maxDigits || parsed * 10 > rules.max;
}

/** The range, said only once the number can no longer grow into it. */
export function readingRangeError(value: string, rules: ReadingRules): string | null {
  const parsed = readingValue(value);
  if (parsed === null || isInRange(value, rules)) {
    return null;
  }

  if (parsed > rules.max || isEntryComplete(value, rules)) {
    return rules.rangeMessage;
  }

  return null;
}

/**
 * A press on the blood-pressure pad. The top number hands over to the bottom
 * once it is complete; deleting past the start of the bottom goes back up.
 */
export function typeBloodPressure(entry: BloodPressureEntry, key: KeypadKey): BloodPressureEntry {
  const { active } = entry;

  if (key === 'delete' && active === 'bottom' && entry.bottom === '') {
    return { ...entry, active: 'top', top: entry.top.slice(0, -1) };
  }

  const next = applyKeypadKey(entry[active], key, BLOOD_PRESSURE_RULES[active]);
  const typed = { ...entry, [active]: next };

  if (key !== 'delete' && active === 'top' && isEntryComplete(next, BLOOD_PRESSURE_RULES.top)) {
    return { ...typed, active: 'bottom' };
  }

  return typed;
}

export function bloodPressureError(entry: BloodPressureEntry): string | null {
  return (
    readingRangeError(entry.top, BLOOD_PRESSURE_RULES.top) ??
    readingRangeError(entry.bottom, BLOOD_PRESSURE_RULES.bottom)
  );
}

export function isBloodPressureReady(entry: BloodPressureEntry): boolean {
  return (
    isInRange(entry.top, BLOOD_PRESSURE_RULES.top) &&
    isInRange(entry.bottom, BLOOD_PRESSURE_RULES.bottom)
  );
}
