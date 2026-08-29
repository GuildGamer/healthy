import { describe, expect, it } from 'vitest';
import { LOCAL_DEV_OTP, localDevOtp } from './password-reset-otp.js';

describe('localDevOtp', () => {
  it('is six zeros on local', () => {
    expect(localDevOtp(true)).toBe('000000');
    expect(LOCAL_DEV_OTP).toHaveLength(6);
  });

  it('does not pin a code in production', () => {
    expect(localDevOtp(false)).toBeUndefined();
  });
});
