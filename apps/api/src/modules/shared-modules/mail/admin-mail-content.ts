import { brandedMail, type MailParts } from './mail-layout.js';

/** Operator broadcast wrapped in the Healthy shell. */
export function adminBroadcastMail(input: {
  title: string;
  text: string;
}): MailParts {
  return brandedMail({
    subject: input.title,
    eyebrow: 'From Healthy',
    headline: input.title,
    bodyLines: input.text.split(/\n+/).filter((line) => line.trim().length > 0),
  });
}

/** Credentials email when a superadmin creates an operator. */
export function operatorInviteMail(input: {
  name: string;
  email: string;
  adminAppUrl: string;
}): MailParts {
  return brandedMail({
    subject: 'You’re an operator on Healthy',
    eyebrow: 'Admin',
    headline: `Welcome, ${input.name}`,
    bodyLines: [
      `Your operator account is ready for ${input.email}.`,
      'Sign in with the password you were given when the account was created.',
    ],
    cta: { label: 'Open admin', url: input.adminAppUrl },
  });
}
