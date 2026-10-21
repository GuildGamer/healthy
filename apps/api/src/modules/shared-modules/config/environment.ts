/**
 * Environment is read once, into explicit flags. Domain code asks
 * `environment.isProd`, never `process.env.NODE_ENV === 'production'`.
 */

import { readTestingMembership } from '../../../shared/membership/testing-membership.js';

/**
 * Which trigger drives reminder dispatch. The work itself is identical either
 * way, so moving to a platform scheduler is a config change, not a rewrite.
 */
export type SchedulerMode = 'in_process' | 'external';

/**
 * Which mailbox sends OTP mail. `EMAIL_PROVIDER` selects one.
 * Leave it unset to use SendByte when `SEND_BYTE_LIVE_KEY` is set, otherwise
 * SMTP when that transport is complete, otherwise the local log mailer.
 * Add a provider (Zepto Mail, for example) by extending this union, reading
 * its env below, and branching in `createMailer`.
 */
export const mailProviders = ['log', 'smtp', 'sendbyte'] as const;
export type MailProvider = (typeof mailProviders)[number];

/**
 * Local and development use `0` (or blank) so the process boots without a
 * real mailbox. Production refuses to start until the selected provider
 * has its credentials.
 */
export type MailConfig =
  | { mode: 'log' }
  | {
      mode: 'smtp';
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
    }
  | {
      mode: 'sendbyte';
      apiKey: string;
      from: string;
    };

const DEFAULT_SEND_BYTE_FROM = 'hello@gethealthyapp.com';

/**
 * Local and development use `0` (or blank) so gym photos are accepted
 * without a model key. Production refuses to start until a key is set.
 */
export type EvidenceVisionConfig =
  { mode: 'accept' } | { mode: 'openai'; apiKey: string; model: string };

export type AppleIapEnvironmentName = 'Sandbox' | 'Production';

export type AppleIapConfig =
  | { mode: 'disabled' }
  | {
      mode: 'enabled';
      bundleId: string;
      environment: AppleIapEnvironmentName;
      appAppleId: number | null;
    };

export type Environment = {
  isProd: boolean;
  isLocal: boolean;
  schedulerMode: SchedulerMode;
  /** Shared secret for the internal dispatch endpoint. */
  reminderDispatchSecret: string | null;
  /** Only needed once the Expo project enforces token-authenticated pushes. */
  expoAccessToken: string | null;
  mail: MailConfig;
  evidenceVision: EvidenceVisionConfig;
  appleIap: AppleIapConfig;
  /** Origin of the Next.js admin console. */
  adminAppUrl: string;
  /**
   * Origin of the marketing site. Invite links are built against it, so a
   * staging API points at a staging site and never mints a production link.
   */
  websiteUrl: string;
  adminBootstrapEmail: string | null;
  adminBootstrapPassword: string | null;
  /**
   * Testing-phase grant. Every account is a member until this is turned off.
   * Set MEMBERSHIP_BYPASS=0 before launch, then delete the testing-membership
   * call sites.
   */
  testingMembership: boolean;
};

function readOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Empty and the literal `0` both mean "not provided yet" so local `.env`
 * files can ship SMTP_* = 0 and later replace them with real values.
 */
function readConfigured(value: string | undefined): string | null {
  const trimmed = readOptional(value);
  return trimmed && trimmed !== '0' ? trimmed : null;
}

function readSmtpPort(value: string | undefined): number | null {
  const configured = readConfigured(value);

  if (!configured) {
    return null;
  }

  const port = Number(configured);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`SMTP_PORT must be an integer from 1 to 65535, got '${value}'`);
  }

  return port;
}

function readMailProvider(value: string | undefined): MailProvider | null {
  const configured = readConfigured(value);

  if (!configured) {
    return null;
  }

  const provider = configured.toLowerCase();

  if (isMailProvider(provider)) {
    return provider;
  }

  const allowed = mailProviders.map((name) => `'${name}'`).join(', ');
  throw new Error(`EMAIL_PROVIDER must be ${allowed}, got '${configured}'`);
}

function isMailProvider(value: string): value is MailProvider {
  return (mailProviders as readonly string[]).includes(value);
}

type MailPolicy = {
  isProd: boolean;
  /** Staging and production must email a real code. Local may log it. */
  requiresMailbox: boolean;
};

function readSendByteMail(source: NodeJS.ProcessEnv, policy: MailPolicy): MailConfig {
  const apiKey = readConfigured(source.SEND_BYTE_LIVE_KEY);

  if (!apiKey) {
    if (policy.requiresMailbox) {
      throw new Error('SEND_BYTE_LIVE_KEY is required when email is sent with SendByte');
    }

    return { mode: 'log' };
  }

  return {
    mode: 'sendbyte',
    apiKey,
    from: readConfigured(source.MAIL_FROM) ?? DEFAULT_SEND_BYTE_FROM,
  };
}

function readSmtpMail(
  source: NodeJS.ProcessEnv,
  policy: MailPolicy,
  required: boolean,
): MailConfig {
  const host = readConfigured(source.SMTP_HOST);
  const port = readSmtpPort(source.SMTP_PORT);
  const user = readConfigured(source.SMTP_USER);
  const pass = readConfigured(source.SMTP_PASS);
  const from = readConfigured(source.SMTP_FROM);
  const hasAny = Boolean(host || port || user || pass || from);
  const hasAll = Boolean(host && port && user && pass && from);

  if (hasAll && host && port && user && pass && from) {
    return { mode: 'smtp', host, port, user, pass, from };
  }

  if (hasAny) {
    throw new Error(
      'SMTP settings must all be real values, or all 0 / blank for the local log mailer',
    );
  }

  if (required) {
    throw new Error(
      'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM are required when EMAIL_PROVIDER is smtp',
    );
  }

  if (policy.requiresMailbox) {
    const where = policy.isProd ? 'in production' : 'outside local development';
    throw new Error(
      `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM are required ${where}`,
    );
  }

  return { mode: 'log' };
}

