import {
  bestElbowReading,
  computePushupDepth,
  hasPushupFraming,
  looksLikeRigidSceneShift,
  looksLikeStandingUp,
  repPassesVerticalCheck,
  shoulderLateralOffset,
} from './pushup-form';
import { mergeCalibration, sampleCalibration } from './pushup-signals';
import { syntheticFrontPushupFrame } from './synthetic-front-pushup';

describe('pushup-form', () => {
  it('accepts vertical shoulder drop and rejects lateral sway', () => {
    const calibration = sampleCalibration(
      syntheticFrontPushupFrame(0, 0),
      0.3,
    );
    expect(calibration).not.toBeNull();

    const bottom = syntheticFrontPushupFrame(100, 1);
    const verticalDrop = 0.05;
    const lateral = shoulderLateralOffset(bottom, calibration, 0.3);

    expect(repPassesVerticalCheck(verticalDrop, lateral)).toBe(true);
    expect(repPassesVerticalCheck(0.01, 0.04)).toBe(false);
    // Moderate sideways drift is OK if the shoulders also dropped.
    expect(repPassesVerticalCheck(0.05, 0.08)).toBe(true);
    // Pure sway: lateral dwarfs vertical.
    expect(repPassesVerticalCheck(0.03, 0.09)).toBe(false);
  });

  it('tracks lateral offset from calibrated top shoulder x', () => {
    const calibration = mergeCalibration(null, {
      topShoulderY: 0.28,
      topShoulderX: 0.5,
      topWristSpread: 0.18,
      topNoseY: 0.2,
    });

    const swayed = syntheticFrontPushupFrame(0, 0);
    swayed.points.leftShoulder = {
      x: 0.52,
      y: 0.28,
      score: 0.95,
    };
    swayed.points.rightShoulder = {
      x: 0.68,
      y: 0.28,
      score: 0.95,
    };

    expect(shoulderLateralOffset(swayed, calibration, 0.3)).toBeGreaterThan(
      0.08,
    );
  });

  it('lets shoulder drop lead depth when elbow angle barely changes', () => {
    const calibration = sampleCalibration(
      syntheticFrontPushupFrame(0, 0),
      0.3,
    );
    expect(calibration).not.toBeNull();

    const top = syntheticFrontPushupFrame(0, 0);
    const bottom = syntheticFrontPushupFrame(100, 1);
    const topElbow = bestElbowReading(top, 0.3);
    const bottomElbow = bestElbowReading(bottom, 0.3);

    const topDepth = computePushupDepth(
      top,
      calibration,
      { torso: 0.1, wrist: 0.12 },
      0.3,
      topElbow,
    );
    const bottomDepth = computePushupDepth(
      bottom,
      calibration,
      { torso: 0.1, wrist: 0.12 },
      0.3,
      bottomElbow,
    );

    expect(topDepth).not.toBeNull();
    expect(bottomDepth).not.toBeNull();
    expect(bottomDepth!).toBeGreaterThan(topDepth! + 0.35);
  });

  it('keeps the same depth for an identical dip after session max grows', () => {
    const calibration = sampleCalibration(
      syntheticFrontPushupFrame(0, 0),
      0.3,
    );
    expect(calibration).not.toBeNull();

    const bottom = syntheticFrontPushupFrame(100, 1);
    const elbow = bestElbowReading(bottom, 0.3);
    const afterTypicalMax = computePushupDepth(
      bottom,
      calibration,
      { torso: 0.1, wrist: 0.12 },
      0.3,
      elbow,
    );
    const afterDeepSpike = computePushupDepth(
      bottom,
      calibration,
      { torso: 0.28, wrist: 0.3 },
      0.3,
      elbow,
    );

    expect(afterTypicalMax).not.toBeNull();
    expect(afterDeepSpike).toBeCloseTo(afterTypicalMax!, 5);
  });

  it('accepts a full-body front plank and rejects a face close-up', () => {
    expect(hasPushupFraming(syntheticFrontPushupFrame(0, 0), 0.3)).toBe(true);
    expect(hasPushupFraming(faceCloseUpFrame(0, 0), 0.3)).toBe(false);
  });

  it('treats a whole-skeleton nod as camera motion', () => {
    const first = faceCloseUpFrame(0, 0);
    const nodded = faceCloseUpFrame(80, 1);
    expect(looksLikeRigidSceneShift(nodded, first, 0.3)).toBe(true);

    const top = syntheticFrontPushupFrame(0, 0);
    const bottom = syntheticFrontPushupFrame(80, 1);
    expect(looksLikeRigidSceneShift(bottom, top, 0.3)).toBe(false);
  });

  it('rejects a vertical torso as standing up, not a press-up', () => {
    expect(looksLikeStandingUp(syntheticFrontPushupFrame(0, 0), 0.3)).toBe(
      false,
    );
    expect(looksLikeStandingUp(syntheticFrontPushupFrame(0, 1), 0.3)).toBe(
      false,
    );
    expect(looksLikeStandingUp(standingFromPlankFrame(0, 1), 0.3)).toBe(true);
  });
});

function faceCloseUpFrame(timestampMs: number, bob: number) {
  const y = 0.32 + bob * 0.1;
  const point = (x: number, pointY: number) => ({
    x,
    y: pointY,
    score: 0.9,
  });

  return {
    timestampMs,
    points: {
      nose: point(0.5, y - 0.04),
      leftShoulder: point(0.38, y),
      rightShoulder: point(0.62, y),
      leftElbow: point(0.36, y + 0.03),
      rightElbow: point(0.64, y + 0.03),
      leftWrist: point(0.34, y + 0.05),
      rightWrist: point(0.66, y + 0.05),
      leftHip: point(0.42, y + 0.08),
      rightHip: point(0.58, y + 0.08),
    },
  };
}

function standingFromPlankFrame(timestampMs: number, amount: number) {
  const frame = syntheticFrontPushupFrame(timestampMs, 0);
  const rise = amount * 0.14;
  const hipDrop = amount * 0.16;
  const wristLift = amount * 0.12;

  for (const name of [
    'nose',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
  ] as const) {
    const point = frame.points[name];
    if (point) {
      point.y -= rise;
    }
  }

  for (const name of ['leftHip', 'rightHip'] as const) {
    const point = frame.points[name];
    if (point) {
      point.y += hipDrop;
    }
  }

  for (const name of ['leftWrist', 'rightWrist'] as const) {
    const point = frame.points[name];
    if (point) {
      point.y -= wristLift;
    }
  }

  return frame;
}
