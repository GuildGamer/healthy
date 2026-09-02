import type { PoseFrame, PosePoint } from './landmarks';

type LandmarkName = keyof PoseFrame['points'];

/**
 * Exponential moving average on landmark x/y before angle math.
 * Reduces single-frame jitter from MoveNet on a front-facing feed.
 */
export class PosePointSmoother {
  private readonly state = new Map<LandmarkName, PosePoint>();

  reset(): void {
    this.state.clear();
  }

  smooth(frame: PoseFrame, alpha = 0.45): PoseFrame {
    const points: PoseFrame['points'] = {};

    for (const [name, point] of Object.entries(frame.points) as [
      LandmarkName,
      PosePoint | undefined,
    ][]) {
      if (!point) {
        continue;
      }

      const previous = this.state.get(name);
      if (!previous) {
        this.state.set(name, point);
        points[name] = point;
        continue;
      }

      const blended: PosePoint = {
        x: alpha * point.x + (1 - alpha) * previous.x,
        y: alpha * point.y + (1 - alpha) * previous.y,
        score: point.score,
      };
      this.state.set(name, blended);
      points[name] = blended;
    }

    return {
      timestampMs: frame.timestampMs,
      points,
    };
  }
}
