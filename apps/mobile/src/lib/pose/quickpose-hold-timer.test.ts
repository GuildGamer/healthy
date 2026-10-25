import { createHoldTimer, tickHoldTimer } from './quickpose-hold-timer';

describe('tickHoldTimer', () => {
  it('accumulates whole seconds while holding in frame', () => {
    let state = createHoldTimer();
    state = tickHoldTimer(state, {
      measure: 0.9,
      bodyInFrame: true,
      formFeedback: null,
      deltaSeconds: 0.4,
    });
    expect(state.seconds).toBe(0);
    expect(state.isHolding).toBe(true);

    state = tickHoldTimer(state, {
      measure: 0.9,
      bodyInFrame: true,
      formFeedback: null,
      deltaSeconds: 0.7,
    });
    expect(state.seconds).toBe(1);
  });

  it('pauses when the body leaves the frame', () => {
    let state = createHoldTimer();
    state = tickHoldTimer(state, {
      measure: 0.9,
      bodyInFrame: true,
      formFeedback: null,
      deltaSeconds: 1.2,
    });
    expect(state.seconds).toBe(1);

    state = tickHoldTimer(state, {
      measure: 0.9,
      bodyInFrame: false,
      formFeedback: null,
      deltaSeconds: 1,
    });
    expect(state.seconds).toBe(1);
    expect(state.isHolding).toBe(false);
  });
});
