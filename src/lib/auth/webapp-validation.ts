/**
 * WebApp validation for buyer mini-app authentication
 * Validates Telegram and MAX initData for secure API access
 *
 * Note: Dealer auth has been stripped out. This is for buyers only.
 */

import { createHmac } from 'crypto';

export type ValidationResult =
  | { valid: true; userId: string; platform: 'max' | 'telegram'; chatId?: string; error?: never }
  | { valid: false; error: string; userId?: never; platform?: never; chatId?: never };

/**
 * Parse and validate WebApp initData
 * Supports both Telegram and MAX platforms
 *
 * For Telegram: Validates using HMAC-SHA256 of bot token
 * For MAX: Validates using similar method
 *
 * @param authHeader - Authorization header value
 * @param botType - 'customer' or 'dealer' (determines which bot token to use)
 */
export function validateWebAppRequest(
  authHeader: string | null,
  botType: 'customer' | 'dealer' = 'customer'
): ValidationResult {
  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }

  // Parse "Bearer <platform>:<type>:<initData>" format
  // Format: "Bearer max:customer:<initData>" or "Bearer telegram:customer:<initData>"
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { valid: false, error: 'Invalid authorization format' };
  }

  const parts = token.split(':');
  if (parts.length < 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  const platform = parts[0] as 'max' | 'telegram';
  const initData = parts.slice(2).join(':'); // Join remaining parts in case initData contains colons

  if (!initData) {
    return { valid: false, error: 'Missing initData' };
  }

  // Select correct bot token based on bot type
  const BOT_TOKEN =
    botType === 'dealer'
      ? process.env.MAX_BOT_TOKEN_DEALER || process.env.TG_BOT_TOKEN_DEALER || ''
      : process.env.MAX_BOT_TOKEN || process.env.TG_BOT_TOKEN || '';

  if (!BOT_TOKEN) {
    return { valid: false, error: 'Bot token not configured' };
  }

  // Parse initData (URL-encoded key=value pairs separated by &)
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    return { valid: false, error: 'Missing hash in initData' };
  }

  // Build data check string (sorted key=value pairs excluding hash)
  const dataCheckStrings: string[] = [];
  params.sort();
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      dataCheckStrings.push(`${key}=${value}`);
    }
  }
  const dataCheckString = dataCheckStrings.join('\n');

  // Validate HMAC
  // Telegram: HMAC_SHA256(bot_token, "WebAppData")
  // Then: HMAC_SHA256(secret_key, data_check_string)
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash !== hash) {
    // In development, allow validation to pass for testing
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_WEBAPP_AUTH === 'true') {
      // eslint-disable-next-line no-console
      console.log('[validateWebAppRequest] Mock auth enabled, bypassing hash validation');
      // Continue to extract user info
    } else {
      return { valid: false, error: 'Invalid initData hash' };
    }
  }

  // Extract user ID from initData
  const userJson = params.get('user');
  if (!userJson) {
    return { valid: false, error: 'Missing user in initData' };
  }

  try {
    const user = JSON.parse(userJson);
    const userId = user.id?.toString();

    if (!userId) {
      return { valid: false, error: 'Missing user ID' };
    }

    // Try to extract chat_id from initData for notifications
    let chatId: string | undefined;
    try {
      const chatJson = params.get('chat');
      if (chatJson) {
        const chat = JSON.parse(chatJson);
        chatId = chat.id?.toString();
      }
    } catch {
      // Chat ID optional, ignore parse errors
    }

    return { valid: true, userId, platform, chatId };
  } catch {
    return { valid: false, error: 'Invalid user data format' };
  }
}

/**
 * Check if a platform user is already a dealer
 * Since dealer interface is disabled, this always returns false
 * (kept for compatibility with existing code)
 */
export async function isPlatformUserDealer(
  _platform: 'MAX' | 'TELEGRAM',
  _platformUserId: string
): Promise<boolean> {
  // Dealer interface is disabled - no one is a dealer anymore
  // This function is kept for API compatibility
  return false;
}
