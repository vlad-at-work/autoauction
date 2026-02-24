import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';
import { Button } from '@/components/ui/button';

export default function Home() {
  const maxBotUrl = getMaxBotUrl('inquiry');
  const tgBotUrl = getTelegramBotUrl('inquiry');

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: 'url(/header.jpg)' }}
    >
      {/* Dark overlay */}
      <div className="min-h-screen bg-black/40">
        {/* Header: Logo left, Sponsors right */}
        <div className="flex items-start justify-between gap-4 px-4 pt-2 pb-4 flex-nowrap">
          {/* Main Logo - larger, left */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo1.png"
            alt=""
            className="h-32 sm:h-40 w-auto object-contain drop-shadow-lg shrink-0"
          />

          {/* Sponsor Cards - right, side by side, larger */}
          <div className="flex gap-3 shrink-0">
            {/* Sponsor 1 */}
            <div className="bg-black/50 p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sponsor1.png"
                alt="Совет ветеранов СВО ФПСР"
                className="h-24 sm:h-32 w-auto object-contain"
              />
            </div>
            {/* Sponsor 2 */}
            <div className="bg-black/50 p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sponsor2.png"
                alt="Ассоциация ветеранов СВО г.о. Дубна"
                className="h-24 sm:h-32 w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center px-4 py-4">
          <div className="max-w-4xl w-full text-center">
            {/* Logo and Service Description */}
            {/* <div className="bg-black/50 p-4 rounded-lg mb-4 inline-block">
              <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl md:text-5xl">
                Свои Авто
              </h1>
            </div> */}

            <div className="bg-black/50 p-4 mb-6 inline-block">
              <p className="[font-family:var(--font-heading)] text-2xl sm:text-4xl md:text-5xl text-white tracking-wide font-bold">
                СПЕЦИАЛЬНЫЙ СЕРВИС ДЛЯ ПОДДЕРЖКИ УЧАСТНИКОВ СВО И ИХ СЕМЕЙ
              </p>
            </div>

            {/* Slogan */}
            <div className="bg-black/50 p-6 mb-8">
              <p className="[font-family:var(--font-heading)] text-xl sm:text-2xl md:text-3xl text-white leading-relaxed text-justify tracking-wide">
                ПРИОБРЕТАЙТЕ НОВЫЙ АВТОМОБИЛЬ ПО СПЕЦИАЛЬНОЙ ЦЕНЕ И ПОДДЕРЖИВАЙТЕ НАШИХ БОЙЦОВ И ИХ
                СЕМЬИ.
              </p>
              <br />
              <p className="[font-family:var(--font-heading)] text-xl sm:text-2xl md:text-3xl text-white leading-relaxed text-justify tracking-wide">
                ВЫБИРАЯ ДИЛЕРА ЧЕРЕЗ НАШ СЕРВИС, ВЫ ПОЛУЧАЕТЕ СПЕЦИАЛЬНОЕ ПРЕДЛОЖЕНИЕ И НАПРАВЛЯЕТЕ
                ЧАСТЬ СРЕДСТВ НА ПОДДЕРЖКУ УЧАСТНИКОВ И ВЕТЕРАНОВ СВО И ИХ СЕМЕЙ.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mb-6">
              <Button
                asChild
                size="lg"
                className="h-16 sm:h-20 bg-sky-500 hover:bg-sky-600 px-6 sm:px-10 text-xl sm:text-2xl font-semibold"
              >
                <a href={tgBotUrl} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/telegram-logo.svg" alt="" className="h-8 w-8 sm:h-10 sm:w-10" />
                  <span>Разместить заявку в Telegram</span>
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                className="h-16 sm:h-20 bg-blue-600 hover:bg-blue-700 px-6 sm:px-10 text-xl sm:text-2xl font-semibold"
              >
                <a href={maxBotUrl} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/max-logo.svg" alt="" className="h-8 w-8 sm:h-10 sm:w-10" />
                  <span>Разместить заявку в Max</span>
                </a>
              </Button>
            </div>

            {/* Free Service Note */}
            <div className="bg-black/50 p-4 inline-block">
              <p className="[font-family:var(--font-heading)] text-xl sm:text-2xl md:text-3xl text-white tracking-wide">
                СЕРВИС ПРЕДОСТАВЛЯЕТСЯ БЕСПЛАТНО
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
