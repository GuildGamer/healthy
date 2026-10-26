import {
  CHALLENGES_SEGMENTS,
  challengesTabHref,
  DEFAULT_CHALLENGES_SEGMENT,
  parseChallengesSegment,
} from './challenges-tab';

describe('parseChallengesSegment', () => {
  it('keeps a known segment', () => {
    expect(parseChallengesSegment('mine')).toBe('mine');
    expect(parseChallengesSegment('groups')).toBe('groups');
  });

  it('falls back to Groups for missing or unknown values', () => {
    expect(parseChallengesSegment(undefined)).toBe(DEFAULT_CHALLENGES_SEGMENT);
    expect(parseChallengesSegment('other')).toBe('groups');
    expect(parseChallengesSegment(['mine', 'groups'])).toBe('mine');
  });
});

describe('challengesTabHref', () => {
  it('omits the query for Groups, the default', () => {
    expect(challengesTabHref()).toBe('/(tabs)/challenges');
    expect(challengesTabHref('groups')).toBe('/(tabs)/challenges');
  });

  it('adds the segment for Mine', () => {
    expect(challengesTabHref('mine')).toBe('/(tabs)/challenges?segment=mine');
  });
});

describe('CHALLENGES_SEGMENTS', () => {
  it('lists Groups before Mine', () => {
    expect(CHALLENGES_SEGMENTS.map((segment) => segment.id)).toEqual(['groups', 'mine']);
  });
});
