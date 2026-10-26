import { describe, expect, it } from 'vitest';
import {
  FRIEND_LADDER_MILESTONE_KEY,
  friendMilestonePushCopy,
  friendStreakMilestoneKey,
} from './friend-milestone.js';

describe('friendMilestonePushCopy', () => {
  it('names the friend and the streak in the title', () => {
    expect(friendMilestonePushCopy('Ada', friendStreakMilestoneKey(14))).toEqual({
      title: 'Ada hit 14 days',
      body: 'Think you can outlast them? Start a contest.',
    });
  });

  it('dares the recipient to keep up with a raised goal', () => {
    expect(friendMilestonePushCopy('Ada', FRIEND_LADDER_MILESTONE_KEY)).toEqual({
      title: 'Ada raised their goal',
      body: 'Think you can keep up? Start a contest.',
    });
  });

  it('falls back to a generic milestone for an unknown key', () => {
    expect(friendMilestonePushCopy('Ada', 'something_new').title).toBe('Ada hit a milestone');
  });
});
