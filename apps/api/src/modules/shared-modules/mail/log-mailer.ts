import type { Mailer, OtpMailMessage } from './mailer.js';

/**
 * Local and development stand-in so OTP mail is exercisable before
 * SMTP credentials exist. Never used in production.
 */
export function createLogMailer(): Mailer {
  return {
    async sendPasswordResetOtp(message: OtpMailMessage) {
      // eslint-disable-next-line no-console
      console.info(
        `[mail] password reset OTP for ${message.to}: ${message.otp}`,
      );
    },
    async sendEmailVerificationOtp(message: OtpMailMessage) {
      // eslint-disable-next-line no-console
      console.info(
        `[mail] email verification OTP for ${message.to}: ${message.otp}`,
      );
    },
    async sendChangeEmailOtp(message: OtpMailMessage) {
      // eslint-disable-next-line no-console
      console.info(
        `[mail] change email OTP for ${message.to}: ${message.otp}`,
      );
    },
  };
}
