import { test, expect } from '@playwright/test';

/**
 * Buyer-Dealer E2E Flow Test
 *
 * Tests the complete flow using API calls with mock auth
 */

test.describe('Buyer-Dealer Flow', () => {
  const testPrefix = `test_${Date.now()}`;
  const buyerId = `${testPrefix}_buyer`;

  test.beforeAll(async ({ request }) => {
    // Clean up any previous test data
    await request.post('/api/debug/clear-db', { data: { prefix: 'test_' } });
  });

  test('buyer creates inquiry via API', async ({ request }) => {
    const response = await request.post('/api/inquiries', {
      headers: {
        Authorization: `Bearer mock:telegram:customer:${buyerId}`,
        'Content-Type': 'application/json',
      },
      data: {
        platformUserId: buyerId,
        platform: 'telegram',
        platformUserName: 'Test Buyer',
        name: 'Test Buyer Name',
        phone: '+79001234567',
        email: 'test@example.com',
        status: 'Podderzhivayu rossiyskikh boytsov v zone SVO',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Mekhanika',
        color: 'Belyy',
        comment: 'Test inquiry from Playwright',
        consent: true,
      },
    });

    // Log response for debugging
    const body = await response.json().catch(() => ({ error: 'Invalid JSON' }));
    // eslint-disable-next-line no-console
    console.log('Response:', response.status(), body);

    expect(
      response.ok(),
      `Expected OK but got ${response.status()}: ${JSON.stringify(body)}`
    ).toBeTruthy();
    expect(body.success).toBe(true);
    expect(body.id).toBeDefined();
  });

  test.afterAll(async ({ request }) => {
    // Clean up test data
    await request.post('/api/debug/clear-db', { data: { prefix: testPrefix } });
  });
});
