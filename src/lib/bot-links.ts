export function getMaxBotUrl(startAppPayload?: string) {
  const botName = process.env.NEXT_PUBLIC_MAX_BOT_NAME ?? 'id5010035001_bot';
  if (startAppPayload) {
    return `https://max.ru/${botName}?startapp=${encodeURIComponent(startAppPayload)}`;
  }
  return `https://max.ru/${botName}`;
}

export function getTelegramBotUrl(startAppPayload?: string) {
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
  if (!botName) {
    return null;
  }
  if (startAppPayload) {
    return `https://t.me/${botName}?startapp=${encodeURIComponent(startAppPayload)}`;
  }
  return `https://t.me/${botName}`;
}
