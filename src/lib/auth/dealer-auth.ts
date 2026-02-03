/**
 * Dealer authentication for mini-app
 * - bcrypt password hashing
 * - Session management with JWT-like tokens
 * - Password reset code generation
 */

import { createHmac, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { Platform, Dealer } from '@prisma/client';

// Session token settings
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-prod';
const SESSION_MAX_AGE_DAYS = 90; // Long-lasting sessions for dealers
const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

// Password reset code settings
const RESET_CODE_EXPIRY_MINUTES = 10;

// bcrypt settings
const BCRYPT_ROUNDS = 12;

export type DealerSessionPayload = {
  dealerId: string;
  platform: Platform;
  platformUserId: string;
  iat: number; // issued at (unix timestamp)
  exp: number; // expires at (unix timestamp)
};

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a session token for a dealer
 * Uses HMAC-SHA256 for signing
 */
export function createSessionToken(dealer: {
  id: string;
  platform: Platform;
  platformUserId: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: DealerSessionPayload = {
    dealerId: dealer.id,
    platform: dealer.platform,
    platformUserId: dealer.platformUserId,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  // Base64 encode the payload
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create signature
  const signature = createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Validate a session token and return the payload
 */
export function validateSessionToken(token: string): DealerSessionPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  // Verify signature
  const expectedSignature = createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (signature !== expectedSignature) {
    console.error('[validateSessionToken] Invalid signature');
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.error('[validateSessionToken] Token expired');
      return null;
    }

    return payload as DealerSessionPayload;
  } catch (err) {
    console.error('[validateSessionToken] Failed to parse payload:', err);
    return null;
  }
}

/**
 * Generate a 6-digit password reset code
 */
export function generateResetCode(): string {
  // Generate random bytes and convert to number
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0);
  // Ensure 6 digits (100000 to 999999)
  const code = (num % 900000) + 100000;
  return code.toString();
}

/**
 * Create a password reset code for a dealer
 */
export async function createPasswordResetCode(dealerId: string): Promise<string> {
  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing codes for this dealer
  await prisma.passwordResetCode.updateMany({
    where: {
      dealerId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(), // Mark as used
    },
  });

  // Create new code
  await prisma.passwordResetCode.create({
    data: {
      dealerId,
      code,
      expiresAt,
    },
  });

  return code;
}

/**
 * Validate a password reset code
 * Returns dealerId if valid, null otherwise
 */
export async function validateResetCode(
  dealerId: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const resetCode = await prisma.passwordResetCode.findFirst({
    where: {
      dealerId,
      code,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetCode) {
    return { valid: false, error: 'Неверный или просроченный код' };
  }

  return { valid: true };
}

/**
 * Mark a reset code as used and set new password
 */
export async function applyResetCodeAndSetPassword(
  dealerId: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateResetCode(dealerId, code);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const passwordHash = await hashPassword(newPassword);

  // Use transaction to mark code as used and update password
  await prisma.$transaction([
    prisma.passwordResetCode.updateMany({
      where: {
        dealerId,
        code,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.dealer.update({
      where: { id: dealerId },
      data: { passwordHash },
    }),
  ]);

  return { success: true };
}

/**
 * Find dealer by platform credentials (for mini-app login)
 */
export async function findDealerByPlatform(
  platform: Platform,
  platformUserId: string
): Promise<Dealer | null> {
  return prisma.dealer.findFirst({
    where: {
      platform,
      platformUserId,
      deletedAt: null,
      active: true,
    },
  });
}

/**
 * Find dealer by platform user ID (checking if this platform user is registered as dealer)
 */
export async function findDealerByPlatformUserId(
  platform: Platform,
  platformUserId: string
): Promise<Dealer | null> {
  return prisma.dealer.findFirst({
    where: {
      platform,
      platformUserId,
      deletedAt: null,
    },
  });
}

/**
 * Find any dealer waiting for platform association
 * (dealer created by admin but hasn't logged in yet)
 */
export async function findUnclaimedDealer(username: string): Promise<Dealer | null> {
  return prisma.dealer.findFirst({
    where: {
      username,
      platform: null,
      platformUserId: null,
      deletedAt: null,
      active: true,
    },
  });
}

/**
 * Associate platform credentials with a dealer and set password
 * (First login flow)
 */
export async function claimDealerAccount(
  dealerId: string,
  platform: Platform,
  platformUserId: string,
  platformChatId: string,
  password: string
): Promise<Dealer> {
  const passwordHash = await hashPassword(password);

  return prisma.dealer.update({
    where: { id: dealerId },
    data: {
      platform,
      platformUserId,
      platformChatId,
      passwordHash,
    },
  });
}

/**
 * Authenticate a dealer with password
 */
export async function authenticateDealer(
  dealer: Dealer,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!dealer.passwordHash) {
    return { success: false, error: 'Пароль не установлен' };
  }

  const valid = await verifyPassword(password, dealer.passwordHash);
  if (!valid) {
    return { success: false, error: 'Неверный пароль' };
  }

  return { success: true };
}

/**
 * Check if a platform user is already a buyer (mutual exclusivity)
 */
export async function isPlatformUserBuyer(
  platform: Platform,
  platformUserId: string
): Promise<boolean> {
  const buyer = await prisma.buyer.findFirst({
    where: {
      platform,
      platformUserId,
      deletedAt: null,
    },
  });
  return !!buyer;
}

/**
 * Check if a platform user is already a dealer (for buyer flow)
 */
export async function isPlatformUserDealer(
  platform: Platform,
  platformUserId: string
): Promise<boolean> {
  const dealer = await prisma.dealer.findFirst({
    where: {
      platform,
      platformUserId,
      deletedAt: null,
    },
  });
  return !!dealer;
}
