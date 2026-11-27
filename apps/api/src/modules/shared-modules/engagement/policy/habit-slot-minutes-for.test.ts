import { describe, expect, it } from 'vitest';
import { HABIT_SLOT_MINUTES } from '../constants/habit-slot-copy.js';
import { TREATMENT_HABIT_SLOT_MINUTES } from './constants.js';
import {
  habitSlotMinutesFor,
  isTreatmentVariant,
} from './habit-slot-minutes-for.js';

describe('habitSlotMinutesFor', () => {
  it('gives treatment three slots', () => {
    expect(habitSlotMinutesFor('treatment')).toEqual([
      ...TREATMENT_HABIT_SLOT_MINUTES,
    ]);
  });

  it('keeps six slots for holdout and unassigned', () => {
    expect(habitSlotMinutesFor('holdout')).toEqual([...HABIT_SLOT_MINUTES]);
    expect(habitSlotMinutesFor(null)).toEqual([...HABIT_SLOT_MINUTES]);
    expect(habitSlotMinutesFor(undefined)).toEqual([...HABIT_SLOT_MINUTES]);
  });
});

describe('isTreatmentVariant', () => {
  it('is true only for treatment', () => {
    expect(isTreatmentVariant('treatment')).toBe(true);
    expect(isTreatmentVariant('holdout')).toBe(false);
    expect(isTreatmentVariant(null)).toBe(false);
  });
});
