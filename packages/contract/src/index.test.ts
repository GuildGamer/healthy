import { describe, expect, it } from 'vitest';
import { healthOutputSchema } from '../src/index';

describe('healthOutputSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = healthOutputSchema.parse({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
    expect(parsed.status).toBe('ok');
  });
});
