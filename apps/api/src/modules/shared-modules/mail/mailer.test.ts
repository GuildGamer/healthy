import { describe, expect, it, vi } from 'vitest';
import { createMailer } from './mailer.js';

describe('createMailer', () => {
  it('logs the OTP when SMTP is not configured', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const mailer = createMailer({ mode: 'log' });

    await mailer.sendPasswordResetOtp({ to: 'ada@example.com', otp: '123456' });

    expect(info).toHaveBeenCalledWith(
      '[mail] password reset OTP for ada@example.com: 123456',
    );
    info.mockRestore();
  });
});
