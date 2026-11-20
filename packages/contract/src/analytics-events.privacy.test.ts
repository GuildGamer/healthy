import { describe, expect, it } from 'vitest';
import { ANALYTICS_EVENT_PROPERTIES } from './analytics-events.js';

const FORBIDDEN_PROPERTY_KEYS = [
  'email',
  'name',
  'displayName',
  'systolic',
  'diastolic',
  'glucose',
  'category',
  'healthCategories',
] as const;

describe('analytics event privacy', () => {
  it('does not put identity or health readings in catalog property keys', () => {
    for (const [eventName, schema] of Object.entries(ANALYTICS_EVENT_PROPERTIES)) {
      const shape =
        schema && typeof schema === 'object' && 'shape' in schema
          ? (schema.shape as Record<string, unknown>)
          : null;
      if (!shape) {
        continue;
      }

      for (const key of Object.keys(shape)) {
        expect(
          FORBIDDEN_PROPERTY_KEYS,
          `${eventName}.${key} must not be a forbidden property`,
        ).not.toContain(key);
      }
    }
  });
});
