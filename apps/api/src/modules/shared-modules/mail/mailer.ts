import type { MailConfig } from '../config/environment.js';
import { createLogMailer } from './log-mailer.js';
import { createSmtpMailer } from './smtp-mailer.js';

export type PasswordResetOtpMessage = {
  to: string;
  otp: string;
};

export type Mailer = {
  sendPasswordResetOtp(message: PasswordResetOtpMessage): Promise<void>;
};

export function createMailer(mail: MailConfig): Mailer {
  if (mail.mode === 'log') {
    return createLogMailer();
  }

  return createSmtpMailer(mail);
}
