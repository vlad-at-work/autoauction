/**
 * Unified notification service
 * Sends notifications to users via their registered platform (Telegram or MAX)
 */

import type { Platform } from '@prisma/client';

import { sendMaxMessage } from './max';
import { sendTelegramMessage } from './telegram';

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
  const text = `🔔 Новое предложение на ${carModel} ${carSubmodel}\nЦена: ${formattedPrice} руб.\n\nОткройте приложение, чтобы посмотреть предложение и принять его.`;

  if (buyer.platform === 'TELEGRAM') {
    return sendTelegramMessage(chatId, text);
  }

  return sendMaxMessage(chatId, text);
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
 * Send notification to dealer when a buyer accepts their offer (lead created)
 */
export async function notifyDealerOfLeadAccepted(
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

  const text = `Покупатель принял ваше предложение!\n\n${carModel} ${carSubmodel}\nЦена: ${formattedPrice} руб.\n\nПокупатель: ${buyerName}\nТелефон: ${buyerPhone}\n\nСвяжитесь с покупателем как можно скорее!`;

  if (hardcodedDealer.platform === 'TELEGRAM') {
    return sendTelegramMessage(chatId, text);
  }

  return sendMaxMessage(chatId, text);
}

export { sendTelegramMessage, sendMaxMessage };
