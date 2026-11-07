import type { DeviceMetric } from '@product/db';
import type { AuthenticatedUser } from '../../../shared/types/authenticated-user.js';

/**
 * Injection token for {@link MatchesService} used by Challenges to avoid an
 * ESM circular import (Matches already depends on Challenges).
 */
export const MATCHES_SERVICE = Symbol('MATCHES_SERVICE');

/** The Matches surface Challenges needs after a pose habit finishes. */
export type PoseContestCreditor = {
  creditPosePractice(
    currentUser: AuthenticatedUser | null | undefined,
    input: {
      metric: DeviceMetric;
      count: number;
      durationSeconds: number;
      source: 'in_app_pose';
    },
  ): Promise<string[]>;
};
