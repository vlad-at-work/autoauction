/**
 * In-memory rate limiter
 * No external dependencies - uses Map for tracking
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanup, 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Simple sliding window rate limiter
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param limit - Max requests allowed
 * @param windowMs - Window in milliseconds
 */
export function rateLimit(identifier: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= limit) {
    // Rate limited
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  store.set(identifier, entry);

  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limiter for API routes
 * Returns response headers and handles rate limiting
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000 // default 10 requests per minute
): RateLimitResult {
  return rateLimit(identifier, limit, windowMs);
}
