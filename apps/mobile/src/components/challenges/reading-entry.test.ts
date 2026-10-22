import type { KeypadKey } from '@/components/deck';
import { CARBS_RULES, GLUCOSE_RULES, PEAK_FLOW_RULES } from './constants/reading-rules';
import {
  applyKeypadKey,
  bloodPressureError,
  isBloodPressureReady,
  readingRangeError,
  typeBloodPressure,
} from './reading-entry';
import type { BloodPressureEntry } from './types/reading-entry';

function typeAll(keys: readonly KeypadKey[]): BloodPressureEntry {
  return keys.reduce<BloodPressureEntry>((entry, key) => typeBloodPressure(entry, key), {
    top: '',
    bottom: '',
    active: 'top',
  });
}

describe('blood pressure entry', () => {
  it('moves to the bottom number after three digits', () => {
    expect(typeAll(['1', '2', '8'])).toEqual({ top: '128', bottom: '', active: 'bottom' });
  });

  it('moves after two digits when no third could fit', () => {
    expect(typeAll(['9', '5'])).toEqual({ top: '95', bottom: '', active: 'bottom' });
  });

  it('waits for a third digit while one could still fit', () => {
    expect(typeAll(['1', '2']).active).toBe('top');
  });

  it('fills the bottom number and stops at three digits', () => {
    expect(typeAll(['1', '2', '8', '8', '2']).bottom).toBe('82');
    expect(typeAll(['1', '2', '8', '1', '2', '0', '5']).bottom).toBe('120');
  });

  it('goes back to the top number when deleting past the start of the bottom', () => {
    expect(typeAll(['1', '2', '8', 'delete'])).toEqual({ top: '12', bottom: '', active: 'top' });
  });

  it('says the range once a number can no longer fit, and keeps save off', () => {
    const entry = typeAll(['2', '8', '8', '2']);

    expect(bloodPressureError(entry)).toBe('The top number should be between 50 and 250.');
    expect(isBloodPressureReady(entry)).toBe(false);
  });

  it('is ready once both numbers fit', () => {
    expect(isBloodPressureReady(typeAll(['1', '2', '8', '8', '2']))).toBe(true);
  });
});

describe('single readings', () => {
  it('takes one decimal for glucose', () => {
    const typed = (['5', '.', '4', '7'] as const).reduce(
      (value, key) => applyKeypadKey(value, key, GLUCOSE_RULES),
      '',
    );
    expect(typed).toBe('5.4');
  });

  it('ignores the point where a reading is whole', () => {
    expect(applyKeypadKey('45', '.', PEAK_FLOW_RULES)).toBe('45');
  });

  it('lets zero grams stand, but not lead a bigger number', () => {
    expect(applyKeypadKey('', '0', CARBS_RULES)).toBe('0');
    expect(applyKeypadKey('0', '4', CARBS_RULES)).toBe('4');
  });

  it('stays quiet while a low number could still grow into range', () => {
    expect(readingRangeError('45', PEAK_FLOW_RULES)).toBeNull();
    expect(readingRangeError('950', PEAK_FLOW_RULES)).toBe(PEAK_FLOW_RULES.rangeMessage);
    expect(readingRangeError('45', GLUCOSE_RULES)).toBe(GLUCOSE_RULES.rangeMessage);
  });
});
