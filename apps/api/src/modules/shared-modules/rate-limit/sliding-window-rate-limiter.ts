import { Injectable } from '@nestjs/common';

type RateBucket = {
  timestamps: number[];
};

const DEFAULT_WINDOW_MS = 60_000;

/**
 * In-memory rolling-window limiter. Keys are opaque (`user:<id>`,
 * `anon:<id>`, `ip:<ip>`). Resets on process restart; fine for abuse
 * throttling, not durable quotas.
 *
 * Window length is fixed on the class — a constructor `number` would make Nest
 * try to inject `Number` and fail AnalyticsModule boot.
 */
@Injectable()
export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();
  private readonly windowMs = DEFAULT_WINDOW_MS;

  /**
   * Records one attempt. Returns false when the key has already hit `limit`
   * inside the current window.
   */
  tryConsume(key: string, limit: number): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter(
      (stamp) => now - stamp < this.windowMs,
    );

    if (bucket.timestamps.length >= limit) {
      this.buckets.set(key, bucket);
      return false;
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
    return true;
  }
}
