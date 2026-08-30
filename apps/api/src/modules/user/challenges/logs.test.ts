import { describe, expect, it } from 'vitest';
import { ORPCError } from '@orpc/server';
import { requireLogFor } from './logs.js';

describe('requireLogFor', () => {
  it('rejects a glucose challenge without a reading', () => {
    expect(() => requireLogFor('glucose', {})).toThrow(ORPCError);
  });

  it('accepts a plausible glucose reading', () => {
    expect(
      requireLogFor('glucose', {
        glucose: { mmolL: 5.4, context: 'fasting' },
      }),
    ).toEqual({
      kind: 'glucose',
      fields: { mmolL: 5.4, context: 'fasting' },
    });
  });

  it('ignores log payloads on a check-in', () => {
    expect(requireLogFor('check_in', { water: { amount: 4, unit: 'glasses' } })).toBeNull();
  });
});
