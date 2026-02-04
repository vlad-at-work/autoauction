import { describe, expect, test } from 'bun:test';

import { createDealerClaimToken, validateDealerClaimToken } from '@/lib/auth/dealer-claim';

describe('Dealer Claim Tokens', () => {
  test('should create and validate claim token', () => {
    const dealerId = 'dealer_test_id';
    const token = createDealerClaimToken(dealerId, 60);
    const payload = validateDealerClaimToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.dealerId).toBe(dealerId);
  });

  test('should reject expired token', () => {
    const token = createDealerClaimToken('dealer_test_id', -1);
    expect(validateDealerClaimToken(token)).toBeNull();
  });

  test('should reject tampered token', () => {
    const token = createDealerClaimToken('dealer_test_id', 60);
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(validateDealerClaimToken(tampered)).toBeNull();
  });
});
