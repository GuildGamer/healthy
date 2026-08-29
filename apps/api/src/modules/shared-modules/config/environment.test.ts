import { describe, expect, it } from 'vitest';
import { readEnvironment } from './environment.js';

describe('readEnvironment', () => {
  it('defaults to local, in-process scheduling', () => {
    const environment = readEnvironment({});

    expect(environment.isProd).toBe(false);
    expect(environment.isLocal).toBe(true);
    expect(environment.schedulerMode).toBe('in_process');
    expect(environment.reminderDispatchSecret).toBeNull();
    expect(environment.mail).toEqual({ mode: 'log' });
  });

  it('treats only production as production', () => {
    const production = readEnvironment({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'noreply@example.com',
    });

    expect(production.isProd).toBe(true);
    expect(readEnvironment({ NODE_ENV: 'staging' }).isProd).toBe(false);
    expect(readEnvironment({ NODE_ENV: 'test' }).isLocal).toBe(true);
  });

  it('accepts external scheduling when a dispatch secret is present', () => {
    const environment = readEnvironment({
      REMINDER_SCHEDULER_MODE: 'external',
      REMINDER_DISPATCH_SECRET: 'shared-secret',
    });

    expect(environment.schedulerMode).toBe('external');
    expect(environment.reminderDispatchSecret).toBe('shared-secret');
  });

  it('refuses external scheduling without a dispatch secret', () => {
    expect(() =>
      readEnvironment({ REMINDER_SCHEDULER_MODE: 'external' }),
    ).toThrow(/REMINDER_DISPATCH_SECRET is required/);
  });

  it('rejects an unrecognised scheduler mode', () => {
    expect(() =>
      readEnvironment({ REMINDER_SCHEDULER_MODE: 'cron-ish' }),
    ).toThrow(/must be 'in_process' or 'external'/);
  });

  it('treats blank values as absent', () => {
    const environment = readEnvironment({
      REMINDER_DISPATCH_SECRET: '   ',
      EXPO_ACCESS_TOKEN: '',
    });

    expect(environment.reminderDispatchSecret).toBeNull();
    expect(environment.expoAccessToken).toBeNull();
  });

  it('treats SMTP 0s as the local log mailer', () => {
    const environment = readEnvironment({
      SMTP_HOST: '0',
      SMTP_PORT: '0',
      SMTP_USER: '0',
      SMTP_PASS: '0',
      SMTP_FROM: '0',
    });

    expect(environment.mail).toEqual({ mode: 'log' });
  });

  it('reads a complete SMTP transport', () => {
    const environment = readEnvironment({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'Healthy <noreply@example.com>',
    });

    expect(environment.mail).toEqual({
      mode: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      user: 'mailer',
      pass: 'secret',
      from: 'Healthy <noreply@example.com>',
    });
  });

  it('refuses a partial SMTP config in any environment', () => {
    expect(() =>
      readEnvironment({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: '0' }),
    ).toThrow(/all be real values/);
  });

  it('refuses production without a complete SMTP transport', () => {
    expect(() => readEnvironment({ NODE_ENV: 'production' })).toThrow(
      /required in production/,
    );
  });
});
