import { describe, expect, it } from 'vitest';
import { firstNameFromDisplay, starterStepLabel } from './starter-steps.js';

describe('starterStepLabel', () => {
  it('maps known activity types', () => {
    expect(
      starterStepLabel({ deviceMetric: 'pushups', completionKind: 'check_in' }),
    ).toBe('5 push-ups');
    expect(
      starterStepLabel({ deviceMetric: 'steps', completionKind: 'check_in' }),
    ).toBe('a 5-minute walk');
    expect(
      starterStepLabel({ deviceMetric: null, completionKind: 'water' }),
    ).toBe('one glass');
    expect(
      starterStepLabel({ deviceMetric: null, completionKind: 'check_in' }),
    ).toBe('a quick one');
  });
});

describe('firstNameFromDisplay', () => {
  it('takes the first word and skips emails', () => {
    expect(firstNameFromDisplay('Ada Lovelace')).toBe('Ada');
    expect(firstNameFromDisplay('ada@example.com')).toBeNull();
    expect(firstNameFromDisplay('')).toBeNull();
    expect(firstNameFromDisplay(null)).toBeNull();
  });
});
