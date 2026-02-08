/**
 * Server-side WebApp authentication validation
 * Validates that requests are actually coming from Telegram or MAX WebView
 *
 * Supports both customer and dealer bots:
 * - Customer: TG_BOT_TOKEN, MAX_BOT_TOKEN
 * - Dealer: TG_BOT_TOKEN_DEALER, MAX_BOT_TOKEN_DEALER
 */

import { createHmac } from 'crypto';

// Customer bot tokens
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;

// Dealer bot tokens
const TG_BOT_TOKEN_DEALER = process.env.TG_BOT_TOKEN_DEALER;
const MAX_BOT_TOKEN_DEALER = process.env.MAX_BOT_TOKEN_DEALER;

export type BotType = 'customer' | 'dealer';

const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
const INIT_DATA_MAX_AGE_SECONDS = (() => {
  const parsed = Number(process.env.WEBAPP_INIT_DATA_MAX_AGE_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INIT_DATA_MAX_AGE_SECONDS;
})();

export type WebAppValidationResult = {
  valid: boolean;
  platform?: 'telegram' | 'max';
  userId?: string;
  chatId?: string;
  botType?: BotType;
  error?: string;
};

/**
 * Validate Telegram WebApp data
 *
 * Telegram sends initData as URL-encoded string with HMAC-SHA256 signature
 * Format: user=%7B%22id%22...&hash=ABC123...
 */
export function validateTelegramWebAppData(
  initData: string,
  botType: BotType = 'customer'
): WebAppValidationResult {
  console.log('[validateTelegramWebAppData] Starting validation, botType:', botType);

  const token = botType === 'dealer' ? TG_BOT_TOKEN_DEALER : TG_BOT_TOKEN;

  if (!token) {
    const tokenName = botType === 'dealer' ? 'TG_BOT_TOKEN_DEALER' : 'TG_BOT_TOKEN';
    console.error(`[validateTelegramWebAppData] ${tokenName} not configured`);
    return { valid: false, error: `${tokenName} not configured` };
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
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();

    const expectedHash = createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (hash !== expectedHash) {
      console.error('[validateTelegramWebAppData] Invalid signature');
      return { valid: false, error: 'Invalid signature' };
    }

    console.log('[validateTelegramWebAppData] Signature valid, checking freshness...');

    // Check auth_date freshness
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > INIT_DATA_MAX_AGE_SECONDS) {
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

    // Extract chat ID if available
    const chatData = params.get('chat');
    let chatId: string | undefined;
    if (chatData) {
      try {
        const chat = JSON.parse(chatData);
        chatId = chat?.id?.toString();
      } catch {
        // Chat data parsing failed, continue without it
      }
    }

    console.log('[validateTelegramWebAppData] Validation successful, userId:', user.id);

    return {
      valid: true,
      platform: 'telegram',
      userId: user.id.toString(),
      chatId: chatId || user.id.toString(), // Fallback to user ID as chat ID
      botType,
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
export function validateMaxWebAppData(
  initData: string,
  botType: BotType = 'customer'
): WebAppValidationResult {
  console.log('[validateMaxWebAppData] Starting validation, botType:', botType);

  const token = botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;

  if (!token) {
    const tokenName = botType === 'dealer' ? 'MAX_BOT_TOKEN_DEALER' : 'MAX_BOT_TOKEN';
    console.error(`[validateMaxWebAppData] ${tokenName} not configured`);
    return { valid: false, error: `${tokenName} not configured` };
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

    // Calculate expected hash: HMAC-SHA256 with secret = HMAC_SHA256("WebAppData", bot_token)
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();

    const expectedHash = createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (hash !== expectedHash) {
      console.error('[validateMaxWebAppData] Invalid signature');
      return { valid: false, error: 'Invalid signature' };
    }

    console.log('[validateMaxWebAppData] Signature valid, checking freshness...');

    // Check auth_date freshness
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > INIT_DATA_MAX_AGE_SECONDS) {
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

    // Extract chat ID if available
    const chatData = params.get('chat');
    let chatId: string | undefined;
    if (chatData) {
      try {
        const chat = JSON.parse(chatData);
        chatId = chat?.id?.toString();
      } catch {
        // Chat data parsing failed, continue without it
      }
    }

    console.log('[validateMaxWebAppData] Validation successful, userId:', user.id);

    return {
      valid: true,
      platform: 'max',
      userId: user.id.toString(),
      chatId: chatId || user.id.toString(), // Fallback to user ID as chat ID
      botType,
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
 *
 * Header format: "Bearer <platform>:<initData>" or "Bearer <platform>:<botType>:<initData>"
 */
export function validateWebAppRequest(
  authHeader?: string | null,
  defaultBotType: BotType = 'customer'
): WebAppValidationResult {
  console.log('[validateWebAppRequest] Validating request, hasHeader:', !!authHeader);

  if (!authHeader) {
    console.error('[validateWebAppRequest] No Authorization header');
    return { valid: false, error: 'No Authorization header' };
  }

  // Format: "Bearer <platform>:<initData>" or "Bearer <platform>:<botType>:<initData>"
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[validateWebAppRequest] Invalid Authorization format');
    return { valid: false, error: 'Invalid Authorization format' };
  }

  const encoded = authHeader.substring(7);
  const firstColonIndex = encoded.indexOf(':');

  if (firstColonIndex < 0) {
    console.error('[validateWebAppRequest] No colon in authorization data');
    return { valid: false, error: 'Invalid authorization data' };
  }

  const platform = encoded.substring(0, firstColonIndex);
  const remaining = encoded.substring(firstColonIndex + 1);

  // Check if botType is specified (format: platform:botType:initData)
  let botType: BotType = defaultBotType;
  let initData: string;

  if (remaining.startsWith('customer:') || remaining.startsWith('dealer:')) {
    const secondColonIndex = remaining.indexOf(':');
    botType = remaining.substring(0, secondColonIndex) as BotType;
    initData = remaining.substring(secondColonIndex + 1);
  } else {
    initData = remaining;
  }

  console.log(
    '[validateWebAppRequest] Platform:',
    platform,
    'botType:',
    botType,
    'initData length:',
    initData.length
  );

  if (platform === 'telegram') {
    return validateTelegramWebAppData(initData, botType);
  }

  if (platform === 'max') {
    return validateMaxWebAppData(initData, botType);
  }

  console.error('[validateWebAppRequest] Unknown platform:', platform);
  return { valid: false, error: 'Unknown platform' };
}
