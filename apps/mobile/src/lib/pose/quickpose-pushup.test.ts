import { QUICKPOSE_INSIDE_IN_FRAME_HOLD } from './quickpose-exercise';
import {
  quickPoseFraming,
  shouldCountPoseRep,
  snapshotFromQuickPose,
} from './quickpose-pushup';

describe('snapshotFromQuickPose', () => {
  it('maps an entered pose to the down phase without counting yet', () => {
    const snapshot = snapshotFromQuickPose({
      measure: 0.82,
      insideMeasure: 1,
      formFeedback: null,
      framingFeedback: null,
      stanceFeedback: null,
      counter: { type: 'poseEntered', count: 3, isEntered: true },
    });

    expect(snapshot.count).toBe(3);
    expect(snapshot.phase).toBe('down');
    expect(snapshot.bodyInFrame).toBe(true);
    expect(snapshot.tooClose).toBe(false);
    expect(snapshot.coachPrompt).toBeNull();
  });

  it('surfaces form feedback for the HUD', () => {
    const snapshot = snapshotFromQuickPose({
      measure: 0.4,
      insideMeasure: 1,
      formFeedback: 'Lower your hips',
      framingFeedback: 'Move into the box',
      stanceFeedback: 'Get into position',
      counter: { type: 'poseComplete', count: 1, isEntered: false },
    });

    expect(snapshot.coachPrompt).toBe('Lower your hips');
    expect(snapshot.phase).toBe('up');
  });

  it('surfaces stance feedback when form and framing are quiet', () => {
    const snapshot = snapshotFromQuickPose({
      measure: 0.5,
      insideMeasure: 1,
      formFeedback: null,
      framingFeedback: null,
      stanceFeedback: 'Get into position',
      counter: { type: 'poseComplete', count: 0, isEntered: false },
    });

    expect(snapshot.coachPrompt).toBe('Get into position');
  });

  it('flags a body that overflows the framing box as too close', () => {
    const snapshot = snapshotFromQuickPose({
      measure: 0.5,
      insideMeasure: 0.6,
      formFeedback: null,
      framingFeedback: 'Move whole body into the box',
      stanceFeedback: null,
      counter: { type: 'poseComplete', count: 0, isEntered: false },
    });

    expect(snapshot.tooClose).toBe(true);
    expect(snapshot.bodyInFrame).toBe(false);
    expect(snapshot.rejectReason).toBe('framing');
  });
});

describe('quickPoseFraming', () => {
  it('treats a missing inside score as out of frame, even with a push-up score', () => {
    expect(quickPoseFraming({ measure: 0.4, insideMeasure: null })).toEqual({
      tooClose: false,
      bodyInFrame: false,
    });
  });

  it('keeps the green box at 0.95 while any body reading is still a person', () => {
    expect(quickPoseFraming({ measure: 0.5, insideMeasure: 0.5 })).toEqual({
      tooClose: true,
      bodyInFrame: false,
    });
    expect(quickPoseFraming({ measure: 0.5, insideMeasure: 0.95 })).toEqual({
      tooClose: false,
      bodyInFrame: true,
    });
  });

  it('accepts a near-full body for holds below the strict green-box line', () => {
    expect(
      quickPoseFraming({
        measure: 0.6,
        insideMeasure: 0.9,
        insideWellFramedThreshold: QUICKPOSE_INSIDE_IN_FRAME_HOLD,
      }),
    ).toEqual({
      tooClose: false,
      bodyInFrame: true,
    });
    expect(quickPoseFraming({ measure: 0.6, insideMeasure: 0.9 })).toEqual({
      tooClose: true,
      bodyInFrame: false,
    });
  });

  it('still rejects a sparse body reading under the hold threshold', () => {
    expect(
      quickPoseFraming({
        measure: 0.6,
        insideMeasure: 0.8,
        insideWellFramedThreshold: QUICKPOSE_INSIDE_IN_FRAME_HOLD,
      }),
    ).toEqual({
      tooClose: true,
      bodyInFrame: false,
    });
  });
});

describe('shouldCountPoseRep', () => {
  it('ignores a push-up score with no body reading', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.9,
        insideMeasure: null,
        formFeedback: null,
        finishingRep: false,
        stanceOk: true,
        finishingStanceOk: true,
      }),
    ).toBe(false);
  });

  it('counts when QuickPose has found a body, below the green-box line', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.9,
        insideMeasure: 0.4,
        formFeedback: null,
        finishingRep: false,
        stanceOk: true,
        finishingStanceOk: true,
      }),
    ).toBe(true);
  });

  it('blocks when stance is rejected', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.9,
        insideMeasure: 1,
        formFeedback: null,
        finishingRep: false,
        stanceOk: false,
        finishingStanceOk: false,
      }),
    ).toBe(false);
  });

  it('counts a front push-up when stance fails open without landmarks', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.9,
        insideMeasure: 0.5,
        formFeedback: null,
        finishingRep: false,
        stanceOk: true,
        finishingStanceOk: false,
      }),
    ).toBe(true);
  });

  it('lets a finishing rep complete if the body reading flickers out after a good stance', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.2,
        insideMeasure: null,
        formFeedback: null,
        finishingRep: true,
        stanceOk: false,
        finishingStanceOk: true,
      }),
    ).toBe(true);
  });

  it('does not finish a rep that never had an accepted stance', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.2,
        insideMeasure: 1,
        formFeedback: null,
        finishingRep: true,
        stanceOk: false,
        finishingStanceOk: false,
      }),
    ).toBe(false);
  });

  it('blocks form feedback on a new enter', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.9,
        insideMeasure: 1,
        formFeedback: 'Lower your hips',
        finishingRep: false,
        stanceOk: true,
        finishingStanceOk: true,
      }),
    ).toBe(false);
  });

  it('lets a finishing half-rep complete even when form feedback flickers', () => {
    expect(
      shouldCountPoseRep({
        measure: 0.2,
        insideMeasure: 1,
        formFeedback: 'Lower your hips',
        finishingRep: true,
        stanceOk: false,
        finishingStanceOk: true,
      }),
    ).toBe(true);
  });
});
