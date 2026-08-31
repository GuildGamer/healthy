import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHALLENGE_ICON,
  healthOutputSchema,
  toChallengeIcon,
} from '../src/index';

describe('healthOutputSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = healthOutputSchema.parse({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
    expect(parsed.status).toBe('ok');
  });
});

describe('toChallengeIcon', () => {
  it('keeps a valid Material Community Icons name', () => {
    expect(toChallengeIcon('heart-pulse')).toBe('heart-pulse');
  });

  it('falls back when the name is empty or malformed', () => {
    expect(toChallengeIcon('')).toBe(DEFAULT_CHALLENGE_ICON);
    expect(toChallengeIcon('Heart Pulse')).toBe(DEFAULT_CHALLENGE_ICON);
    expect(toChallengeIcon(null)).toBe(DEFAULT_CHALLENGE_ICON);
  });
});
