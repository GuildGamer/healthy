import { quickPoseFraming, snapshotFromQuickPose } from './quickpose-pushup';

describe('snapshotFromQuickPose', () => {
  it('maps an entered pose to the down phase without counting yet', () => {
    const snapshot = snapshotFromQuickPose({
      measure: 0.82,
      insideMeasure: 1,
      formFeedback: null,
      framingFeedback: null,
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
      counter: { type: 'poseComplete', count: 1, isEntered: false },
    });

    expect(snapshot.coachPrompt).toBe('Lower your hips');
    expect(snapshot.phase).toBe('up');
  });

  it('flags a body that overflows the framing box as too close', () => {
    const snapshot = snapshotFromQuickPose({
      measure: 0.5,
      insideMeasure: 0.6,
      formFeedback: null,
      framingFeedback: 'Move whole body into the box',
      counter: { type: 'poseComplete', count: 0, isEntered: false },
    });

    expect(snapshot.tooClose).toBe(true);
    expect(snapshot.bodyInFrame).toBe(false);
    expect(snapshot.rejectReason).toBe('framing');
  });
});

describe('quickPoseFraming', () => {
  it('treats a missing inside score as in-frame when the exercise measure exists', () => {
    expect(quickPoseFraming({ measure: 0.4, insideMeasure: null })).toEqual({
      tooClose: false,
      bodyInFrame: true,
    });
  });
});
