import type { PoseFrame, PosePoint } from './landmarks';
import { poseStance, resolveCountingStance } from './pose-stance';
import { looksLikeKneelingUpright } from './pushup-form';
import { syntheticFrontPushupFrame } from './synthetic-front-pushup';

function point(x: number, y: number, score = 0.95): PosePoint {
  return { x, y, score };
}

function kneelingWaveFrame(timestampMs = 0): PoseFrame {
  return {
    timestampMs,
    points: {
      nose: point(0.5, 0.22),
      leftShoulder: point(0.4, 0.32),
      rightShoulder: point(0.6, 0.32),
      leftElbow: point(0.35, 0.28),
      rightElbow: point(0.65, 0.28),
      leftWrist: point(0.3, 0.2),
      rightWrist: point(0.7, 0.2),
      leftHip: point(0.42, 0.62),
      rightHip: point(0.58, 0.62),
      leftKnee: point(0.42, 0.68),
      rightKnee: point(0.58, 0.68),
      leftAnkle: point(0.4, 0.9),
      rightAnkle: point(0.6, 0.9),
    },
  };
}

function standingFrame(timestampMs = 0): PoseFrame {
  return {
    timestampMs,
    points: {
      nose: point(0.5, 0.12),
      leftShoulder: point(0.4, 0.22),
      rightShoulder: point(0.6, 0.22),
      leftElbow: point(0.35, 0.35),
      rightElbow: point(0.65, 0.35),
      leftWrist: point(0.32, 0.48),
      rightWrist: point(0.68, 0.48),
      leftHip: point(0.44, 0.78),
      rightHip: point(0.56, 0.78),
      leftKnee: point(0.44, 0.88),
      rightKnee: point(0.56, 0.88),
      leftAnkle: point(0.44, 0.96),
      rightAnkle: point(0.56, 0.96),
    },
  };
}

function sitUpFrame(timestampMs = 0): PoseFrame {
  return {
    timestampMs,
    points: {
      nose: point(0.5, 0.55),
      leftShoulder: point(0.4, 0.58),
      rightShoulder: point(0.6, 0.58),
      leftElbow: point(0.35, 0.62),
      rightElbow: point(0.65, 0.62),
      leftWrist: point(0.32, 0.66),
      rightWrist: point(0.68, 0.66),
      leftHip: point(0.42, 0.72),
      rightHip: point(0.58, 0.72),
      leftKnee: point(0.4, 0.55),
      rightKnee: point(0.6, 0.55),
      leftAnkle: point(0.38, 0.4),
      rightAnkle: point(0.62, 0.4),
    },
  };
}

function squatFrame(timestampMs = 0): PoseFrame {
  return {
    timestampMs,
    points: {
      nose: point(0.5, 0.18),
      leftShoulder: point(0.4, 0.28),
      rightShoulder: point(0.6, 0.28),
      leftElbow: point(0.32, 0.4),
      rightElbow: point(0.68, 0.4),
      leftWrist: point(0.3, 0.5),
      rightWrist: point(0.7, 0.5),
      leftHip: point(0.42, 0.58),
      rightHip: point(0.58, 0.58),
      leftKnee: point(0.4, 0.75),
      rightKnee: point(0.6, 0.75),
      leftAnkle: point(0.4, 0.94),
      rightAnkle: point(0.6, 0.94),
    },
  };
}

function lungeFrame(timestampMs = 0): PoseFrame {
  const frame = squatFrame(timestampMs);
  frame.points.leftKnee = point(0.4, 0.7);
  frame.points.rightKnee = point(0.6, 0.85);
  return frame;
}

function jackFrame(timestampMs = 0): PoseFrame {
  return standingFrame(timestampMs);
}

/**
 * Front plank with a longer 2D torso and wrists near the shoulders — the
 * MediaPipe shape that used to trip both kneeling (wristsHigh) and standing
 * (torsoSpan ≥ 0.3 + high wrists) on TestFlight.
 */
function frontPlankHighWristsFrame(timestampMs = 0): PoseFrame {
  return {
    timestampMs,
    points: {
      nose: point(0.5, 0.18),
      leftShoulder: point(0.4, 0.28),
      rightShoulder: point(0.6, 0.28),
      leftElbow: point(0.36, 0.26),
      rightElbow: point(0.64, 0.26),
      leftWrist: point(0.34, 0.24),
      rightWrist: point(0.66, 0.24),
      leftHip: point(0.42, 0.6),
      rightHip: point(0.58, 0.6),
      leftKnee: point(0.42, 0.78),
      rightKnee: point(0.58, 0.78),
      leftAnkle: point(0.42, 0.92),
      rightAnkle: point(0.58, 0.92),
    },
  };
}

