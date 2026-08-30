import nodemailer from 'nodemailer';
import type { MailConfig } from '../config/environment.js';
import type { Mailer, OtpMailMessage } from './mailer.js';

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

  async function sendOtp(
    message: OtpMailMessage,
    subject: string,
    intro: string,
  ): Promise<void> {
    await transport.sendMail({
      from: mail.from,
      to: message.to,
      subject,
      text: [
        intro,
        'It expires in 5 minutes. If you did not ask for this, you can ignore this email.',
      ].join('\n'),
    });
  }

  return {
    async sendPasswordResetOtp(message: OtpMailMessage) {
      await sendOtp(
        message,
        'Your Healthy password reset code',
        `Your password reset code is ${message.otp}.`,
      );
    },
    async sendEmailVerificationOtp(message: OtpMailMessage) {
      await sendOtp(
        message,
        'Your Healthy verification code',
        `Your email verification code is ${message.otp}.`,
      );
    },
    async sendChangeEmailOtp(message: OtpMailMessage) {
      await sendOtp(
        message,
        'Confirm your new Healthy email',
        `Your email change code is ${message.otp}.`,
      );
    },
  };
}
