import type { MailConfig } from '../config/environment.js';
import { createLogMailer } from './log-mailer.js';
import { createSendByteMailer } from './sendbyte-mailer.js';
import { createSmtpMailer } from './smtp-mailer.js';

export type OtpMailMessage = {
  to: string;
  otp: string;
};

export type PasswordResetOtpMessage = OtpMailMessage;

export type PlainMailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type Mailer = {
  sendPasswordResetOtp(message: OtpMailMessage): Promise<void>;
  sendEmailVerificationOtp(message: OtpMailMessage): Promise<void>;
  sendChangeEmailOtp(message: OtpMailMessage): Promise<void>;
  sendMessage(message: PlainMailMessage): Promise<void>;
};

export function createMailer(mail: MailConfig): Mailer {
  switch (mail.mode) {
    case 'log':
      return createLogMailer();
    case 'smtp':
      return createSmtpMailer(mail);
    case 'sendbyte':
      return createSendByteMailer(mail);
    default: {
      const unexpected: never = mail;
      throw new Error(`Unsupported mail provider: ${String(unexpected)}`);
    }
  }
}
