/**
 * Dealer invite token generation and validation
 */

import { randomBytes } from 'crypto';

const DIGITS = '0123456789';

/**
 * Generate a short, numeric invite token
 * Format: 123-456 (6 digits)
 * ~1 million combinations = secure enough for time-limited invites
 */
export function generateInviteToken(): string {
  const bytes = randomBytes(6);
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += DIGITS[bytes[i] % DIGITS.length];
  }
  return token.slice(0, 3) + '-' + token.slice(3);
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
