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
  if (!TG_BOT_TOKEN) {
    return { valid: false, error: 'TG_BOT_TOKEN not configured' };
  }

  if (!initData) {
    return { valid: false, error: 'No initData provided' };
  }

  try {
    // Parse URL-encoded initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return { valid: false, error: 'No hash in initData' };
    }

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
      return { valid: false, error: 'Invalid signature' };
    }

    // Check auth_date freshness (max 5 minutes old)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return { valid: false, error: 'initData expired' };
    }

    // Extract user ID
    const userData = params.get('user');
    if (!userData) {
      return { valid: false, error: 'No user data' };
    }

    const user = JSON.parse(userData);
    if (!user?.id) {
      return { valid: false, error: 'No user ID in data' };
    }

    return {
      valid: true,
      platform: 'telegram',
      userId: user.id.toString(),
    };
  } catch (err) {
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
  if (!MAX_BOT_TOKEN) {
    return { valid: false, error: 'MAX_BOT_TOKEN not configured' };
  }

  if (!initData) {
    return { valid: false, error: 'No initData provided' };
  }

  try {
    // Parse URL-encoded initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return { valid: false, error: 'No hash in initData' };
    }

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
      return { valid: false, error: 'Invalid signature' };
    }

    // Check auth_date freshness (max 5 minutes old)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return { valid: false, error: 'initData expired' };
    }

    // Extract user ID
    const userData = params.get('user');
    if (!userData) {
      return { valid: false, error: 'No user data' };
    }

    const user = JSON.parse(userData);
    if (!user?.id) {
      return { valid: false, error: 'No user ID in data' };
    }

    return {
      valid: true,
      platform: 'max',
      userId: user.id.toString(),
    };
  } catch (err) {
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
  if (!authHeader) {
    return { valid: false, error: 'No Authorization header' };
  }

  // Format: "Bearer <platform>:<initData>"
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid Authorization format' };
  }

  const encoded = authHeader.substring(7);
  const colonIndex = encoded.indexOf(':');

  if (colonIndex < 0) {
    return { valid: false, error: 'Invalid authorization data' };
  }

  const platform = encoded.substring(0, colonIndex);
  const initData = encoded.substring(colonIndex + 1);

  if (platform === 'telegram') {
    return validateTelegramWebAppData(initData);
  }

  if (platform === 'max') {
    return validateMaxWebAppData(initData);
  }

  return { valid: false, error: 'Unknown platform' };
}
