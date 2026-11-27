import { describe, expect, it } from 'vitest';
import {
  isStagingEnvironment,
  normalizeStagingTesterEmail,
} from './staging-tester-membership.js';

describe('staging-tester-membership', () => {
  it('detects staging only for NODE_ENV=staging', () => {
    expect(isStagingEnvironment({ NODE_ENV: 'staging' })).toBe(true);
    expect(isStagingEnvironment({ NODE_ENV: 'production' })).toBe(false);
    expect(isStagingEnvironment({ NODE_ENV: 'development' })).toBe(false);
    expect(isStagingEnvironment({})).toBe(false);
  });

  it('normalizes emails for lookup', () => {
    expect(normalizeStagingTesterEmail(' Tester@Example.COM ')).toBe(
      'tester@example.com',
    );
  });
});
