/**
 * Environment is read once, into explicit flags. Domain code asks
 * `environment.isProd`, never `process.env.NODE_ENV === 'production'`.
 */

/**
 * Which trigger drives reminder dispatch. The work itself is identical either
 * way, so moving to a platform scheduler is a config change, not a rewrite.
 */
export type SchedulerMode = 'in_process' | 'external';

/**
 * Local and development use `0` (or blank) so the process boots without a
 * real mailbox. Production refuses to start until every SMTP field is set.
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
    };

/**
 * Local and development use `0` (or blank) so gym photos are accepted
 * without a model key. Production refuses to start until a key is set.
 */
export type EvidenceVisionConfig =
  | { mode: 'accept' }
  | { mode: 'openai'; apiKey: string; model: string };

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
  /** Origin of the Next.js admin console. */
  adminAppUrl: string;
  adminBootstrapEmail: string | null;
  adminBootstrapPassword: string | null;
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

function readMail(source: NodeJS.ProcessEnv, isProd: boolean): MailConfig {
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

  if (isProd) {
    throw new Error(
      'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM are required in production',
    );
  }

  if (hasAny && !hasAll) {
    throw new Error(
      'SMTP settings must all be real values, or all 0 / blank for the local log mailer',
    );
  }

  return { mode: 'log' };
}

const DEFAULT_VISION_MODEL = 'gpt-4o-mini';

function readEvidenceVision(
  source: NodeJS.ProcessEnv,
  isProd: boolean,
): EvidenceVisionConfig {
  const apiKey = readConfigured(source.EVIDENCE_VISION_API_KEY);
  const model =
    readConfigured(source.EVIDENCE_VISION_MODEL) ?? DEFAULT_VISION_MODEL;

  if (apiKey) {
    return { mode: 'openai', apiKey, model };
  }

  if (isProd) {
    throw new Error('EVIDENCE_VISION_API_KEY is required in production');
  }

  return { mode: 'accept' };
}

function readSchedulerMode(value: string | undefined): SchedulerMode {
  const mode = readOptional(value) ?? 'in_process';

  if (mode === 'in_process' || mode === 'external') {
    return mode;
  }

  throw new Error(
    `REMINDER_SCHEDULER_MODE must be 'in_process' or 'external', got '${mode}'`,
  );
}

export function readEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): Environment {
  const isProd = readOptional(source.NODE_ENV) === 'production';
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
    isLocal: !isProd,
    schedulerMode,
    reminderDispatchSecret,
    expoAccessToken: readOptional(source.EXPO_ACCESS_TOKEN),
    mail: readMail(source, isProd),
    evidenceVision: readEvidenceVision(source, isProd),
    adminAppUrl: readOptional(source.ADMIN_APP_URL) ?? 'http://localhost:3001',
    adminBootstrapEmail: readOptional(source.ADMIN_BOOTSTRAP_EMAIL),
    adminBootstrapPassword: readOptional(source.ADMIN_BOOTSTRAP_PASSWORD),
  };
}
