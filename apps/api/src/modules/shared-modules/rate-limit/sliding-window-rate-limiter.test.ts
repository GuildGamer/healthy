import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlidingWindowRateLimiter } from './sliding-window-rate-limiter.js';

describe('SlidingWindowRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to the limit then rejects', () => {
    const limiter = new SlidingWindowRateLimiter();
    expect(limiter.tryConsume('ip:1.1.1.1', 2)).toBe(true);
    expect(limiter.tryConsume('ip:1.1.1.1', 2)).toBe(true);
    expect(limiter.tryConsume('ip:1.1.1.1', 2)).toBe(false);
  });

  it('keeps separate keys independent', () => {
    const limiter = new SlidingWindowRateLimiter();
    expect(limiter.tryConsume('user:a', 1)).toBe(true);
    expect(limiter.tryConsume('user:a', 1)).toBe(false);
    expect(limiter.tryConsume('user:b', 1)).toBe(true);
  });

  it('resets after the rolling window', () => {
    vi.useFakeTimers();
    const limiter = new SlidingWindowRateLimiter();
    expect(limiter.tryConsume('ip:2.2.2.2', 1)).toBe(true);
    expect(limiter.tryConsume('ip:2.2.2.2', 1)).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(limiter.tryConsume('ip:2.2.2.2', 1)).toBe(true);
  });
});
