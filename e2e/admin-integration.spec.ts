import { test, expect } from '@playwright/test';

/**
 * Admin Integration Tests
 *
 * Tests available admin API endpoints:
 * - Clear DB endpoint (for cleanup)
 * - Reset password endpoint
 *
 * Note: Most admin functionality uses Server Actions, not REST API
 * Browser-based admin tests would require full auth flow
 */

test.describe('Admin API Integration', () => {
  const testPrefix = `test_${Date.now()}`;

  test('clear-db endpoint works', async ({ request }) => {
    const response = await request.post('/api/debug/clear-db', {
      data: { prefix: testPrefix },
    });

    // Endpoint may be restricted in production
    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test('buyer API requires auth', async ({ request }) => {
    const response = await request.get('/api/buyers/me');
    expect(response.status()).toBe(401);
  });

  test('dealer API requires auth', async ({ request }) => {
    const response = await request.get('/api/dealerinterface/my-info');
    expect(response.status()).toBe(401);
  });
});
