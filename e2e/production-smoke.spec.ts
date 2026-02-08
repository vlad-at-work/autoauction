import { test, expect } from '@playwright/test';

/**
 * Production Smoke Tests
 *
 * Lightweight tests against production to verify basic functionality.
 * Uses real auth (no mock) - just checks that endpoints exist and return expected status codes.
 *
 * ⚠️ These tests should NOT create data that pollutes production.
 * They only test read-only endpoints or endpoints that return 401/403 without valid auth.
 */

const PROD_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://autoauction.vercel.app';

test.describe('Production Smoke Tests', () => {
  test('site is accessible', async ({ page }) => {
    const response = await page.goto(PROD_URL);
    // Check that we get a valid HTTP response (not 5xx error)
    expect(response?.status()).toBeLessThan(500);

    // Check that page has content (not just error page)
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('admin page exists', async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/admin`);
    // Should return 200, 401, or 402 (paused), but not 404 or 500
    expect([200, 401, 402]).toContain(response?.status());
  });

  test('API endpoints exist', async ({ request }) => {
    const response = await request.get(`${PROD_URL}/api/buyers/me`);
    // Should return 401 (unauthorized) or 402 (paused), but not 404
    expect([401, 402]).toContain(response.status());
  });

  test('buyer app loads', async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/app`);
    // Should return valid status
    expect(response?.status()).toBeLessThan(500);
  });

  test('dealer interface loads', async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/dealerinterface`);
    // Should return valid status
    expect(response?.status()).toBeLessThan(500);
  });
});
