import {
  POSE_MOVE_INTO_FRAME,
  POSE_TOO_CLOSE,
  poseCoachBanner,
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
