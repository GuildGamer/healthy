import type { Mailer, PasswordResetOtpMessage } from './mailer.js';

/**
 * Local and development stand-in so password reset is exercisable before
 * SMTP credentials exist. Never used in production.
 */
export function createLogMailer(): Mailer {
  return {
    async sendPasswordResetOtp(message: PasswordResetOtpMessage) {
      // eslint-disable-next-line no-console
      console.info(
        `[mail] password reset OTP for ${message.to}: ${message.otp}`,
      );
    },
  };
}
