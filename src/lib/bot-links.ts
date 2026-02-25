export function getMaxBotUrl(startPayload?: string) {
  const botName = process.env.NEXT_PUBLIC_MAX_BOT_NAME ?? 'AutoAuctionBot';
  if (startPayload) {
    return `https://max.ru/${botName}?start=${encodeURIComponent(startPayload)}`;
  }
  return `https://max.ru/${botName}`;
}

export function getTelegramBotUrl(startPayload?: string) {
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? 'autoauction_bot';
  if (startPayload) {
    return `https://t.me/${botName}?start=${encodeURIComponent(startPayload)}`;
  }
  return `https://t.me/${botName}`;
}
