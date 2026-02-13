/**
 * MAX Platform messaging utilities
 * Based on working implementation from previous commits
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

/**
 * Send message via MAX API
 *
 * @param userId - MAX user_id (NOT chat_id)
 * @param text - Message text
 * @param buttons - Optional inline keyboard buttons
 * @param botType - 'customer' or 'dealer'
 */
export async function sendMaxMessage(
  userId: number | string,
  text: string,
  buttons?: MaxButton[],
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  const token = botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;

  if (!token || token === '<from_vercel>') {
    console.warn(`[MAX] Bot token not configured for ${botType}`);
    return { success: false, error: 'Bot token not configured' };
  }

  try {
    // MAX API: user_id/chat_id go as query params, body is NewMessageBody
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
            buttons: [buttons], // Wrap in array for single row
          },
        },
      ];
    }

    console.warn(`[MAX] Sending message to ${userId} (${botType}):`, {
      textPreview: text.substring(0, 50),
      hasButtons: !!buttons?.length,
    });

    // Per MAX API docs: POST /messages?user_id={user_id}
    const response = await fetch(`${MAX_API_BASE}/messages?user_id=${Number(userId)}`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MAX] Send failed:', { status: response.status, error });
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }

    const result = await response.json();
    console.warn('[MAX] Message sent successfully:', result);

    return { success: true };
  } catch (err) {
    console.error('[MAX] Send error:', err);
    return { success: false, error: String(err) };
  }
}
