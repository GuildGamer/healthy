import {
  __resetAnalyticsSessionForTests,
  getAnalyticsSessionId,
  markAnalyticsSessionBackground,
  resumeAnalyticsSession,
} from './session';

describe('analytics session', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetAnalyticsSessionForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the same session within the idle window', () => {
    const first = getAnalyticsSessionId();
    markAnalyticsSessionBackground();
    jest.advanceTimersByTime(5 * 60 * 1000);
    const resumed = resumeAnalyticsSession();
    expect(resumed.isNew).toBe(false);
    expect(resumed.sessionId).toBe(first);
  });

  it('starts a new session after 30 minutes idle', () => {
    const first = getAnalyticsSessionId();
    markAnalyticsSessionBackground();
    jest.advanceTimersByTime(31 * 60 * 1000);
    const resumed = resumeAnalyticsSession();
    expect(resumed.isNew).toBe(true);
    expect(resumed.sessionId).not.toBe(first);
  });
});
