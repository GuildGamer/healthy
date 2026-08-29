import {
  FALLBACK_CHALLENGE_ICON,
  resolveChallengeIcon,
} from './challenge-icon';

describe('resolveChallengeIcon', () => {
  it('keeps a Material Community Icons name from the catalog', () => {
    expect(resolveChallengeIcon('walk')).toBe('walk');
    expect(resolveChallengeIcon('heart-pulse')).toBe('heart-pulse');
  });

  it('falls back when the catalog name is not in the pack', () => {
    expect(resolveChallengeIcon('not-a-real-glyph')).toBe(
      FALLBACK_CHALLENGE_ICON,
    );
  });
});