describe('looksLikeKneelingUpright', () => {
  it('flags kneeling when knees sit near the hips', () => {
    expect(looksLikeKneelingUpright(kneelingWaveFrame(), 0.2)).toBe(true);
  });

  it('does not flag a front-camera push-up plank', () => {
    expect(looksLikeKneelingUpright(syntheticFrontPushupFrame(0, 0.5), 0.2)).toBe(false);
  });

  it('does not flag a front plank whose wrists sit high in the frame', () => {
    expect(looksLikeKneelingUpright(frontPlankHighWristsFrame(), 0.2)).toBe(false);
  });
});

describe('poseStance', () => {
  it('fails closed without a frame', () => {
    expect(poseStance('pushups', null)).toEqual({ ok: false, reason: 'no_pose' });
  });

  it('accepts a front-camera push-up plank', () => {
    expect(poseStance('pushups', syntheticFrontPushupFrame(0, 0.4))).toEqual({ ok: true });
    expect(poseStance('plank', syntheticFrontPushupFrame(0, 0))).toEqual({ ok: true });
  });

  it('accepts a front plank with high wrists (TestFlight MediaPipe shape)', () => {
    const frame = frontPlankHighWristsFrame();
    expect(poseStance('pushups', frame)).toEqual({ ok: true });
    expect(poseStance('plank', frame)).toEqual({ ok: true });
  });

  it('rejects kneeling + waving for push-ups and plank', () => {
    const frame = kneelingWaveFrame();
    expect(poseStance('pushups', frame).ok).toBe(false);
    expect(poseStance('plank', frame).ok).toBe(false);
  });

  it('rejects standing for push-ups', () => {
    expect(poseStance('pushups', standingFrame()).ok).toBe(false);
  });

  it('accepts sit-up, squat, jack, lunge, and burpee phases', () => {
    expect(poseStance('sit_ups', sitUpFrame())).toEqual({ ok: true });
    expect(poseStance('squats', squatFrame())).toEqual({ ok: true });
    expect(poseStance('jumping_jacks', jackFrame())).toEqual({ ok: true });
    expect(poseStance('lunges', lungeFrame())).toEqual({ ok: true });
    expect(poseStance('burpees', squatFrame())).toEqual({ ok: true });
    expect(poseStance('burpees', syntheticFrontPushupFrame(0, 0.5))).toEqual({ ok: true });
  });

  it('rejects kneeling wave as a burpee', () => {
    expect(poseStance('burpees', kneelingWaveFrame()).ok).toBe(false);
  });

  it('accepts mountain climbers in a plank base', () => {
    const frame = syntheticFrontPushupFrame(0, 0.3);
    frame.points.leftKnee = point(0.44, 0.55);
    frame.points.rightKnee = point(0.56, 0.7);
    expect(poseStance('mountain_climbers', frame)).toEqual({ ok: true });
  });
});

describe('resolveCountingStance', () => {
  it('fails open when landmarks are unavailable so reps still count', () => {
    expect(
      resolveCountingStance({
        metric: 'pushups',
        frame: null,
        landmarksAvailable: false,
      }),
    ).toEqual({ ok: true });
    expect(
      resolveCountingStance({
        metric: 'pushups',
        frame: null,
        landmarksAvailable: undefined,
      }),
    ).toEqual({ ok: true });
  });

  it('fails open when the landmark flag is set but no usable joints arrived', () => {
    expect(
      resolveCountingStance({
        metric: 'pushups',
        frame: null,
        landmarksAvailable: true,
      }),
    ).toEqual({ ok: true });
  });

  it('accepts a typical front-camera push-up when landmarks are present', () => {
    expect(
      resolveCountingStance({
        metric: 'pushups',
        frame: syntheticFrontPushupFrame(0, 0.4),
        landmarksAvailable: true,
      }),
    ).toEqual({ ok: true });
  });

  it('still blocks kneeling + wave when landmarks are present', () => {
    expect(
      resolveCountingStance({
        metric: 'pushups',
        frame: kneelingWaveFrame(),
        landmarksAvailable: true,
      }).ok,
    ).toBe(false);
    expect(
      resolveCountingStance({
        metric: 'plank',
        frame: kneelingWaveFrame(),
        landmarksAvailable: true,
      }).ok,
    ).toBe(false);
  });
});
