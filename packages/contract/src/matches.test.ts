import { describe, expect, it } from 'vitest';
import {
  MATCH_PARTICIPANT_CAP,
  matchContestTitle,
  matchInviteUrl,
} from './matches';

describe('matchInviteUrl', () => {
  it('builds an https link so a recipient without the app reaches a page', () => {
    expect(matchInviteUrl('https://gethealthyapp.com', 'abc_token-1')).toBe(
      'https://gethealthyapp.com/match/abc_token-1',
    );
  });

  it('tolerates a configured origin with a trailing slash', () => {
    expect(matchInviteUrl('https://gethealthyapp.com/', 'abc_token-1')).toBe(
      'https://gethealthyapp.com/match/abc_token-1',
    );
  });
});

describe('MATCH_PARTICIPANT_CAP', () => {
  it('caps a match at eight people', () => {
    expect(MATCH_PARTICIPANT_CAP).toBe(8);
  });
});

describe('matchContestTitle', () => {
  it('names a solo host match as waiting', () => {
    expect(matchContestTitle([])).toBe('Waiting for a friend');
  });

  it('names the other people in the contest', () => {
    expect(matchContestTitle(['Bee'])).toBe('vs Bee');
    expect(matchContestTitle(['Bee', 'Cam'])).toBe('vs Bee and Cam');
    expect(matchContestTitle(['Bee', 'Cam', 'Dee'])).toBe('vs Bee +2');
  });
});
