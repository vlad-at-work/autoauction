/**
 * Notifications module - TEMPORARILY DISABLED
 *
 * This module is stubbed out as part of the dealer auth system removal.
 * The buyer mini-app flow remains functional but notifications are disabled.
 *
 * When rebuilding the dealer auth system, re-implement this module
 * with proper MAX/Telegram bot integration.
 */

import type { Platform } from '@prisma/client';

type NotifyResult = {
  success: boolean;
  error?: string;
};

type BuyerInfo = {
  platform: Platform;
  platformChatId: string | null;
  platformUserId: string;
};

// Stub function - logs but doesn't send
function stubNotify(context: string): NotifyResult {
  // eslint-disable-next-line no-console
  console.log(`[NOTIFICATIONS DISABLED] ${context}`);
  return { success: true };
}

export async function notifyBuyerOfNewOffer(
  buyer: BuyerInfo,
  _inquiryId: string,
  _offerId: string,
  carModel: string,
  carSubmodel: string,
  price: number,
  _isFirstOffer: boolean = true
): Promise<NotifyResult> {
  return stubNotify(
    `notifyBuyerOfNewOffer: ${buyer.platformUserId} - ${carModel} ${carSubmodel} @ ${price}`
  );
}

export async function notifyBuyer(buyer: BuyerInfo, text: string): Promise<NotifyResult> {
  return stubNotify(`notifyBuyer: ${buyer.platformUserId} - ${text.substring(0, 50)}...`);
}

export async function sendDealerPasswordResetCode(
  dealer: {
    platform: Platform;
    platformChatId?: string | null;
    platformUserId?: string | null;
  },
  code: string
): Promise<NotifyResult> {
  return stubNotify(`sendDealerPasswordResetCode: ${dealer.platformUserId} - code: ${code}`);
}

export async function notifyDealerOfNewInquiryViaBot(
  dealer: {
    platform: Platform;
    platformChatId?: string | null;
    platformUserId?: string | null;
  },
  _inquiryId: string,
  carModel: string,
  carSubmodel: string,
  _transmission: string,
  _color: string
): Promise<NotifyResult> {
  return stubNotify(
    `notifyDealerOfNewInquiryViaBot: ${dealer.platformUserId} - ${carModel} ${carSubmodel}`
  );
}

export async function notifyDealerOfAcceptedOfferViaBot(
  dealer: {
    platform: Platform;
    platformChatId?: string | null;
    platformUserId?: string | null;
  },
  _inquiryId: string,
  carModel: string,
  carSubmodel: string,
  _price: number,
  _buyerName: string,
  _buyerPhone: string
): Promise<NotifyResult> {
  return stubNotify(
    `notifyDealerOfAcceptedOfferViaBot: ${dealer.platformUserId} - ${carModel} ${carSubmodel} accepted`
  );
}

// Stub implementations for the legacy functions
export async function sendMaxMessage(): Promise<NotifyResult> {
  return stubNotify('sendMaxMessage');
}

export async function sendTelegramMessage(): Promise<NotifyResult> {
  return stubNotify('sendTelegramMessage');
}
