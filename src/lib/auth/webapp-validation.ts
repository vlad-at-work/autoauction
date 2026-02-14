/**
 * WebApp validation
 */

import { createHmac } from 'crypto';

export type ValidationResult =
  | { valid: true; userId: string; platform: 'max' | 'telegram'; chatId?: string; error?: never }
  | { valid: false; error: string; userId?: never; platform?: never; chatId?: never };

export function validateWebAppRequest(
  authHeader: string | null,
  botType: 'customer' | 'dealer' = 'customer'
): ValidationResult {
  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { valid: false, error: 'Invalid authorization format' };
  }

  const parts = token.split(':');
  if (parts.length < 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  const platform = parts[0] as 'max' | 'telegram';
  const initData = parts.slice(2).join(':');

  if (!initData) {
    return { valid: false, error: 'Missing initData' };
  }

  const BOT_TOKEN =
    botType === 'dealer'
      ? process.env.MAX_BOT_TOKEN_DEALER || process.env.TG_BOT_TOKEN_DEALER || ''
      : process.env.MAX_BOT_TOKEN || process.env.TG_BOT_TOKEN || '';

  if (!BOT_TOKEN) {
    console.warn('[VALIDATE] Bot token not configured for:', botType);
    return { valid: false, error: 'Bot token not configured' };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    return { valid: false, error: 'Missing hash in initData' };
  }

  const dataCheckStrings: string[] = [];
  params.sort();
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      dataCheckStrings.push(`${key}=${value}`);
    }
  }
  const dataCheckString = dataCheckStrings.join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash !== hash) {
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_WEBAPP_AUTH === 'true') {
      console.warn('[VALIDATE] Mock auth enabled, bypassing hash check');
    } else {
      console.warn('[VALIDATE] Hash mismatch - possible tampering or wrong bot token');
      return { valid: false, error: 'Invalid initData hash' };
    }
  }

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

    let chatId: string | undefined;
    try {
      const chatJson = params.get('chat');
      if (chatJson) {
        const chat = JSON.parse(chatJson);
        chatId = chat.id?.toString();
      }
    } catch {
      // Chat ID optional
    }

    return { valid: true, userId, platform, chatId };
  } catch {
    return { valid: false, error: 'Invalid user data format' };
  }
}

export async function isPlatformUserDealer(
  _platform: 'MAX' | 'TELEGRAM',
  _platformUserId: string
): Promise<boolean> {
  return false;
}
