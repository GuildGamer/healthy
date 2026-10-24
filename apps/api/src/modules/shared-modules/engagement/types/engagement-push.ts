import type { EngagementSource } from '../enums/engagement-source.js';

/**
 * `all_devices` — habit, reminder, completion, admin (no group opt-out).
 * `group_opt_in` — social pushes that respect `groupNotificationsEnabled`.
 */
export type EngagementAudience = 'all_devices' | 'group_opt_in';

export type EngagementPush = {
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  notificationId?: string;
  templateKey?: string;
  situation?: string;
  copyVersion?: string;
  leadChallengeId?: string;
  experimentKey?: string;
  variantKey?: string;
};

export type EngagementSendInput = {
  source: EngagementSource;
  audience: EngagementAudience;
  pushes: readonly EngagementPush[];
};

export type EngagementSendResult = {
  sentCount: number;
  messageCount: number;
  usersWithDevice: string[];
  usersWithoutDevice: string[];
  /** Delivery ids allocated for users who had a device, keyed by userId. */
  deliveryIdsByUserId: Record<string, string>;
};
