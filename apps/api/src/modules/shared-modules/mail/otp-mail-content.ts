import { brandedMail, type MailParts } from './mail-layout.js';

export type OtpMailKind = 'password-reset' | 'email-verification' | 'change-email';

const OTP_FOOTER =
  'It expires in 5 minutes. If you did not ask for this, you can ignore this email.';

const OTP_MAIL: Record<
  OtpMailKind,
  { subject: string; intro: string }
> = {
  'password-reset': {
    subject: 'Your Healthy password reset code',
    intro: 'Use this code to reset your password.',
  },
  'email-verification': {
    subject: 'Your Healthy verification code',
    intro: 'Use this code to verify your email.',
  },
  'change-email': {
    subject: 'Confirm your new Healthy email',
    intro: 'Use this code to confirm your new email.',
  },
};

export function otpMailContent(kind: OtpMailKind, otp: string): MailParts {
  const template = OTP_MAIL[kind];

  return brandedMail({
    subject: template.subject,
    bodyLines: [template.intro, OTP_FOOTER],
    code: otp,
  });
}
