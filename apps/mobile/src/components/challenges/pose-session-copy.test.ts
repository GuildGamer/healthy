import {
  POSE_MOVE_INTO_FRAME,
  POSE_TARGET_BADGE,
  POSE_TOO_CLOSE,
  poseCoachBanner,
  poseReviewTitle,
  poseTargetBadge,
} from './pose-session-copy';

describe('poseCoachBanner', () => {
  it('tells the user to step back when they overflow the frame', () => {
    expect(
      poseCoachBanner({
        tooClose: true,
        coachPrompt: 'Get on floor',
        bodyInFrame: false,
      }),
    ).toBe(POSE_TOO_CLOSE);
  });

  it('shows QuickPose form feedback when framing is fine', () => {
    expect(
      poseCoachBanner({
        tooClose: false,
        coachPrompt: 'Lower your hips',
        bodyInFrame: true,
      }),
    ).toBe('Lower your hips');
  });

  it('asks the user to enter the frame when nobody is visible', () => {
    expect(
      poseCoachBanner({
        tooClose: false,
        coachPrompt: null,
        bodyInFrame: false,
      }),
    ).toBe(POSE_MOVE_INTO_FRAME);
  });

  it('stays quiet when tracking is clean', () => {
    expect(
      poseCoachBanner({
        tooClose: false,
        coachPrompt: null,
        bodyInFrame: true,
      }),
    ).toBeNull();
  });
});

describe('poseTargetBadge', () => {
  it('stays hidden while the user is short of the target', () => {
    expect(poseTargetBadge({ count: 9, target: 10 })).toBeNull();
  });

  it('calls out the exact rep that meets the target', () => {
    expect(poseTargetBadge({ count: 10, target: 10 })).toBe(POSE_TARGET_BADGE);
  });

  it('keeps crediting the target once the user pushes past it', () => {
    expect(poseTargetBadge({ count: 13, target: 10 })).toBe(
      `${POSE_TARGET_BADGE} · +3`,
    );
  });

  it('stays hidden for untargeted sessions such as match play', () => {
    expect(poseTargetBadge({ count: 12, target: 0 })).toBeNull();
  });
});

describe('poseReviewTitle', () => {
  it('judges a daily set against its target', () => {
    expect(
      poseReviewTitle({ mode: 'challenge', count: 10, meetsTarget: true }),
    ).toBe('Target reached');
    expect(
      poseReviewTitle({ mode: 'challenge', count: 6, meetsTarget: false }),
    ).toBe('Short of the target');
  });

  it('never judges an unscored set, it just banks it', () => {
    expect(
      poseReviewTitle({ mode: 'practice', count: 12, meetsTarget: false }),
    ).toBe('Set recorded');
    expect(
      poseReviewTitle({ mode: 'match', count: 12, meetsTarget: false }),
    ).toBe('Set ready');
  });

  it('says nothing was counted when the camera saw no reps', () => {
    for (const mode of ['challenge', 'match', 'practice'] as const) {
      expect(poseReviewTitle({ mode, count: 0, meetsTarget: false })).toBe(
        'No reps yet',
      );
    }
  });
});
