/**
 * 1:1 port of QuickPose's JS helper (`QuickPoseThresholdCounter`): a rep
 * completes when the feature value crosses enter (bottom) then exit (top).
 * That hysteresis is what stops half-reps from counting.
 *
 * Enter is stricter than QuickPose's published 0.6 default so a shallow dip
 * never arms. Exit stays low so they still have to lock out.
 */
export const QUICKPOSE_ENTER_THRESHOLD = 0.8;
export const QUICKPOSE_EXIT_THRESHOLD = 0.3;
export type QuickPoseCountState =
  | {
      readonly type: 'poseEntered';
      readonly count: number;
      readonly isEntered: true;
    }
  | {
      readonly type: 'poseComplete';
      readonly count: number;
      readonly isEntered: false;
    };

function poseEntered(count: number): QuickPoseCountState {
  return { type: 'poseEntered', count, isEntered: true };
}

function poseComplete(count: number): QuickPoseCountState {
  return { type: 'poseComplete', count, isEntered: false };
}

export class QuickPoseThresholdCounter {
  readonly enterThreshold: number;
  readonly exitThreshold: number;
  state: QuickPoseCountState = poseComplete(0);

  constructor(
    enterThreshold = QUICKPOSE_ENTER_THRESHOLD,
    exitThreshold = QUICKPOSE_EXIT_THRESHOLD,
  ) {
    this.enterThreshold = enterThreshold;
    this.exitThreshold = exitThreshold;
  }

  count(value: number): QuickPoseCountState {
    if (!this.state.isEntered && value > this.enterThreshold) {
      this.state = poseEntered(this.state.count);
    } else if (this.state.isEntered && value < this.exitThreshold) {
      this.state = poseComplete(this.state.count + 1);
    }

    return this.state;
  }

  reset(): void {
    this.state = poseComplete(0);
  }
}
