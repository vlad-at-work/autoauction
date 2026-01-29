/**
 * Unified notification service
 * Sends notifications to users via their registered platform (Telegram or MAX)
 */

import type { Platform } from '@prisma/client';

import { sendMaxMessage, sendMaxMessageWithButton } from './max';
import { sendTelegramMessage, sendTelegramMessageWithButton } from './telegram';

const TG_BOT_NAME = process.env.TG_BOT_NAME || 'autoauction_bot';

type NotifyResult = {
  success: boolean;
  error?: string;
};

type BuyerInfo = {
  platform: Platform;
  platformChatId: string | null;
  platformUserId: string;
};

/**
 * Generate deep link URL for a specific offer
 */
function getOfferDeepLink(
  platform: Platform,
  inquiryId: string,
  offerId: string
): { url: string; startParam: string } {
  const startParam = `offer_${inquiryId}_${offerId}`;

  if (platform === 'TELEGRAM') {
    return {
      url: `https://t.me/${TG_BOT_NAME}?startapp=${startParam}`,
      startParam,
    };
  }

  // MAX deep link - uses startapp parameter in the mini-app
  return {
    url: '', // MAX uses button with open_app type instead of URL
    startParam,
  };
}

/**
 * Send notification about a new offer to a buyer
 */
export async function notifyBuyerOfNewOffer(
  buyer: BuyerInfo,
  inquiryId: string,
  offerId: string,
  carModel: string,
  carSubmodel: string,
  price: number
): Promise<NotifyResult> {
  const chatId = buyer.platformChatId || buyer.platformUserId;

  const formattedPrice = price.toLocaleString('ru-RU');
  const text = `Новое предложение на ${carModel} ${carSubmodel}\nЦена: ${formattedPrice} руб.`;
  const buttonText = 'Посмотреть';

  const { url, startParam } = getOfferDeepLink(buyer.platform, inquiryId, offerId);

  if (buyer.platform === 'TELEGRAM') {
    return sendTelegramMessageWithButton(chatId, text, buttonText, url);
  }

  return sendMaxMessageWithButton(chatId, text, buttonText, startParam);
}

/**
 * Send a simple text notification to a buyer
 */
export async function notifyBuyer(buyer: BuyerInfo, text: string): Promise<NotifyResult> {
  const chatId = buyer.platformChatId || buyer.platformUserId;

  if (buyer.platform === 'TELEGRAM') {
    return sendTelegramMessage(chatId, text);
  }

  return sendMaxMessage(chatId, text);
}

export { sendTelegramMessage, sendMaxMessage };
