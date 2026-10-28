/**
 * Environment is read once, into explicit flags. Domain code asks
 * `environment.isProd`, never `process.env.NODE_ENV === 'production'`.
 */

import {
  PROOF_CLIP_BIT_RATE_MAX,
  PROOF_CLIP_BIT_RATE_MIN,
  PROOF_CLIP_DEFAULT_ENCODING,
  PROOF_CLIP_FRAME_RATE_MAX,
  PROOF_CLIP_FRAME_RATE_MIN,
  PROOF_CLIP_HEIGHT_MAX,
  PROOF_CLIP_HEIGHT_MIN,
  PROOF_CLIP_WIDTH_MAX,
  PROOF_CLIP_WIDTH_MIN,
  type ProofClipEncoding,
} from '@product/contract';
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
 * Which model checks a gym photo. `EVIDENCE_VISION_PROVIDER` selects one.
 * Leave it unset: a real key uses OpenAI, and `0` / blank accepts every
 * photo outside production. Add a provider by extending this union, reading
 * its env in `readEvidenceVision`, and branching in `createEvidenceValidator`.
 */
export const evidenceVisionProviders = [
  'accept',
  'openai',
  'gemini',
  'openai-compatible',
] as const;
export type EvidenceVisionProvider = (typeof evidenceVisionProviders)[number];

/**
 * Local and development use `0` (or blank) so gym photos are accepted
 * without a model key. Production refuses to start until a key is set.
 * An explicit provider other than `accept` requires its key in every environment.
 */
export type EvidenceVisionConfig =
  | { mode: 'accept' }
  | { mode: 'openai'; apiKey: string; model: string }
  | { mode: 'gemini'; apiKey: string; model: string }
  | { mode: 'openai-compatible'; apiKey: string; model: string; baseUrl: string };

export type AppleIapEnvironmentName = 'Sandbox' | 'Production';

export type AppleIapConfig =
  | { mode: 'disabled' }
  | {
      mode: 'enabled';
      bundleId: string;
      environment: AppleIapEnvironmentName;
      appAppleId: number | null;
    };

/**
 * Object storage for proof clips. `STORAGE_PROVIDER` selects one.
 * Leave it unset locally to boot without a bucket; deployed environments
 * refuse to start until credentials are complete. R2, B2, and MinIO all use
 * the S3-compatible adapter.
 */
export const storageProviders = ['r2', 'b2', 'minio', 's3'] as const;
export type StorageProvider = (typeof storageProviders)[number];

export type S3StorageConfig = {
  mode: 's3';
  provider: StorageProvider;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** MinIO and some B2 setups need path-style URLs. */
  forcePathStyle: boolean;
};

export type StorageConfig = { mode: 'disabled' } | S3StorageConfig;

/** Encoder settings returned on proof-clip reserve. Env overrides the contract defaults. */
export type ProofClipEncodingConfig = ProofClipEncoding;

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
  storage: StorageConfig;
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
  /** Bitrate, frame rate, and size the phone uses when it records a proof clip. */
  proofClipEncoding: ProofClipEncodingConfig;
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

const DEFAULT_OPENAI_VISION_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_VISION_MODEL = 'gemini-2.5-flash';

function readEvidenceVisionProvider(
  value: string | undefined,
): EvidenceVisionProvider | null {
  const configured = readConfigured(value);

  if (!configured) {
    return null;
  }

  const provider = configured.toLowerCase();

  if (isEvidenceVisionProvider(provider)) {
    return provider;
  }

  const allowed = evidenceVisionProviders.map((name) => `'${name}'`).join(', ');
  throw new Error(`EVIDENCE_VISION_PROVIDER must be ${allowed}, got '${configured}'`);
}

function isEvidenceVisionProvider(value: string): value is EvidenceVisionProvider {
  return (evidenceVisionProviders as readonly string[]).includes(value);
}

