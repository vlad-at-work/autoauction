/**
 * Dealer invite token generation and validation
 */

import { randomBytes } from 'crypto';

/**
 * Generate a URL-safe invite token
 * Format: base64url(randomBytes(32)) = 43 chars
 * 256 bits of entropy = cryptographically secure
 */
export function generateInviteToken(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create invite token with 7-day expiry
 */
export function createInviteTokenData() {
  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return { token, expiresAt };
}

/**
 * Validate invite token hasn't expired
 */
export function isInviteTokenValid(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt > new Date();
}
