import type { GlucoseContext } from '@product/client';

/** The logs entered as one number on a sheet. */
export type SingleReadingKind = 'glucose' | 'peak_flow' | 'carbs';

export type SingleReadingState = {
  value: string;
  /** Glucose only: when it was taken. Must be picked; never assumed. */
  context: GlucoseContext | null;
  /** Carbs only: a note stands in for grams when you don't know them. */
  note: string;
  isWritingNote: boolean;
};
