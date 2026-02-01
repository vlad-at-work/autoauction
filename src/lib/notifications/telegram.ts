/**
 * Telegram Bot API notification service
 * Sends messages to users via Telegram Bot API
 */

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_API_BASE = 'https://api.telegram.org/bot';

type SendMessageResult = {
  success: boolean;
  error?: string;
};

interface SendMessagePayload {
  chat_id: string;
  text: string;
  parse_mode: string;
  reply_markup?: Record<string, unknown>;
}

/**
 * Send a text message to a Telegram user
 * @param replyMarkup - Optional inline keyboard markup for buttons
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<SendMessageResult> {
  if (!TG_BOT_TOKEN) {
    return { success: false, error: 'TG_BOT_TOKEN not configured' };
  }

  try {
    const payload: SendMessagePayload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`${TG_API_BASE}${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Send a message with an inline keyboard button
 */
export async function sendTelegramMessageWithButton(
  chatId: string,
  text: string,
  buttonText: string,
  buttonUrl: string
): Promise<SendMessageResult> {
  if (!TG_BOT_TOKEN) {
    return { success: false, error: 'TG_BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`${TG_API_BASE}${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: buttonText,
                url: buttonUrl,
              },
            ],
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка',
    };
  }
}
