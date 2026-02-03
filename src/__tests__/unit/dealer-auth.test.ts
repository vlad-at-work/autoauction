import { describe, expect, test } from 'bun:test';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  validateSessionToken,
  generateResetCode,
} from '@/lib/auth/dealer-auth';

describe('Dealer Auth - Password Hashing', () => {
  test('should hash password and verify correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  test('should generate different hashes for same password', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});

describe('Dealer Auth - Session Tokens', () => {
  test('should create and validate session token', () => {
    const dealer = {
      id: 'test-dealer-id',
      platform: 'TELEGRAM' as const,
      platformUserId: '123456789',
    };

    const token = createSessionToken(dealer);
    expect(token).toBeDefined();
    expect(token.includes('.')).toBe(true);

    const payload = validateSessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.dealerId).toBe(dealer.id);
    expect(payload?.platform).toBe(dealer.platform);
    expect(payload?.platformUserId).toBe(dealer.platformUserId);
  });

  test('should reject tampered token', () => {
    const dealer = {
      id: 'test-dealer-id',
      platform: 'MAX' as const,
      platformUserId: '987654321',
    };

    const token = createSessionToken(dealer);
    // Tamper with the signature (last character)
    const tamperedToken = token.slice(0, -1) + 'X';

    const payload = validateSessionToken(tamperedToken);
    expect(payload).toBeNull();
  });

  test('should reject invalid token format', () => {
    expect(validateSessionToken('')).toBeNull();
    expect(validateSessionToken('invalid')).toBeNull();
    expect(validateSessionToken('invalid.token.format')).toBeNull();
  });
});

describe('Dealer Auth - Reset Code', () => {
  test('should generate 6-digit reset code', () => {
    const code = generateResetCode();

    expect(code).toBeDefined();
    expect(code.length).toBe(6);
    expect(/^\d{6}$/.test(code)).toBe(true);

    // Code should be between 100000 and 999999
    const num = parseInt(code, 10);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThanOrEqual(999999);
  });

  test('should generate different codes each time', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateResetCode());
    }

    // Should have high variance (at least 90 unique codes out of 100)
    expect(codes.size).toBeGreaterThan(90);
  });
});
