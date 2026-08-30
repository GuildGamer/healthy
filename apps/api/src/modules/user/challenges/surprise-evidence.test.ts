import { describe, expect, it } from 'vitest';
import {
  canRequestSurpriseEvidence,
  clampedPenalty,
  shouldRequestSurpriseEvidence,
  surprisePhotoExpectation,
} from './surprise-evidence.js';

describe('shouldRequestSurpriseEvidence', () => {
  it('never asks on a gym challenge', () => {
    expect(
      shouldRequestSurpriseEvidence({
        completionKind: 'evidence_photo',
        chancePercent: 100,
        unitSample: 0,
      }),
    ).toBe(false);
  });

  it('never asks when the challenge chance is zero', () => {
    expect(
      shouldRequestSurpriseEvidence({
        completionKind: 'check_in',
        chancePercent: 0,
        unitSample: 0,
      }),
    ).toBe(false);
  });

  it('always asks when the challenge chance is 100', () => {
    expect(
      shouldRequestSurpriseEvidence({
        completionKind: 'vitals_bp',
        chancePercent: 100,
        unitSample: 0.99,
      }),
    ).toBe(true);
  });

  it('uses the challenge chance against the roll', () => {
    expect(
      shouldRequestSurpriseEvidence({
        completionKind: 'check_in',
        chancePercent: 25,
        unitSample: 0.1,
      }),
    ).toBe(true);
    expect(
      shouldRequestSurpriseEvidence({
        completionKind: 'check_in',
        chancePercent: 25,
        unitSample: 0.4,
      }),
    ).toBe(false);
  });
});

describe('surprisePhotoExpectation', () => {
  it('asks for a device photo on blood-pressure challenges', () => {
    expect(
      surprisePhotoExpectation({
        completionKind: 'vitals_bp',
        title: 'Check your blood pressure',
        instruction: 'Log the reading.',
      }),
    ).toMatch(/blood-pressure monitor/);
  });

  it('names the activity for a check-in', () => {
    expect(
      surprisePhotoExpectation({
        completionKind: 'check_in',
        title: 'Take a ten-minute walk',
        instruction: 'Get outside.',
      }),
    ).toContain('Take a ten-minute walk');
  });
});

describe('clampedPenalty', () => {
  it('never takes the balance below zero', () => {
    expect(clampedPenalty(10, 25)).toBe(10);
    expect(clampedPenalty(0, 25)).toBe(0);
  });
});

describe('canRequestSurpriseEvidence', () => {
  it('applies only to check-in and vitals', () => {
    expect(canRequestSurpriseEvidence('check_in')).toBe(true);
    expect(canRequestSurpriseEvidence('vitals_bp')).toBe(true);
    expect(canRequestSurpriseEvidence('evidence_photo')).toBe(false);
  });

  it('never asks after a device walk or step count', () => {
    expect(canRequestSurpriseEvidence('check_in', 'device_session')).toBe(false);
    expect(canRequestSurpriseEvidence('check_in', 'device_sample')).toBe(false);
  });
});
