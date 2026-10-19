jest.mock('./api', () => ({
  apiClient: {
    trackAnalyticsEvent: jest.fn(async () => ({ ok: true })),
  },
}));

import { normalizeAnalyticsProperties } from './track-event';

describe('normalizeAnalyticsProperties', () => {
  it('lifts snake_case experiment aliases to camelCase', () => {
    expect(
      normalizeAnalyticsProperties({
        experiment_id: 'exp_1',
        experiment_variant: 'treatment',
        other: 1,
      }),
    ).toEqual({
      experiment_id: 'exp_1',
      experiment_variant: 'treatment',
      experimentId: 'exp_1',
      experimentVariantKey: 'treatment',
      other: 1,
    });
  });

  it('does not overwrite explicit camelCase', () => {
    expect(
      normalizeAnalyticsProperties({
        experimentId: 'exp_a',
        experiment_id: 'exp_b',
        experimentVariantKey: 'control',
        experiment_variant: 'treatment',
      }),
    ).toMatchObject({
      experimentId: 'exp_a',
      experimentVariantKey: 'control',
    });
  });
});
