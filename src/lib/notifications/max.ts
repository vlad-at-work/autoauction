/**
 * MAX Platform messaging
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
  const token = botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;

  if (!token || token === '<from_vercel>') {
    console.warn('[MAX] Bot token not configured for:', botType);
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

    if (buttons && buttons.length > 0) {
      body.attachments = [
        {
          type: 'inline_keyboard',
          payload: {
            buttons: [buttons],
          },
        },
      ];
    }

    const response = await fetch(`${MAX_API_BASE}/messages?user_id=${Number(userId)}`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('[MAX] Send failed:', response.status, responseText);
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }

    return { success: true };
  } catch (err) {
    console.error('[MAX] Send error:', (err as Error).message);
    return { success: false, error: String(err) };
  }
}
