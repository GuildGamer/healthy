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
    expect(environment.evidenceVision).toEqual({ mode: 'accept' });
    expect(environment.appleIap).toEqual({ mode: 'disabled' });
    expect(environment.adminAppUrl).toBe('http://localhost:3001');
    expect(environment.websiteUrl).toBe('https://gethealthyapp.com');
    expect(environment.adminBootstrapEmail).toBeNull();
  });

  it('treats only production as production', () => {
    const production = readEnvironment({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'noreply@example.com',
      EVIDENCE_VISION_API_KEY: 'sk-test',
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
    expect(() => readEnvironment({ REMINDER_SCHEDULER_MODE: 'external' })).toThrow(
      /REMINDER_DISPATCH_SECRET is required/,
    );
  });

  it('rejects an unrecognised scheduler mode', () => {
    expect(() => readEnvironment({ REMINDER_SCHEDULER_MODE: 'cron-ish' })).toThrow(
      /must be 'in_process' or 'external'/,
    );
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
    expect(() => readEnvironment({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: '0' })).toThrow(
      /all be real values/,
    );
  });

  it('refuses production without a complete SMTP transport', () => {
    expect(() =>
      readEnvironment({
        NODE_ENV: 'production',
        EVIDENCE_VISION_API_KEY: 'sk-test',
      }),
    ).toThrow(/required in production/);
  });

  it('treats a missing vision key as the local accept stub', () => {
    const environment = readEnvironment({ EVIDENCE_VISION_API_KEY: '0' });

    expect(environment.evidenceVision).toEqual({ mode: 'accept' });
  });

  it('reads an OpenAI vision key', () => {
    const environment = readEnvironment({
      EVIDENCE_VISION_API_KEY: 'sk-live',
      EVIDENCE_VISION_MODEL: 'gpt-4o',
    });

    expect(environment.evidenceVision).toEqual({
      mode: 'openai',
      apiKey: 'sk-live',
      model: 'gpt-4o',
    });
  });

  it('refuses production without a vision key', () => {
    expect(() =>
      readEnvironment({
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_USER: 'mailer',
        SMTP_PASS: 'secret',
        SMTP_FROM: 'noreply@example.com',
      }),
    ).toThrow(/EVIDENCE_VISION_API_KEY is required/);
  });

  it('enables Apple IAP in sandbox without an App Apple ID', () => {
    const environment = readEnvironment({
      APPLE_ENVIRONMENT: 'sandbox',
      APPLE_BUNDLE_ID: 'com.healthyapp.app',
    });

    expect(environment.appleIap).toEqual({
      mode: 'enabled',
      bundleId: 'com.healthyapp.app',
      environment: 'Sandbox',
      appAppleId: null,
    });
  });

  it('requires APPLE_APP_APPLE_ID in the production Apple environment', () => {
    expect(() => readEnvironment({ APPLE_ENVIRONMENT: 'production' })).toThrow(
      /APPLE_APP_APPLE_ID is required/,
    );
  });

  it('enables production Apple IAP when an App Apple ID is set', () => {
    const environment = readEnvironment({
      APPLE_ENVIRONMENT: 'production',
      APPLE_APP_APPLE_ID: '1234567890',
    });

    expect(environment.appleIap).toEqual({
      mode: 'enabled',
      bundleId: 'com.healthyapp.app',
      environment: 'Production',
      appAppleId: 1_234_567_890,
    });
  });

  it('rejects an unknown APPLE_ENVIRONMENT', () => {
    expect(() => readEnvironment({ APPLE_ENVIRONMENT: 'staging' })).toThrow(
      /APPLE_ENVIRONMENT must be 'sandbox' or 'production'/,
    );
  });

  it('uses SendByte when the live key is set and no provider is chosen', () => {
    const environment = readEnvironment({
      SEND_BYTE_LIVE_KEY: 'sk_live_test',
    });

    expect(environment.mail).toEqual({
      mode: 'sendbyte',
      apiKey: 'sk_live_test',
      from: 'hello@gethealthyapp.com',
    });
  });

  it('reads an explicit SendByte mailbox and from address', () => {
    const environment = readEnvironment({
      EMAIL_PROVIDER: 'SendByte',
      SEND_BYTE_LIVE_KEY: 'sk_live_test',
      MAIL_FROM: 'Healthy <hello@gethealthyapp.com>',
    });

    expect(environment.mail).toEqual({
      mode: 'sendbyte',
      apiKey: 'sk_live_test',
      from: 'Healthy <hello@gethealthyapp.com>',
    });
  });

  it('keeps SMTP when that provider is selected beside a SendByte key', () => {
    const environment = readEnvironment({
      EMAIL_PROVIDER: 'smtp',
      SEND_BYTE_LIVE_KEY: 'sk_live_test',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'mailer',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'noreply@example.com',
    });

    expect(environment.mail).toEqual({
      mode: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      user: 'mailer',
      pass: 'secret',
      from: 'noreply@example.com',
    });
  });

  it('treats a blank SendByte key as the local log mailer', () => {
    const environment = readEnvironment({
      EMAIL_PROVIDER: 'sendbyte',
      SEND_BYTE_LIVE_KEY: '0',
    });

    expect(environment.mail).toEqual({ mode: 'log' });
  });

  it('boots production on SendByte without SMTP', () => {
    const environment = readEnvironment({
      NODE_ENV: 'production',
      EMAIL_PROVIDER: 'sendbyte',
      SEND_BYTE_LIVE_KEY: 'sk_live_test',
      EVIDENCE_VISION_API_KEY: 'sk-test',
    });

    expect(environment.mail).toEqual({
      mode: 'sendbyte',
      apiKey: 'sk_live_test',
      from: 'hello@gethealthyapp.com',
    });
  });

  it('refuses production SendByte without a key', () => {
    expect(() =>
      readEnvironment({
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'sendbyte',
        EVIDENCE_VISION_API_KEY: 'sk-test',
      }),
    ).toThrow(/SEND_BYTE_LIVE_KEY is required/);
  });

  it('refuses the log mailer in production', () => {
    expect(() =>
      readEnvironment({
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'log',
        EVIDENCE_VISION_API_KEY: 'sk-test',
      }),
    ).toThrow(/EMAIL_PROVIDER=log is not allowed/);
  });

  it('rejects an unknown email provider', () => {
    expect(() => readEnvironment({ EMAIL_PROVIDER: 'zeptomail' })).toThrow(
      /EMAIL_PROVIDER must be 'log', 'smtp', 'sendbyte'/,
    );
  });
});