function readEvidenceVision(source: NodeJS.ProcessEnv, isProd: boolean): EvidenceVisionConfig {
  const provider = readEvidenceVisionProvider(source.EVIDENCE_VISION_PROVIDER);
  const apiKey = readConfigured(source.EVIDENCE_VISION_API_KEY);
  const model = readConfigured(source.EVIDENCE_VISION_MODEL);

  if (provider === 'accept') {
    if (isProd) {
      throw new Error('EVIDENCE_VISION_PROVIDER=accept is not allowed in production');
    }

    return { mode: 'accept' };
  }

  if (provider === null) {
    if (!apiKey) {
      if (isProd) {
        throw new Error('EVIDENCE_VISION_API_KEY is required in production');
      }

      return { mode: 'accept' };
    }

    return { mode: 'openai', apiKey, model: model ?? DEFAULT_OPENAI_VISION_MODEL };
  }

  if (!apiKey) {
    throw new Error(
      `EVIDENCE_VISION_API_KEY is required when EVIDENCE_VISION_PROVIDER is ${provider}`,
    );
  }

  if (provider === 'openai') {
    return { mode: 'openai', apiKey, model: model ?? DEFAULT_OPENAI_VISION_MODEL };
  }

  if (provider === 'gemini') {
    return { mode: 'gemini', apiKey, model: model ?? DEFAULT_GEMINI_VISION_MODEL };
  }

  if (provider !== 'openai-compatible') {
    const unexpected: never = provider;
    throw new Error(`Unsupported evidence vision provider: ${String(unexpected)}`);
  }

  const baseUrl = readConfigured(source.EVIDENCE_VISION_BASE_URL);

  if (!baseUrl) {
    throw new Error(
      'EVIDENCE_VISION_BASE_URL is required when EVIDENCE_VISION_PROVIDER is openai-compatible',
    );
  }

  if (!model) {
    throw new Error(
      'EVIDENCE_VISION_MODEL is required when EVIDENCE_VISION_PROVIDER is openai-compatible',
    );
  }

  return { mode: 'openai-compatible', apiKey, model, baseUrl };
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

function isStorageProvider(value: string): value is StorageProvider {
  return (storageProviders as readonly string[]).includes(value);
}

function readOptionalInt(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
): number | null {
  const configured = readConfigured(value);
  if (!configured) {
    return null;
  }

  const parsed = Number(configured);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}, got '${value}'`);
  }
  return parsed;
}

function readEvenDimension(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
): number | null {
  const parsed = readOptionalInt(value, name, min, max);
  if (parsed === null) {
    return null;
  }
  if (parsed % 2 !== 0) {
    throw new Error(`${name} must be even, got '${value}'`);
  }
  return parsed;
}

/**
 * Unset keys keep the contract defaults. A set value outside the allowed range
 * refuses to boot so a typo cannot ship a soft or oversized clip profile.
 */
function readProofClipEncoding(source: NodeJS.ProcessEnv): ProofClipEncodingConfig {
  const bitRate =
    readOptionalInt(
      source.PROOF_CLIP_BIT_RATE,
      'PROOF_CLIP_BIT_RATE',
      PROOF_CLIP_BIT_RATE_MIN,
      PROOF_CLIP_BIT_RATE_MAX,
    ) ?? PROOF_CLIP_DEFAULT_ENCODING.bitRate;
  const frameRate =
    readOptionalInt(
      source.PROOF_CLIP_FRAME_RATE,
      'PROOF_CLIP_FRAME_RATE',
      PROOF_CLIP_FRAME_RATE_MIN,
      PROOF_CLIP_FRAME_RATE_MAX,
    ) ?? PROOF_CLIP_DEFAULT_ENCODING.frameRate;
  const width =
    readEvenDimension(
      source.PROOF_CLIP_WIDTH,
      'PROOF_CLIP_WIDTH',
      PROOF_CLIP_WIDTH_MIN,
      PROOF_CLIP_WIDTH_MAX,
    ) ?? PROOF_CLIP_DEFAULT_ENCODING.width;
  const height =
    readEvenDimension(
      source.PROOF_CLIP_HEIGHT,
      'PROOF_CLIP_HEIGHT',
      PROOF_CLIP_HEIGHT_MIN,
      PROOF_CLIP_HEIGHT_MAX,
    ) ?? PROOF_CLIP_DEFAULT_ENCODING.height;

  return { bitRate, frameRate, width, height };
}

function readStorage(
  source: NodeJS.ProcessEnv,
  requiresStorage: boolean,
): StorageConfig {
  const providerRaw = readConfigured(source.STORAGE_PROVIDER)?.toLowerCase() ?? null;
  const endpoint = readConfigured(source.STORAGE_ENDPOINT);
  const region = readConfigured(source.STORAGE_REGION) ?? 'auto';
  const bucket = readConfigured(source.STORAGE_BUCKET);
  const accessKeyId = readConfigured(source.STORAGE_ACCESS_KEY_ID);
  const secretAccessKey = readConfigured(source.STORAGE_SECRET_ACCESS_KEY);
  const hasAny = Boolean(providerRaw || endpoint || bucket || accessKeyId || secretAccessKey);

  if (!hasAny) {
    if (requiresStorage) {
      throw new Error(
        'STORAGE_PROVIDER and credentials are required outside local development',
      );
    }
    return { mode: 'disabled' };
  }

  if (!providerRaw || !isStorageProvider(providerRaw)) {
    const allowed = storageProviders.map((name) => `'${name}'`).join(', ');
    throw new Error(
      `STORAGE_PROVIDER must be ${allowed}, got '${source.STORAGE_PROVIDER ?? ''}'`,
    );
  }

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY are required when STORAGE_PROVIDER is set',
    );
  }

  return {
    mode: 's3',
    provider: providerRaw,
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    // R2, B2, and MinIO all speak path-style S3 URLs. Virtual-hosted is AWS-only.
    forcePathStyle: true,
  };
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
    storage: readStorage(source, !isLocal),
    adminAppUrl: readOptional(source.ADMIN_APP_URL) ?? 'http://localhost:3001',
    // Not localhost by default: an invite is shared with someone else, so a
    // link only this machine can open is worse than one pointing at the
    // public site. The apex host 308s to www, and a redirect cannot be a
    // universal / app link, so the shared origin is www.
    websiteUrl: readOptional(source.WEBSITE_URL) ?? 'https://www.gethealthyapp.com',
    adminBootstrapEmail: readOptional(source.ADMIN_BOOTSTRAP_EMAIL),
    adminBootstrapPassword: readOptional(source.ADMIN_BOOTSTRAP_PASSWORD),
    testingMembership: readTestingMembership(source),
    proofClipEncoding: readProofClipEncoding(source),
  };
}
