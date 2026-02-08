/**
 * Unified notification service
 * Sends notifications to users via their registered platform (Telegram or MAX)
 * Includes deep links for direct navigation to relevant sections
 *
 * Supports routing to correct bot:
 * - Buyer notifications → customer bots (TG_BOT_TOKEN, MAX_BOT_TOKEN)
 * - Dealer notifications → dealer bots (TG_BOT_TOKEN_DEALER, MAX_BOT_TOKEN_DEALER)
 *
 * Mock mode: Set MOCK_WEBAPP_AUTH=true to log notifications instead of sending
 * (prevents rate limits during testing)
 */

import type { Platform } from '@prisma/client';

import { sendMaxMessage, sendMaxMessageWithButton, type MaxBotType } from './max';
import { sendTelegramMessage, type TelegramBotType } from './telegram';
import { createNotificationButtons, formatTelegramNotification } from '../deeplinks';
import { getAppBaseUrl } from '@/lib/app-url';

const MOCK_NOTIFICATIONS = process.env.MOCK_WEBAPP_AUTH === 'true';

type NotifyResult = {
  success: boolean;
  error?: string;
};

/**
 * Mock notification sender for test mode
 * Logs to console instead of hitting external APIs
 */
function mockSendNotification(
  platform: Platform,
  chatId: string,
  text: string,
  context: string
): NotifyResult {
  console.log(`[MOCK NOTIFICATION] ${context}`);
  console.log(`  Platform: ${platform}`);
  console.log(`  Chat ID: ${chatId}`);
  console.log(`  Text: ${text.substring(0, 100)}...`);
  return { success: true };
}

type BuyerInfo = {
  platform: Platform;
  platformChatId: string | null;
  platformUserId: string;
};

/**
 * Send notification about a new offer to a buyer
 * Includes deep link to view the specific offer
 * @param isFirstOffer - true if this is the first offer from this dealer on this inquiry
 */
export async function notifyBuyerOfNewOffer(
  buyer: BuyerInfo,
  inquiryId: string,
  offerId: string,
  carModel: string,
  carSubmodel: string,
  price: number,
  isFirstOffer: boolean = true
): Promise<NotifyResult> {
  const chatId = buyer.platformChatId || buyer.platformUserId;

  const formattedPrice = price.toLocaleString('ru-RU');
  const title = isFirstOffer ? 'Новое предложение' : 'Дилер обновил предложение';
  const text = `🔔 ${title} на ${carModel} ${carSubmodel}\nЦена: ${formattedPrice} ₽\n\nОткройте приложение, чтобы посмотреть предложение и принять его.`;

  if (MOCK_NOTIFICATIONS) {
    return mockSendNotification(buyer.platform, chatId, text, 'notifyBuyerOfNewOffer');
  }

  // Create buttons with deep link to this specific inquiry
  const buttons = createNotificationButtons('inquiry', inquiryId, '📱 Посмотреть предложения');

  if (buyer.platform === 'TELEGRAM') {
    const telegramPayload = formatTelegramNotification(text, buttons);
    return sendTelegramMessage(chatId, telegramPayload.text, telegramPayload.reply_markup);
  }

  // For MAX, use proper button like Telegram
  return sendMaxMessageWithButton(
    chatId,
    text,
    '📱 Посмотреть предложения',
    `inquiry:${inquiryId}`
  );
}

/**
 * Send a simple text notification to a buyer
 */
export async function notifyBuyer(buyer: BuyerInfo, text: string): Promise<NotifyResult> {
  const chatId = buyer.platformChatId || buyer.platformUserId;

  if (MOCK_NOTIFICATIONS) {
    return mockSendNotification(buyer.platform, chatId, text, 'notifyBuyer');
  }

  if (buyer.platform === 'TELEGRAM') {
    return sendTelegramMessage(chatId, text);
  }

  return sendMaxMessage(chatId, text);
}

function createDealerWebAppButton(startParam: string, buttonText: string) {
  const appUrl = getAppBaseUrl();
  const fullAppUrl = `${appUrl}/dealerinterface?startapp=${encodeURIComponent(startParam)}`;

  return {
    inline_keyboard: [
      [
        {
          text: buttonText,
          web_app: {
            url: fullAppUrl,
          },
        },
      ],
    ],
  };
}

