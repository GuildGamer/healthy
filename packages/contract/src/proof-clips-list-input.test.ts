import { describe, expect, it } from 'vitest';
import { listMatchProofClipsInputSchema } from './proof-clips.js';

describe('listMatchProofClipsInputSchema', () => {
  it('accepts real booleans from typed clients', () => {
    expect(
      listMatchProofClipsInputSchema.parse({
        matchId: 'match1',
        allDays: true,
      }),
    ).toEqual({ matchId: 'match1', allDays: true });

    expect(
      listMatchProofClipsInputSchema.parse({
        matchId: 'match1',
        allDays: false,
      }),
    ).toEqual({ matchId: 'match1', allDays: false });
  });

  it('coerces GET query-string booleans without flipping false to true', () => {
    expect(
      listMatchProofClipsInputSchema.parse({
        matchId: 'match1',
        allDays: 'false',
      }),
    ).toEqual({ matchId: 'match1', allDays: false });

    expect(
      listMatchProofClipsInputSchema.parse({
        matchId: 'match1',
        allDays: 'true',
      }),
    ).toEqual({ matchId: 'match1', allDays: true });
  });

  it('allows omitting allDays', () => {
    expect(
      listMatchProofClipsInputSchema.parse({ matchId: 'match1' }),
    ).toEqual({ matchId: 'match1' });
  });

  it('rejects other string values', () => {
    expect(
      listMatchProofClipsInputSchema.safeParse({
        matchId: 'match1',
        allDays: 'yes',
      }).success,
    ).toBe(false);
  });
});
