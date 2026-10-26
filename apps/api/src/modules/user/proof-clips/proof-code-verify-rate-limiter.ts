import { Injectable } from '@nestjs/common';
import type { VerifyRateBucket } from './types/proof-clip.js';

const WINDOW_MS = 60_000;

/**
 * In-memory rolling-window limiter for proof-code verify. Keys are opaque
 * (`user:<id>` or `ip:<ip>`). Resets on process restart; fine for abuse
 * throttling, not durable quotas.
 */
@Injectable()
export class ProofCodeVerifyRateLimiter {
  private readonly buckets = new Map<string, VerifyRateBucket>();

  /**
   * Records one attempt. Returns false when the key has already hit `limit`
   * inside the current window.
   */
  tryConsume(key: string, limit: number): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((stamp) => now - stamp < WINDOW_MS);

    if (bucket.timestamps.length >= limit) {
      this.buckets.set(key, bucket);
      return false;
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
    return true;
  }
}
