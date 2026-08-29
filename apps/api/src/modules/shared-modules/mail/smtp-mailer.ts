import nodemailer from 'nodemailer';
import type { MailConfig } from '../config/environment.js';
import type { Mailer, PasswordResetOtpMessage } from './mailer.js';

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

  return {
    async sendPasswordResetOtp(message: PasswordResetOtpMessage) {
      await transport.sendMail({
        from: mail.from,
        to: message.to,
        subject: 'Your Healthy password reset code',
        text: [
          `Your password reset code is ${message.otp}.`,
          'It expires in 5 minutes. If you did not ask for this, you can ignore this email.',
        ].join('\n'),
      });
    },
  };
}
