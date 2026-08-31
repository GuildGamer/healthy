import type { MailConfig } from '../config/environment.js';
import { createLogMailer } from './log-mailer.js';
import { createSmtpMailer } from './smtp-mailer.js';

export type OtpMailMessage = {
  to: string;
  otp: string;
};

export type PasswordResetOtpMessage = OtpMailMessage;

export type Mailer = {
  sendPasswordResetOtp(message: OtpMailMessage): Promise<void>;
  sendEmailVerificationOtp(message: OtpMailMessage): Promise<void>;
  sendChangeEmailOtp(message: OtpMailMessage): Promise<void>;
};

export function createMailer(mail: MailConfig): Mailer {
  if (mail.mode === 'log') {
    return createLogMailer();
  }

  return createSmtpMailer(mail);
}
