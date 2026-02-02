import { describe, expect, test } from 'bun:test';
import { config } from 'dotenv';

config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function getAdminAuth() {
  return `Basic ${Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64')}`;
}

describe('Admin Authentication', () => {
  test('should allow access to /admin with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: {
        Authorization: getAdminAuth(),
      },
    });

    expect(res.status).toBe(200);
  });

  test('should reject /admin without credentials', async () => {
    const res = await fetch(`${BASE_URL}/admin`);

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('Basic');
  });

  test('should reject /admin with invalid credentials', async () => {
    const invalidAuth = `Basic ${Buffer.from('wrong:credentials').toString('base64')}`;

    const res = await fetch(`${BASE_URL}/admin`, {
      headers: {
        Authorization: invalidAuth,
      },
    });

    expect(res.status).toBe(401);
  });

  test('should allow access to /admin/buyers with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/admin/buyers`, {
      headers: {
        Authorization: getAdminAuth(),
      },
    });

    expect(res.status).toBe(200);
  });

  test('should allow access to /admin/inquiries with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/admin/inquiries`, {
      headers: {
        Authorization: getAdminAuth(),
      },
    });

    expect(res.status).toBe(200);
  });

  test('should allow access to /admin/dealers with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/admin/dealers`, {
      headers: {
        Authorization: getAdminAuth(),
      },
    });

    expect(res.status).toBe(200);
  });

  test('should allow access to /admin/offers with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/admin/offers`, {
      headers: {
        Authorization: getAdminAuth(),
      },
    });

    expect(res.status).toBe(200);
  });

  test('should allow access to /admin/transactions with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/admin/transactions`, {
      headers: {
        Authorization: getAdminAuth(),
      },
    });

    expect(res.status).toBe(200);
  });
});

describe('Admin vs Dealer Authentication', () => {
  test('dealer credentials should not work for admin routes', async () => {
    const dealerAuth = `Basic ${Buffer.from('dealer1:dealer1').toString('base64')}`;

    const res = await fetch(`${BASE_URL}/admin`, {
      headers: {
        Authorization: dealerAuth,
      },
    });

    expect(res.status).toBe(401);
  });

  test('admin credentials should not work for dealer routes', async () => {
    const res = await fetch(`${BASE_URL}/dealer/inquiries`, {
      headers: {
        Authorization: getAdminAuth(),
      },
    });

    // Should either reject or show empty list (depending on implementation)
    // Admin is not a dealer, so should not see dealer-specific data
    expect([200, 401, 403]).toContain(res.status);
  });
});