function readMail(source: NodeJS.ProcessEnv, policy: MailPolicy): MailConfig {
  const provider = readMailProvider(source.EMAIL_PROVIDER);

  if (provider === 'log') {
    if (policy.requiresMailbox) {
      const where = policy.isProd ? 'in production' : 'outside local development';
      throw new Error(`EMAIL_PROVIDER=log is not allowed ${where}`);
    }

    return { mode: 'log' };
  }

  if (provider === 'smtp') {
    return readSmtpMail(source, policy, true);
  }

  if (provider === 'sendbyte' || readConfigured(source.SEND_BYTE_LIVE_KEY)) {
    return readSendByteMail(source, policy);
  }

  return readSmtpMail(source, policy, false);
}

const DEFAULT_VISION_MODEL = 'gpt-4o-mini';

function readEvidenceVision(source: NodeJS.ProcessEnv, isProd: boolean): EvidenceVisionConfig {
  const apiKey = readConfigured(source.EVIDENCE_VISION_API_KEY);
  const model = readConfigured(source.EVIDENCE_VISION_MODEL) ?? DEFAULT_VISION_MODEL;

  if (apiKey) {
    return { mode: 'openai', apiKey, model };
  }

  if (isProd) {
    throw new Error('EVIDENCE_VISION_API_KEY is required in production');
  }

  return { mode: 'accept' };
}

function readAppleIap(source: NodeJS.ProcessEnv): AppleIapConfig {
  const configured = readOptional(source.APPLE_ENVIRONMENT);
  if (!configured) {
    return { mode: 'disabled' };
  }

  if (configured !== 'sandbox' && configured !== 'production') {
    throw new Error(`APPLE_ENVIRONMENT must be 'sandbox' or 'production', got '${configured}'`);
  }

  const bundleId = readConfigured(source.APPLE_BUNDLE_ID) ?? 'com.healthyapp.app';
  const appAppleIdValue = readConfigured(source.APPLE_APP_APPLE_ID);
  const appAppleId = appAppleIdValue ? Number(appAppleIdValue) : null;

  if (
    appAppleIdValue &&
    (appAppleId === null || !Number.isInteger(appAppleId) || appAppleId <= 0)
  ) {
    throw new Error('APPLE_APP_APPLE_ID must be a positive integer');
  }

  if (configured === 'production' && appAppleId === null) {
    throw new Error('APPLE_APP_APPLE_ID is required when APPLE_ENVIRONMENT is production');
  }

  return {
    mode: 'enabled',
    bundleId,
    environment: configured === 'production' ? 'Production' : 'Sandbox',
    appAppleId,
  };
}

function readSchedulerMode(value: string | undefined): SchedulerMode {
  const mode = readOptional(value) ?? 'in_process';

  if (mode === 'in_process' || mode === 'external') {
    return mode;
  }

  throw new Error(`REMINDER_SCHEDULER_MODE must be 'in_process' or 'external', got '${mode}'`);
}

/**
 * A developer machine. Staging is deployed: it must email a random code,
 * not the local `000000` shortcut.
 */
function isLocalNodeEnv(nodeEnv: string | null): boolean {
  return nodeEnv === null || nodeEnv === 'development' || nodeEnv === 'test';
}

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const nodeEnv = readOptional(source.NODE_ENV);
  const isProd = nodeEnv === 'production';
  const isLocal = isLocalNodeEnv(nodeEnv);
  const mailPolicy: MailPolicy = { isProd, requiresMailbox: !isLocal };
  const schedulerMode = readSchedulerMode(source.REMINDER_SCHEDULER_MODE);
  const reminderDispatchSecret = readOptional(source.REMINDER_DISPATCH_SECRET);

  // An external scheduler that cannot authenticate would leave reminders
  // silently unsent, so refuse to boot rather than look healthy and do nothing.
  if (schedulerMode === 'external' && !reminderDispatchSecret) {
    throw new Error(
      'REMINDER_DISPATCH_SECRET is required when REMINDER_SCHEDULER_MODE is external',
    );
  }

  return {
    isProd,
    isLocal,
    schedulerMode,
    reminderDispatchSecret,
    expoAccessToken: readOptional(source.EXPO_ACCESS_TOKEN),
    mail: readMail(source, mailPolicy),
    evidenceVision: readEvidenceVision(source, isProd),
    appleIap: readAppleIap(source),
    adminAppUrl: readOptional(source.ADMIN_APP_URL) ?? 'http://localhost:3001',
    // Not localhost by default: an invite is shared with someone else, so a
    // link only this machine can open is worse than one pointing at the
    // public site.
    websiteUrl: readOptional(source.WEBSITE_URL) ?? 'https://gethealthyapp.com',
    adminBootstrapEmail: readOptional(source.ADMIN_BOOTSTRAP_EMAIL),
    adminBootstrapPassword: readOptional(source.ADMIN_BOOTSTRAP_PASSWORD),
    testingMembership: readTestingMembership(source),
  };
}
