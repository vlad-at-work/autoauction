/**
 * WebApp validation - MAXIMUM LOGGING VERSION
 */

import { createHmac } from 'crypto';

export type ValidationResult =
  | { valid: true; userId: string; platform: 'max' | 'telegram'; chatId?: string; error?: never }
  | { valid: false; error: string; userId?: never; platform?: never; chatId?: never };

export function validateWebAppRequest(
  authHeader: string | null,
  botType: 'customer' | 'dealer' = 'customer'
): ValidationResult {
  console.warn('[=== VALIDATE START ===]');
  console.warn('[VALIDATE] Timestamp:', new Date().toISOString());
  console.warn('[VALIDATE] botType:', botType);
  console.warn('[VALIDATE] authHeader present:', !!authHeader);
  console.warn('[VALIDATE] authHeader length:', authHeader?.length);
  console.warn('[VALIDATE] authHeader first 150 chars:', authHeader?.substring(0, 150));

  if (!authHeader) {
    console.warn('[VALIDATE] ERROR: Missing authorization header');
    return { valid: false, error: 'Missing authorization header' };
  }

  const [scheme, token] = authHeader.split(' ');
  console.warn('[VALIDATE] scheme:', scheme);
  console.warn('[VALIDATE] token present:', !!token);

  if (scheme !== 'Bearer' || !token) {
    console.warn('[VALIDATE] ERROR: Invalid authorization format');
    return { valid: false, error: 'Invalid authorization format' };
  }

  const parts = token.split(':');
  console.warn('[VALIDATE] Token parts count:', parts.length);
  console.warn(
    '[VALIDATE] Token parts:',
    parts.slice(0, 3).map((p, i) => `part${i}: ${p?.substring(0, 50)}...`)
  );

  if (parts.length < 3) {
    console.warn('[VALIDATE] ERROR: Invalid token format, need at least 3 parts');
    return { valid: false, error: 'Invalid token format' };
  }

  const platform = parts[0] as 'max' | 'telegram';
  const initData = parts.slice(2).join(':');
  console.warn('[VALIDATE] platform:', platform);
  console.warn('[VALIDATE] initData length:', initData.length);
  console.warn('[VALIDATE] initData first 200 chars:', initData.substring(0, 200));

  if (!initData) {
    console.warn('[VALIDATE] ERROR: Missing initData');
    return { valid: false, error: 'Missing initData' };
  }

  // Select correct bot token
  const BOT_TOKEN =
    botType === 'dealer'
      ? process.env.MAX_BOT_TOKEN_DEALER || process.env.TG_BOT_TOKEN_DEALER || ''
      : process.env.MAX_BOT_TOKEN || process.env.TG_BOT_TOKEN || '';

  console.warn('[VALIDATE] BOT_TOKEN source:', botType === 'dealer' ? 'DEALER' : 'CUSTOMER');
  console.warn('[VALIDATE] BOT_TOKEN length:', BOT_TOKEN.length);
  console.warn('[VALIDATE] BOT_TOKEN first 30 chars:', BOT_TOKEN.substring(0, 30));

  if (!BOT_TOKEN) {
    console.warn('[VALIDATE] ERROR: Bot token not configured');
    return { valid: false, error: 'Bot token not configured' };
  }

  // Parse initData
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
    console.warn(
      '[VALIDATE] URLSearchParams created, entries:',
      Array.from(params.keys()).join(', ')
    );
  } catch (e) {
    console.error('[VALIDATE] ERROR parsing URLSearchParams:', e);
    return { valid: false, error: 'Invalid initData format' };
  }

  const hash = params.get('hash');
  console.warn('[VALIDATE] hash present:', !!hash);
  console.warn('[VALIDATE] hash first 50 chars:', hash?.substring(0, 50));

  if (!hash) {
    console.warn('[VALIDATE] ERROR: Missing hash in initData');
    return { valid: false, error: 'Missing hash in initData' };
  }

  // Build data check string
  const dataCheckStrings: string[] = [];
  params.sort();
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      dataCheckStrings.push(`${key}=${value}`);
    }
  }
  const dataCheckString = dataCheckStrings.join('\n');
  console.warn('[VALIDATE] dataCheckString length:', dataCheckString.length);
  console.warn('[VALIDATE] dataCheckString first 200 chars:', dataCheckString.substring(0, 200));

  // Validate HMAC
  try {
    const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    console.warn('[VALIDATE] secretKey generated, length:', secretKey.length);

    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    console.warn('[VALIDATE] calculatedHash:', calculatedHash.substring(0, 50) + '...');
    console.warn('[VALIDATE] provided hash:', hash.substring(0, 50) + '...');
    console.warn('[VALIDATE] hashes match?', calculatedHash === hash);

    if (calculatedHash !== hash) {
      console.warn('[VALIDATE] Hash mismatch!');

      if (process.env.NODE_ENV === 'development' && process.env.MOCK_WEBAPP_AUTH === 'true') {
        console.warn('[VALIDATE] DEV MODE: Mock auth enabled, bypassing hash validation');
      } else {
        console.warn('[VALIDATE] ERROR: Invalid initData hash');
        return { valid: false, error: 'Invalid initData hash' };
      }
    } else {
      console.warn('[VALIDATE] Hash validation passed');
    }
  } catch (e) {
    console.error('[VALIDATE] ERROR during HMAC:', e);
    return { valid: false, error: 'Hash validation failed' };
  }

  // Extract user ID
  const userJson = params.get('user');
  console.warn('[VALIDATE] userJson present:', !!userJson);
  console.warn('[VALIDATE] userJson first 200 chars:', userJson?.substring(0, 200));

  if (!userJson) {
    console.warn('[VALIDATE] ERROR: Missing user in initData');
    return { valid: false, error: 'Missing user in initData' };
  }

  try {
    const user = JSON.parse(userJson);
    console.warn('[VALIDATE] Parsed user:', JSON.stringify(user).substring(0, 200));

    const userId = user.id?.toString();
    console.warn('[VALIDATE] Extracted userId:', userId);

    if (!userId) {
      console.warn('[VALIDATE] ERROR: Missing user ID');
      return { valid: false, error: 'Missing user ID' };
    }

    // Try to extract chat_id
    let chatId: string | undefined;
    try {
      const chatJson = params.get('chat');
      console.warn('[VALIDATE] chatJson present:', !!chatJson);
      if (chatJson) {
        const chat = JSON.parse(chatJson);
        chatId = chat.id?.toString();
        console.warn('[VALIDATE] Extracted chatId:', chatId);
      }
    } catch (e) {
      console.warn('[VALIDATE] Chat parse error (optional):', e);
    }

    console.warn('[VALIDATE] SUCCESS - userId:', userId, 'platform:', platform);
    console.warn('[=== VALIDATE END ===]');
    return { valid: true, userId, platform, chatId };
  } catch (e) {
    console.error('[VALIDATE] ERROR parsing user JSON:', e);
    return { valid: false, error: 'Invalid user data format' };
  }
}

export async function isPlatformUserDealer(
  _platform: 'MAX' | 'TELEGRAM',
  _platformUserId: string
): Promise<boolean> {
  return false;
}
