import { test, expect, request, APIRequestContext } from '@playwright/test';

/**
 * Admin Integration Tests
 *
 * Tests admin functionality via API:
 * - Dealer CRUD
 * - Buyer management
 * - Inquiry listing
 *
 * Uses Basic Auth for admin access
 */

test.describe('Admin Integration', () => {
  const testPrefix = `test_${Date.now()}`;
  let dealerId: string;
  let adminApi: APIRequestContext;

  test.beforeAll(async () => {
    // Create admin API context with Basic Auth
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin';
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    adminApi = await request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  });

  test.describe('Dealer Management', () => {
    test('create dealer', async () => {
      const response = await adminApi.post('/api/admin/dealers', {
        data: {
          username: `${testPrefix}_dealer`,
          name: 'Test Dealer',
          subName: 'Test Auto Center',
          phone: '+79001234567',
          email: 'dealer@test.com',
          description: 'Test dealer for Playwright',
          active: true,
        },
      });

      expect([200, 201]).toContain(response.status());
      const body = await response.json();
      if (body.id) {
        dealerId = body.id;
      }
    });

    test('update dealer', async () => {
      if (!dealerId) {
        test.skip();
        return;
      }

      const response = await adminApi.patch(`/api/admin/dealers/${dealerId}`, {
        data: {
          name: 'Updated Dealer Name',
          phone: '+79009876543',
        },
      });

      expect([200, 204]).toContain(response.status());
    });

    test('list dealers', async () => {
      const response = await adminApi.get('/api/admin/dealers');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test.describe('Buyer Management', () => {
    test('create buyer', async () => {
      const response = await adminApi.post('/api/admin/buyers', {
        data: {
          platform: 'TELEGRAM',
          platformUserId: `${testPrefix}_buyer`,
          platformUserName: 'Test Buyer',
          platformChatId: '123456',
        },
      });

      expect([200, 201]).toContain(response.status());
      // Buyer created, response body contains id if needed
    });

    test('list buyers', async () => {
      const response = await adminApi.get('/api/admin/buyers');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test.describe('Inquiry Management', () => {
    test('list inquiries', async () => {
      const response = await adminApi.get('/api/admin/inquiries');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    await adminApi.post('/api/debug/clear-db', { data: { prefix: testPrefix } });
    await adminApi.dispose();
  });
});
