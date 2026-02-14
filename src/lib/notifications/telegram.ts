/**
 * Telegram Bot messaging
 *
 * Mirrors src/lib/notifications/max.ts for Telegram Bot API
 */

const TG_API_BASE = 'https://api.telegram.org';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_BOT_TOKEN_DEALER = process.env.TG_BOT_TOKEN_DEALER || '';

export type TelegramButton = {
  text: string;
  web_app: { url: string };
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  buttons?: TelegramButton[],
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  const token = botType === 'dealer' ? TG_BOT_TOKEN_DEALER : TG_BOT_TOKEN;

  if (!token) {
    console.error('[Telegram] Bot token not configured for:', botType);
    return { success: false, error: 'Bot token not configured' };
  }

  const url = `${TG_API_BASE}/bot${token}/sendMessage`;

  const body: {
    chat_id: number | string;
    text: string;
    parse_mode: 'HTML';
    reply_markup?: {
      inline_keyboard: TelegramButton[][];
    };
  } = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };

  if (buttons && buttons.length > 0) {
    body.reply_markup = {
      inline_keyboard: [buttons],
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Telegram] HTTP error:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (err) {
    console.error('[Telegram] Error sending message:', err);
    return { success: false, error: String(err) };
  }
}