/**
 * Send password reset code to dealer via their registered platform
 * Uses dealer bot tokens for delivery
 */
export async function sendDealerPasswordResetCode(
  dealer: {
    platform: Platform;
    platformChatId?: string | null;
    platformUserId?: string | null;
  },
  code: string
): Promise<NotifyResult> {
  if (!dealer.platform || !dealer.platformUserId) {
    return { success: false, error: 'Dealer platform not configured' };
  }

  const chatId = dealer.platformChatId || dealer.platformUserId;
  const text = `🔐 Код сброса пароля: ${code}\n\nЭтот код действителен 10 минут.\nЕсли вы не запрашивали сброс пароля, проигнорируйте это сообщение.`;

  if (MOCK_NOTIFICATIONS) {
    return mockSendNotification(dealer.platform, chatId, text, 'sendDealerPasswordResetCode');
  }

  const botType: TelegramBotType | MaxBotType = 'dealer';

  if (dealer.platform === 'TELEGRAM') {
    return sendTelegramMessage(chatId, text, undefined, botType);
  }

  return sendMaxMessage(chatId, text, undefined, botType);
}

/**
 * Send notification to dealer about new inquiry (using dealer bot)
 * This replaces the old notifyDealerOfNewInquiry that used hardcoded dealers
 */
export async function notifyDealerOfNewInquiryViaBot(
  dealer: {
    platform: Platform;
    platformChatId?: string | null;
    platformUserId?: string | null;
  },
  inquiryId: string,
  carModel: string,
  carSubmodel: string,
  transmission: string,
  color: string
): Promise<NotifyResult> {
  if (!dealer.platform || !dealer.platformUserId) {
    return { success: false, error: 'Dealer platform not configured' };
  }

  const chatId = dealer.platformChatId || dealer.platformUserId;
  const text = `🚗 Новая заявка!\n\n${carModel} ${carSubmodel}\n${transmission} • ${color}\n\nОткройте приложение, чтобы сделать предложение.`;

  if (MOCK_NOTIFICATIONS) {
    return mockSendNotification(dealer.platform, chatId, text, 'notifyDealerOfNewInquiryViaBot');
  }

  const startParam = `inquiry:${inquiryId}`;
  const botType: TelegramBotType | MaxBotType = 'dealer';

  if (dealer.platform === 'TELEGRAM') {
    const replyMarkup = createDealerWebAppButton(startParam, '📱 Открыть заявку');
    return sendTelegramMessage(chatId, text, replyMarkup, botType);
  }

  return sendMaxMessageWithButton(chatId, text, '📱 Открыть заявку', startParam, botType);
}

/**
 * Send notification to dealer when their offer is accepted (using dealer bot)
 */
export async function notifyDealerOfAcceptedOfferViaBot(
  dealer: {
    platform: Platform;
    platformChatId?: string | null;
    platformUserId?: string | null;
  },
  inquiryId: string,
  carModel: string,
  carSubmodel: string,
  price: number,
  buyerName: string,
  buyerPhone: string
): Promise<NotifyResult> {
  if (!dealer.platform || !dealer.platformUserId) {
    return { success: false, error: 'Dealer platform not configured' };
  }

  const chatId = dealer.platformChatId || dealer.platformUserId;
  const formattedPrice = price.toLocaleString('ru-RU');
  const text = `🎉 Покупатель принял ваше предложение!\n\n${carModel} ${carSubmodel}\nЦена: ${formattedPrice} ₽\n\nПокупатель: ${buyerName}\nТелефон: ${buyerPhone}\n\nСвяжитесь с покупателем как можно скорее!`;

  if (MOCK_NOTIFICATIONS) {
    return mockSendNotification(dealer.platform, chatId, text, 'notifyDealerOfAcceptedOfferViaBot');
  }

  const startParam = `inquiry:${inquiryId}`;
  const botType: TelegramBotType | MaxBotType = 'dealer';

  if (dealer.platform === 'TELEGRAM') {
    const replyMarkup = createDealerWebAppButton(startParam, '📱 Открыть заявку');
    return sendTelegramMessage(chatId, text, replyMarkup, botType);
  }

  return sendMaxMessageWithButton(chatId, text, '📱 Открыть заявку', startParam, botType);
}

export { sendTelegramMessage, sendMaxMessage };
