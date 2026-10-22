import { emailCodeFailureFor } from './email-code';

describe('emailCodeFailureFor', () => {
  it('treats an expired or locked code as dead', () => {
    expect(emailCodeFailureFor({ code: 'OTP_EXPIRED' })).toBe('expired');
    expect(emailCodeFailureFor({ code: 'TOO_MANY_ATTEMPTS' })).toBe('expired');
  });

  it('treats anything else as a wrong code to retype', () => {
    expect(emailCodeFailureFor({ code: 'INVALID_OTP' })).toBe('wrong');
    expect(emailCodeFailureFor({ message: 'Invalid OTP' })).toBe('wrong');
  });
});
