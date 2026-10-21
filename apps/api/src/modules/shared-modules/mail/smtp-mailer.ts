import nodemailer from 'nodemailer';
import type { MailConfig } from '../config/environment.js';
import type { Mailer, OtpMailMessage, PlainMailMessage } from './mailer.js';
import { otpMailContent, type OtpMailKind } from './otp-mail-content.js';

type SmtpMailConfig = Extract<MailConfig, { mode: 'smtp' }>;

export function createSmtpMailer(mail: SmtpMailConfig): Mailer {
  const transport = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    auth: {
      user: mail.user,
      pass: mail.pass,
    },
  });

  async function sendOtp(message: OtpMailMessage, kind: OtpMailKind): Promise<void> {
    const content = otpMailContent(kind, message.otp);

    await transport.sendMail({
      from: mail.from,
      to: message.to,
      subject: content.subject,
      text: content.text,
    });
  }

  return {
    async sendPasswordResetOtp(message: OtpMailMessage) {
      await sendOtp(message, 'password-reset');
    },
    async sendEmailVerificationOtp(message: OtpMailMessage) {
      await sendOtp(message, 'email-verification');
    },
    async sendChangeEmailOtp(message: OtpMailMessage) {
      await sendOtp(message, 'change-email');
    },
    async sendMessage(message: PlainMailMessage) {
      await transport.sendMail({
        from: mail.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
    },
  };
}
