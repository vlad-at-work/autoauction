import { describe, expect, it } from 'bun:test';
import { rateLimit } from '@/lib/rate-limit';

// Use unique keys per test to avoid cross-test state contamination
let keyCounter = 0;
function freshKey() {
  return `test_rate_limit_${Date.now()}_${++keyCounter}`;
}

describe('rateLimit', () => {
  it('allows first request', () => {
    const result = rateLimit(freshKey(), 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('tracks remaining correctly', () => {
    const key = freshKey();
    rateLimit(key, 3, 60_000);
    const second = rateLimit(key, 3, 60_000);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it('blocks when limit is reached', () => {
    const key = freshKey();
    const limit = 3;
    for (let i = 0; i < limit; i++) {
      rateLimit(key, limit, 60_000);
    }
    const blocked = rateLimit(key, limit, 60_000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets after the window expires', () => {
    const key = freshKey();
    // Tiny window: 1ms — will have expired by the time we check
    rateLimit(key, 1, 1);
    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = rateLimit(key, 1, 1);
        expect(result.success).toBe(true);
        resolve();
      }, 10);
    });
  });

  it('returns a resetAt timestamp in the future', () => {
    const before = Date.now();
    const result = rateLimit(freshKey(), 5, 60_000);
    expect(result.resetAt).toBeGreaterThan(before);
  });

  it('different keys are independent', () => {
    const key1 = freshKey();
    const key2 = freshKey();
    for (let i = 0; i < 3; i++) {
      rateLimit(key1, 3, 60_000);
    }
    const result = rateLimit(key2, 3, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
