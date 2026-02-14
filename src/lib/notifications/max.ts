/**
 * MAX Platform messaging - MAXIMUM LOGGING VERSION
 */

const MAX_API_BASE = 'https://platform-api.max.ru';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const MAX_BOT_TOKEN_DEALER = process.env.MAX_BOT_TOKEN_DEALER || '';

export type MaxButton = {
  type: 'open_app';
  text: string;
  app_name: string;
  payload?: string;
};

export async function sendMaxMessage(
  userId: number | string,
  text: string,
  buttons?: MaxButton[],
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  console.warn('[=== SEND MAX MESSAGE START ===]');
  console.warn('[SEND] userId:', userId);
  console.warn('[SEND] text:', text);
  console.warn('[SEND] buttons:', buttons);
  console.warn('[SEND] botType:', botType);
  console.warn('[SEND] Timestamp:', new Date().toISOString());

  const token = botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;
  console.warn(
    '[SEND] Token source:',
    botType === 'dealer' ? 'MAX_BOT_TOKEN_DEALER' : 'MAX_BOT_TOKEN'
  );
  console.warn('[SEND] Token length:', token.length);
  console.warn('[SEND] Token first 20 chars:', token.substring(0, 20));

  if (!token || token === '<from_vercel>') {
    console.warn('[SEND] ERROR: Bot token not configured');
    console.warn('[SEND] Token value:', token);
    return { success: false, error: 'Bot token not configured' };
  }

  try {
    const body: {
      text: string;
      attachments?: Array<{
        type: 'inline_keyboard';
        payload: {
          buttons: MaxButton[][];
        };
      }>;
    } = { text };
    console.warn('[SEND] Request body base:', JSON.stringify(body));

    if (buttons && buttons.length > 0) {
      body.attachments = [
        {
          type: 'inline_keyboard',
          payload: {
            buttons: [buttons],
          },
        },
      ];
      console.warn('[SEND] Added attachments with buttons');
    }

    const fullBody = JSON.stringify(body);
    console.warn('[SEND] Full request body:', fullBody);

    const targetUrl = `${MAX_API_BASE}/messages?user_id=${Number(userId)}`;
    console.warn('[SEND] Target URL:', targetUrl);

    const headers = {
      Authorization: token,
      'Content-Type': 'application/json',
    };
    console.warn('[SEND] Request headers:', JSON.stringify(headers));

    console.warn('[SEND] Making fetch request...');
    const startTime = Date.now();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: fullBody,
    });

    const duration = Date.now() - startTime;
    console.warn('[SEND] Response received in', duration, 'ms');
    console.warn('[SEND] Response status:', response.status);
    console.warn('[SEND] Response statusText:', response.statusText);
    console.warn(
      '[SEND] Response headers:',
      JSON.stringify(Object.fromEntries(response.headers.entries()))
    );

    const responseText = await response.text();
    console.warn('[SEND] Raw response body:', responseText);

    if (!response.ok) {
      console.error('[SEND] HTTP ERROR:', response.status, responseText);
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.warn('[SEND] Parsed response:', result);
    } catch {
      console.warn('[SEND] Response is not JSON, treating as text');
      result = { text: responseText };
    }

    console.warn('[SEND] SUCCESS');
    console.warn('[=== SEND MAX MESSAGE END ===]');
    return { success: true };
  } catch (err) {
    console.error('[SEND] CRITICAL ERROR:', err);
    console.error('[SEND] Error type:', typeof err);
    console.error('[SEND] Error message:', (err as Error).message);
    console.error('[SEND] Error stack:', (err as Error).stack);
    console.warn('[=== SEND MAX MESSAGE END (ERROR) ===]');
    return { success: false, error: String(err) };
  }
}
