/**
 * Hardcoded dealers configuration
 * These dealers receive notifications for all new inquiries
 */

import type { Platform } from '@prisma/client';

export type HardcodedDealer = {
  username: string;
  name: string;
  platform: Platform;
  platformUserId: string; // Telegram user ID or MAX user ID
  platformChatId?: string; // For sending notifications
  active: boolean;
};

/**
 * List of hardcoded dealers that should receive notifications for all inquiries.
 * Add/remove dealers here as needed.
 */
export const HARDCODED_DEALERS: HardcodedDealer[] = [
  // Add your dealers here
  // Example format (uncomment and fill in real values):
  /*
  {
    username: 'autovaz_d7291',
    name: 'АвтоВАЗ Дилер',
    platform: 'MAX', // or 'TELEGRAM'
    platformUserId: 'YOUR_DEALER_MAX_USER_ID_HERE', // e.g., '20325912'
    platformChatId: 'YOUR_DEALER_MAX_CHAT_ID_HERE', // e.g., '142618871'
    active: true,
  },
  */
];

/**
 * Get all active hardcoded dealers
 */
export function getActiveHardcodedDealers(): HardcodedDealer[] {
  return HARDCODED_DEALERS.filter((dealer) => dealer.active);
}

/**
 * Get hardcoded dealer by username
 */
export function getHardcodedDealerByUsername(username: string): HardcodedDealer | undefined {
  return HARDCODED_DEALERS.find((dealer) => dealer.username === username);
}
