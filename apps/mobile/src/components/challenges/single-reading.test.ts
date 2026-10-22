import { canSaveSingleReading, initialSingleReading, singleReadingPayload } from './single-reading';
import type { SingleReadingState } from './types/single-reading';

const blank: SingleReadingState = { value: '', context: null, note: '', isWritingNote: false };

describe('single readings', () => {
  it('will not save glucose until you say when it was taken', () => {
    expect(canSaveSingleReading('glucose', { ...blank, value: '5.4' })).toBe(false);
    expect(
      singleReadingPayload('glucose', { ...blank, value: '5.4', context: 'before_meal' }),
    ).toEqual({
      glucose: { mmolL: 5.4, context: 'before_meal' },
    });
  });

  it('saves peak flow as a whole number in range', () => {
    expect(singleReadingPayload('peak_flow', { ...blank, value: '45' })).toBeNull();
    expect(singleReadingPayload('peak_flow', { ...blank, value: '450' })).toEqual({
      peakFlow: { bestLitresPerMinute: 450 },
    });
  });

  it('takes a note for carbs as a real answer', () => {
    expect(
      singleReadingPayload('carbs', { ...blank, isWritingNote: true, note: '  Rice  ' }),
    ).toEqual({
      carbs: { note: 'Rice' },
    });
    expect(singleReadingPayload('carbs', { ...blank, value: '0' })).toEqual({
      carbs: { grams: 0 },
    });
  });

  it('picks up where the draft left off', () => {
    expect(initialSingleReading({ kind: 'carbs', fields: { note: 'Toast' } })).toEqual({
      ...blank,
      note: 'Toast',
      isWritingNote: true,
    });
  });
});
