import {
  elbowArmDownness,
  fusePushupDownness,
  mergeCalibration,
  resolveAdaptiveThresholds,
  sampleCalibration,
  torsoDropDownness,
  wristSpreadDownness,
} from './pushup-signals';
import {
  syntheticFrontPushupFrame,
} from './synthetic-front-pushup';

describe('pushup-signals', () => {
  it('merges calibration toward the highest shoulder position', () => {
    const merged = mergeCalibration(
      {
        topShoulderY: 0.3,
        topShoulderX: 0.5,
        topWristSpread: 0.15,
        topNoseY: 0.18,
      },
      {
        topShoulderY: 0.25,
        topShoulderX: 0.48,
        topWristSpread: 0.12,
        topNoseY: 0.16,
      },
    );

    expect(merged.topShoulderY).toBe(0.25);
    expect(merged.topShoulderX).toBe(0.48);
    expect(merged.topWristSpread).toBe(0.15);
    expect(merged.topNoseY).toBe(0.16);
  });

  it('detects torso drop on front-facing landmarks', () => {
    const calibration = sampleCalibration(
      syntheticFrontPushupFrame(0, 0),
      0.3,
    );
    expect(calibration).not.toBeNull();

    const top = torsoDropDownness(
      syntheticFrontPushupFrame(100, 0),
      calibration,
      0.3,
    );
    const bottom = torsoDropDownness(
      syntheticFrontPushupFrame(200, 1),
      calibration,
      0.3,
    );

    expect(top).toBeCloseTo(0, 1);
    expect(bottom).toBeGreaterThan(0.7);
  });

  it('detects wrist compression on front-facing landmarks', () => {
    const calibration = sampleCalibration(
      syntheticFrontPushupFrame(0, 0),
      0.3,
    );
    expect(calibration).not.toBeNull();

    const top = wristSpreadDownness(
      syntheticFrontPushupFrame(100, 0),
      calibration,
      0.3,
    );
    const bottom = wristSpreadDownness(
      syntheticFrontPushupFrame(200, 1),
      calibration,
      0.3,
    );

    expect(top).toBeCloseTo(0, 1);
    expect(bottom).toBeGreaterThan(0.5);
  });

  it('fuses channels by taking the strongest downness', () => {
    expect(fusePushupDownness([0.2, 0.65, 0.4])).toBe(0.65);
  });

  it('builds adaptive thresholds from observed range', () => {
    expect(resolveAdaptiveThresholds(0.2, 0.5, 0.55, 0.35)).toEqual({
      down: expect.closeTo(0.38, 2),
      up: expect.closeTo(0.314, 2),
    });
  });

  it('falls back to fixed thresholds when range is tiny', () => {
    expect(resolveAdaptiveThresholds(0.4, 0.45, 0.55, 0.35)).toEqual({
      down: 0.55,
      up: 0.35,
    });
  });

  it('does not personalize bands from a shallow bob', () => {
    expect(resolveAdaptiveThresholds(0.1, 0.28, 0.55, 0.45)).toEqual({
      down: 0.55,
      up: 0.45,
    });
  });

  it('reads elbow flexion from the clearer arm', () => {
    const downness = elbowArmDownness(
      syntheticFrontPushupFrame(0, 0.8),
      0.3,
    );

    expect(downness).not.toBeNull();
    expect(downness).toBeGreaterThan(0);
  });
});
