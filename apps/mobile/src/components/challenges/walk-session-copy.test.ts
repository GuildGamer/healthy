import {
  WALK_COMPLETE_EYEBROW,
  WALK_COMPLETE_META,
  WALK_GOAL_REACHED_META,
  WALK_IDLE_EYEBROW,
  WALK_PAUSED_EYEBROW,
  WALK_PAUSED_META,
  WALK_RECORDING_EYEBROW,
  WALK_SHORT_EYEBROW,
  walkStatus,
} from './walk-session-copy';

describe('walkStatus', () => {
  it('states the goal is still open while recording', () => {
    expect(
      walkStatus({
        phase: 'recording',
        shortfall: '07:46 more to finish',
        autoPaused: false,
      }),
    ).toEqual({
      eyebrow: WALK_RECORDING_EYEBROW,
      meta: '07:46 more to finish',
    });
  });

  it('says the walker can stop once the goal is met mid-walk', () => {
    expect(
      walkStatus({ phase: 'recording', shortfall: null, autoPaused: false })
        .meta,
    ).toBe(WALK_GOAL_REACHED_META);
  });

  it('explains itself when the walk auto-pauses', () => {
    expect(
      walkStatus({
        phase: 'recording',
        shortfall: '07:46 more to finish',
        autoPaused: true,
      }),
    ).toEqual({
      eyebrow: WALK_PAUSED_EYEBROW,
      meta: WALK_PAUSED_META,
    });
  });

  it('repeats the shortfall on review so the miss is never a mystery', () => {
    expect(
      walkStatus({
        phase: 'review',
        shortfall: '07:46 more to finish',
        autoPaused: false,
      }),
    ).toEqual({
      eyebrow: WALK_SHORT_EYEBROW,
      meta: '07:46 more to finish',
    });
  });

  it('celebrates a finished walk on review', () => {
    expect(
      walkStatus({ phase: 'review', shortfall: null, autoPaused: false }),
    ).toEqual({
      eyebrow: WALK_COMPLETE_EYEBROW,
      meta: WALK_COMPLETE_META,
    });
  });

  it('prompts a start before anything is recorded', () => {
    expect(
      walkStatus({
        phase: 'idle',
        shortfall: '10:00 more to finish',
        autoPaused: false,
      }),
    ).toMatchObject({ eyebrow: WALK_IDLE_EYEBROW });
  });
});
