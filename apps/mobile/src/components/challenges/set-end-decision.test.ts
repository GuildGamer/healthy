import { setEndDecision } from './set-end-decision';

describe('setEndDecision', () => {
  it('stays quiet until there is at least one rep', () => {
    expect(
      setEndDecision({
        count: 0,
        lastRepAtMs: null,
        nowMs: 10_000,
        bodyInFrame: false,
      }),
    ).toEqual({ kind: 'none' });
  });

  it('starts a countdown after 4s out of frame', () => {
    expect(
      setEndDecision({
        count: 3,
        lastRepAtMs: 0,
        nowMs: 4_500,
        bodyInFrame: false,
      }),
    ).toEqual({ kind: 'countdown', seconds: 3 });
  });

  it('starts a countdown after 15s idle in frame', () => {
    expect(
      setEndDecision({
        count: 3,
        lastRepAtMs: 0,
        nowMs: 15_500,
        bodyInFrame: true,
      }),
    ).toEqual({ kind: 'countdown', seconds: 3 });
  });

  it('finishes when the countdown reaches zero', () => {
    expect(
      setEndDecision({
        count: 3,
        lastRepAtMs: 0,
        nowMs: 7_000,
        bodyInFrame: false,
      }),
    ).toEqual({ kind: 'finish' });
  });

  it('cancels when idle is shorter than the threshold', () => {
    expect(
      setEndDecision({
        count: 3,
        lastRepAtMs: 0,
        nowMs: 3_000,
        bodyInFrame: false,
      }),
    ).toEqual({ kind: 'none' });
  });
});
