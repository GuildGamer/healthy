import { brandedMail, type MailParts } from './mail-layout.js';

export type OtpMailKind = 'password-reset' | 'email-verification' | 'change-email';

const OTP_FOOTER =
  'It expires in 5 minutes. If you did not ask for this, you can ignore this email.';

const OTP_MAIL: Record<
  OtpMailKind,
  { subject: string; headline: string; intro: (otp: string) => string }
> = {
  'password-reset': {
    subject: 'Your Healthy password reset code',
    headline: 'Reset your password',
    intro: (otp) => `Your password reset code is ${otp}.`,
  },
  'email-verification': {
    subject: 'Your Healthy verification code',
    headline: 'Verify your email',
    intro: (otp) => `Your email verification code is ${otp}.`,
  },
  'change-email': {
    subject: 'Confirm your new Healthy email',
    headline: 'Confirm your new email',
    intro: (otp) => `Your email change code is ${otp}.`,
  },
};

export function otpMailContent(kind: OtpMailKind, otp: string): MailParts {
  const template = OTP_MAIL[kind];

  return brandedMail({
    subject: template.subject,
    headline: template.headline,
    bodyLines: [template.intro(otp), OTP_FOOTER],
  });
}
