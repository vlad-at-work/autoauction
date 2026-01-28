export function getMaxBotUrl(startAppPayload: string) {
  const botName = process.env.NEXT_PUBLIC_MAX_BOT_NAME ?? 'id5010035001_bot';
  return `https://max.ru/${botName}?startapp=${encodeURIComponent(startAppPayload)}`;
}

export function getTelegramBotUrl(startAppPayload: string) {
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
  if (!botName) return null;
  return `https://t.me/${botName}?startapp=${encodeURIComponent(startAppPayload)}`;
}
