/**
 * Server-side WebApp authentication validation
 * Validates that requests are actually coming from Telegram or MAX WebView
 */

import { createHmac } from 'crypto';

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;

export type WebAppValidationResult = {
  valid: boolean;
  platform?: 'telegram' | 'max';
  userId?: string;
  error?: string;
};

/**
 * Validate Telegram WebApp data
 *
 * Telegram sends initData as URL-encoded string with HMAC-SHA256 signature
 * Format: user=%7B%22id%22...&hash=ABC123...
 */
export function validateTelegramWebAppData(initData: string): WebAppValidationResult {
  console.log('[validateTelegramWebAppData] Starting validation');

  if (!TG_BOT_TOKEN) {
    console.error('[validateTelegramWebAppData] TG_BOT_TOKEN not configured');
    return { valid: false, error: 'TG_BOT_TOKEN not configured' };
  }

  if (!initData) {
    console.error('[validateTelegramWebAppData] No initData provided');
    return { valid: false, error: 'No initData provided' };
  }

  console.log('[validateTelegramWebAppData] initData length:', initData.length);

  try {
    // Parse URL-encoded initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      console.error('[validateTelegramWebAppData] No hash in initData');
      return { valid: false, error: 'No hash in initData' };
    }

    console.log('[validateTelegramWebAppData] Hash found, validating signature...');

    // Remove hash and sort remaining params
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Calculate expected hash: HMAC-SHA256 with secret = SHA256(bot_token)
    const secret = createHmac('sha256', 'WebAppData').update(TG_BOT_TOKEN).digest();

    const expectedHash = createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (hash !== expectedHash) {
      console.error('[validateTelegramWebAppData] Invalid signature');
      return { valid: false, error: 'Invalid signature' };
    }

    console.log('[validateTelegramWebAppData] Signature valid, checking freshness...');

    // Check auth_date freshness (max 5 minutes old)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      console.error('[validateTelegramWebAppData] initData expired:', {
        authDate,
        now,
        diff: now - authDate,
      });
      return { valid: false, error: 'initData expired' };
    }

    console.log('[validateTelegramWebAppData] Data fresh, extracting user ID...');

    // Extract user ID
    const userData = params.get('user');
    if (!userData) {
      console.error('[validateTelegramWebAppData] No user data in params');
      return { valid: false, error: 'No user data' };
    }

    const user = JSON.parse(userData);
    if (!user?.id) {
      console.error('[validateTelegramWebAppData] No user ID in parsed data');
      return { valid: false, error: 'No user ID in data' };
    }

    console.log('[validateTelegramWebAppData] Validation successful, userId:', user.id);

    return {
      valid: true,
      platform: 'telegram',
      userId: user.id.toString(),
    };
  } catch (err) {
    console.error('[validateTelegramWebAppData] Exception during validation:', err);
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Validation failed',
    };
  }
}

/**
 * Validate MAX WebApp data
 *
 * MAX sends initData with HMAC-SHA256 signature
 * Format similar to Telegram
 */
export function validateMaxWebAppData(initData: string): WebAppValidationResult {
  console.log('[validateMaxWebAppData] Starting validation');

  if (!MAX_BOT_TOKEN) {
    console.error('[validateMaxWebAppData] MAX_BOT_TOKEN not configured');
    return { valid: false, error: 'MAX_BOT_TOKEN not configured' };
  }

  if (!initData) {
    console.error('[validateMaxWebAppData] No initData provided');
    return { valid: false, error: 'No initData provided' };
  }

  console.log('[validateMaxWebAppData] initData length:', initData.length);

  try {
    // Parse URL-encoded initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      console.error('[validateMaxWebAppData] No hash in initData');
      return { valid: false, error: 'No hash in initData' };
    }

    console.log('[validateMaxWebAppData] Hash found, validating signature...');

    // Remove hash and sort remaining params
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Calculate expected hash: HMAC-SHA256 with secret = "WebAppData" + bot_token
    const secret = createHmac('sha256', 'WebAppData' + MAX_BOT_TOKEN).digest();

    const expectedHash = createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (hash !== expectedHash) {
      console.error('[validateMaxWebAppData] Invalid signature');
      return { valid: false, error: 'Invalid signature' };
    }

    console.log('[validateMaxWebAppData] Signature valid, checking freshness...');

    // Check auth_date freshness (max 5 minutes old)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      console.error('[validateMaxWebAppData] initData expired:', {
        authDate,
        now,
        diff: now - authDate,
      });
      return { valid: false, error: 'initData expired' };
    }

    console.log('[validateMaxWebAppData] Data fresh, extracting user ID...');

    // Extract user ID
    const userData = params.get('user');
    if (!userData) {
      console.error('[validateMaxWebAppData] No user data in params');
      return { valid: false, error: 'No user data' };
    }

    const user = JSON.parse(userData);
    if (!user?.id) {
      console.error('[validateMaxWebAppData] No user ID in parsed data');
      return { valid: false, error: 'No user ID in data' };
    }

    console.log('[validateMaxWebAppData] Validation successful, userId:', user.id);

    return {
      valid: true,
      platform: 'max',
      userId: user.id.toString(),
    };
  } catch (err) {
    console.error('[validateMaxWebAppData] Exception during validation:', err);
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Validation failed',
    };
  }
}

/**
 * Validate WebApp request
 * Checks Authorization header for signed WebApp data
 */
export function validateWebAppRequest(authHeader?: string | null): WebAppValidationResult {
  console.log('[validateWebAppRequest] Validating request, hasHeader:', !!authHeader);

  if (!authHeader) {
    console.error('[validateWebAppRequest] No Authorization header');
    return { valid: false, error: 'No Authorization header' };
  }

  // Format: "Bearer <platform>:<initData>"
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[validateWebAppRequest] Invalid Authorization format');
    return { valid: false, error: 'Invalid Authorization format' };
  }

  const encoded = authHeader.substring(7);
  const colonIndex = encoded.indexOf(':');

  if (colonIndex < 0) {
    console.error('[validateWebAppRequest] No colon in authorization data');
    return { valid: false, error: 'Invalid authorization data' };
  }

  const platform = encoded.substring(0, colonIndex);
  const initData = encoded.substring(colonIndex + 1);

  console.log('[validateWebAppRequest] Platform:', platform, 'initData length:', initData.length);

  if (platform === 'telegram') {
    return validateTelegramWebAppData(initData);
  }

  if (platform === 'max') {
    return validateMaxWebAppData(initData);
  }

  console.error('[validateWebAppRequest] Unknown platform:', platform);
  return { valid: false, error: 'Unknown platform' };
}
