/**
 * Centralized configuration constants for AutoAuction
 * All magic numbers and limits defined in one place
 */

export const INQUIRY_LIMITS = {
  MAX_PER_MONTH: 2,
  RESET_DAYS: 15,
} as const;

export const OFFER_LIMITS = {
  MAX_PER_DEALER_PER_INQUIRY: 5,
} as const;

export const TRANSACTION_LIMITS = {
  MAX_PER_INQUIRY: 3,
  MAX_PER_DEALER_PER_INQUIRY: 1,
} as const;

export const VALIDATION = {
  MAX_USERNAME_LENGTH: 50,
  MAX_PASSWORD_LENGTH: 100,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/, // E.164 format
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

export const WEBHOOK_CONFIG = {
  TIMEOUT_MS: 2000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

export const AUTH_CONFIG = {
  TOKEN_EXPIRY_MIN: 5,
  SESSION_TIMEOUT_HOURS: 24,
  MAX_FAILED_ATTEMPTS: 5,
} as const;

export const RATE_LIMITS = {
  AUTH_PER_MINUTE: 5,
  OFFERS_PER_HOUR: 100,
  INQUIRIES_PER_DAY: 5,
} as const;

export const API_ENDPOINTS = {
  TELEGRAM_BASE: 'https://api.telegram.org',
  MAX_BASE: 'https://platform-api.max.ru',
} as const;

export const NOTIFICATION_MESSAGES = {
  INQUIRY_CREATED: 'Ваша заявка создана и разослана дилерам',
  OFFER_RECEIVED: 'Вы получили новое предложение',
  OFFER_ACCEPTED: 'Ваше предложение принято',
  TRANSACTION_CREATED: 'Трансакция успешно создана',
} as const;
