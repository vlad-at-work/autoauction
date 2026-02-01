/**
 * Unified notification service
 * Sends notifications to users via their registered platform (Telegram or MAX)
 * Includes deep links for direct navigation to relevant sections
 */

import type { Platform } from '@prisma/client';

import { sendMaxMessage } from './max';
import { sendTelegramMessage } from './telegram';
import {
  createNotificationButtons,
  formatMaxNotification,
  formatTelegramNotification,
} from '../deeplinks';

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

  // Create buttons with deep link to this specific inquiry
  const buttons = createNotificationButtons('inquiry', inquiryId, '📱 Посмотреть предложения');

  if (buyer.platform === 'TELEGRAM') {
    const telegramPayload = formatTelegramNotification(text, buttons);
    return sendTelegramMessage(chatId, telegramPayload.text, telegramPayload.reply_markup);
  }

  const maxPayload = formatMaxNotification(text, buttons);
  return sendMaxMessage(chatId, maxPayload.text, maxPayload.attachments);
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

/**
 * Send notification about a new inquiry to a dealer
 */
export async function notifyDealerOfNewInquiry(
  dealer: {
    platform: Platform;
    platformChatId?: string;
    platformUserId: string;
  },
  inquiryId: string,
  carModel: string,
  carSubmodel: string,
  transmission: string,
  color: string
): Promise<NotifyResult> {
  const chatId = dealer.platformChatId || dealer.platformUserId;

  const text = `Новая заявка!\n\n${carModel} ${carSubmodel}\n${transmission} • ${color}\n\nПерейдите в личный кабинет дилера, чтобы сделать предложение.`;

  if (dealer.platform === 'TELEGRAM') {
    return sendTelegramMessage(chatId, text);
  }

  return sendMaxMessage(chatId, text);
}

/**
 * Send notification to dealer when a buyer accepts their offer (transaction created)
 */
export async function notifyDealerOfTransactionAccepted(
  dealer: {
    id: string;
    username: string;
  },
  carModel: string,
  carSubmodel: string,
  price: number,
  buyerName: string,
  buyerPhone: string
): Promise<NotifyResult> {
  // Get dealer from hardcoded list to find their notification channel
  const { getHardcodedDealerByUsername } = await import('@/lib/hardcoded-dealers');
  const hardcodedDealer = getHardcodedDealerByUsername(dealer.username);

  if (!hardcodedDealer) {
    console.warn(`Dealer ${dealer.username} not in hardcoded list, skipping notification`);
    return { success: false, error: 'Dealer not in hardcoded list' };
  }

  if (!hardcodedDealer.active) {
    return { success: false, error: 'Dealer notifications disabled' };
  }

  const chatId = hardcodedDealer.platformChatId || hardcodedDealer.platformUserId;
  const formattedPrice = price.toLocaleString('ru-RU');

  const text = `🎉 Покупатель принял ваше предложение!\n\n${carModel} ${carSubmodel}\nЦена: ${formattedPrice} ₽\n\nПокупатель: ${buyerName}\nТелефон: ${buyerPhone}\n\nСвяжитесь с покупателем как можно скорее!`;

  if (hardcodedDealer.platform === 'TELEGRAM') {
    return sendTelegramMessage(chatId, text);
  }

  return sendMaxMessage(chatId, text);
}

// Keep old name as alias for backward compatibility during migration
export const notifyDealerOfLeadAccepted = notifyDealerOfTransactionAccepted;

export { sendTelegramMessage, sendMaxMessage };
