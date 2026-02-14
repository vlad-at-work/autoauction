/**
 * Dealer invite token generation and validation
 */

import { randomBytes } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a short, readable invite token
 * Format: XXX-XXX (7 chars, e.g., "ABC-123")
 * ~36^6 = 2 billion combinations = secure enough for invite links
 */
export function generateInviteToken(): string {
  const bytes = randomBytes(6);
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += CHARS[bytes[i] % CHARS.length];
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
