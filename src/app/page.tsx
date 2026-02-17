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
        {/* Logo - touching ceiling, no nav */}
        <div className="flex justify-center pt-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo1.png" alt="" className="h-48 w-auto object-contain drop-shadow-lg" />
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

            <div className="bg-black/50 p-4 rounded-lg mb-6 inline-block">
              <p className="text-2xl text-gray-200 sm:text-3xl md:text-4xl">
                Специальный сервис для поддержки участников СВО и их семей.
              </p>
            </div>

            {/* Slogan */}
            <div className="bg-black/50 p-6 rounded-lg mb-8">
              <p className="text-2xl text-white sm:text-3xl md:text-4xl leading-relaxed text-justify">
                Приобретайте новый автомобиль по специальной цене и поддерживайте наших бойцов и их
                семьи.
              </p>
              <br />
              <p className="text-2xl text-white sm:text-3xl md:text-4xl leading-relaxed text-justify">
                Выбирая дилера через наш сервис, Вы получаете специальное предложение и направляете
                часть средств на поддержку участников и ветеранов СВО и их семей.
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
            <div className="bg-black/50 p-4 rounded-lg inline-block">
              <p className="text-xl sm:text-2xl md:text-3xl text-white font-semibold">
                Сервис предоставляется бесплатно
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
