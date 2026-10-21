import { SendByte, SendByteError } from '@sendbyte/node';
import type { MailConfig } from '../config/environment.js';
import type { Mailer, OtpMailMessage, PlainMailMessage } from './mailer.js';
import { otpMailContent, type OtpMailKind } from './otp-mail-content.js';

export type SendByteMailConfig = Extract<MailConfig, { mode: 'sendbyte' }>;

export type SendByteEmailClient = {
  emails: {
    send(message: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    }): Promise<{ id: string }>;
  };
};

export function createSendByteMailer(
  mail: SendByteMailConfig,
  client: SendByteEmailClient = new SendByte(mail.apiKey),
): Mailer {
  async function sendOtp(message: OtpMailMessage, kind: OtpMailKind): Promise<void> {
    const content = otpMailContent(kind, message.otp);

    try {
      await client.emails.send({
        from: mail.from,
        to: message.to,
        subject: content.subject,
        text: content.text,
        html: toHtml(content.text),
      });
    } catch (error) {
      throw toSendFailure(error);
    }
  }

  async function sendMessage(message: PlainMailMessage): Promise<void> {
    try {
      await client.emails.send({
        from: mail.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: toHtml(message.text),
      });
    } catch (error) {
      throw toSendFailure(error);
    }
  }

  return {
    sendPasswordResetOtp: (message) => sendOtp(message, 'password-reset'),
    sendEmailVerificationOtp: (message) => sendOtp(message, 'email-verification'),
    sendChangeEmailOtp: (message) => sendOtp(message, 'change-email'),
    sendMessage,
  };
}

function toHtml(text: string): string {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  return `<p>${escaped.replaceAll('\n', '<br>')}</p>`;
}

function toSendFailure(error: unknown): Error {
  if (error instanceof SendByteError) {
    return new Error(`SendByte email failed (${error.code}): ${error.message}`);
  }

  if (error instanceof Error && error.message.trim()) {
    return new Error(`SendByte email failed: ${error.message}`);
  }

  return new Error('SendByte email failed');
}
