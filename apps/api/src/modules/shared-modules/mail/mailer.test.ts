import { SendByteError } from '@sendbyte/node';
import { describe, expect, it, vi } from 'vitest';
import { createMailer } from './mailer.js';
import { createSendByteMailer, type SendByteEmailClient } from './sendbyte-mailer.js';

describe('createMailer', () => {
  it('logs the OTP when SMTP is not configured', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const mailer = createMailer({ mode: 'log' });

    await mailer.sendPasswordResetOtp({ to: 'ada@example.com', otp: '123456' });

    expect(info).toHaveBeenCalledWith('[mail] password reset OTP for ada@example.com: 123456');

    await mailer.sendEmailVerificationOtp({
      to: 'ada@example.com',
      otp: '000000',
    });

    expect(info).toHaveBeenCalledWith('[mail] email verification OTP for ada@example.com: 000000');

    await mailer.sendChangeEmailOtp({
      to: 'ada@new.example',
      otp: '654321',
    });

    expect(info).toHaveBeenCalledWith('[mail] change email OTP for ada@new.example: 654321');
    info.mockRestore();
  });

  it('sends OTP mail through SendByte', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'email_1' });
    const client: SendByteEmailClient = { emails: { send } };
    const mailer = createSendByteMailer(
      { mode: 'sendbyte', apiKey: 'sk_test_example', from: 'hello@gethealthyapp.com' },
      client,
    );

    await mailer.sendPasswordResetOtp({ to: 'ada@example.com', otp: '123456' });
    await mailer.sendEmailVerificationOtp({
      to: 'ada@example.com',
      otp: '1<2',
    });
    await mailer.sendChangeEmailOtp({
      to: 'ada@new.example',
      otp: '654321',
    });

    expect(send).toHaveBeenNthCalledWith(1, {
      from: 'hello@gethealthyapp.com',
      to: 'ada@example.com',
      subject: 'Your Healthy password reset code',
      text: 'Your password reset code is 123456.\nIt expires in 5 minutes. If you did not ask for this, you can ignore this email.',
      html: '<p>Your password reset code is 123456.<br>It expires in 5 minutes. If you did not ask for this, you can ignore this email.</p>',
    });
    expect(send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        subject: 'Your Healthy verification code',
        html: '<p>Your email verification code is 1&lt;2.<br>It expires in 5 minutes. If you did not ask for this, you can ignore this email.</p>',
      }),
    );
    expect(send).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        to: 'ada@new.example',
        subject: 'Confirm your new Healthy email',
      }),
    );
  });

  it('hides SendByte provider failures behind a short error', async () => {
    const client: SendByteEmailClient = {
      emails: {
        send: vi
          .fn()
          .mockRejectedValue(
            new SendByteError('domain_not_verified', 'Domain is not verified', 422),
          ),
      },
    };
    const mailer = createSendByteMailer(
      { mode: 'sendbyte', apiKey: 'sk_test_example', from: 'hello@gethealthyapp.com' },
      client,
    );

    await expect(
      mailer.sendPasswordResetOtp({ to: 'ada@example.com', otp: '123456' }),
    ).rejects.toThrow('SendByte email failed (domain_not_verified): Domain is not verified');
  });
});
