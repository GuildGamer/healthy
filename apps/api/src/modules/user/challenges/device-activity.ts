import { ORPCError } from '@orpc/server';
import {
  activityMeetsTarget,
  deviceActivitySchema,
  isDeviceCapture,
  type ChallengeCapture,
  type DeviceActivity,
} from '@product/contract';

export function requireDeviceActivityFor(
  capture: ChallengeCapture,
  activity: DeviceActivity | undefined,
): DeviceActivity | null {
  if (!activity) {
    return null;
  }

  const parsed = deviceActivitySchema.safeParse(activity);
  if (!parsed.success) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'That movement record is not valid',
    });
  }

  if (!isDeviceCapture(capture.kind)) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'This challenge does not accept a device reading',
    });
  }

  if (capture.metric && parsed.data.metric !== capture.metric) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'That reading does not match this challenge',
    });
  }

  if (!activityMeetsTarget(parsed.data, capture.target)) {
    throw new ORPCError('BAD_REQUEST', {
      message: targetMissMessage(capture),
    });
  }

  return parsed.data;
}

function targetMissMessage(capture: ChallengeCapture): string {
  if (capture.target.durationMinutes !== null) {
    return `Walk for at least ${capture.target.durationMinutes} minutes to finish`;
  }

  if (capture.target.count !== null) {
    return `Reach ${capture.target.count.toLocaleString('en-GB')} steps to finish`;
  }

  if (capture.target.distanceMeters !== null) {
    return `Cover at least ${capture.target.distanceMeters} metres to finish`;
  }

  return 'That reading does not meet this challenge';
}
