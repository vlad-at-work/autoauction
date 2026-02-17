import Image from 'next/image';

import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';
import { Button } from '@/components/ui/button';

export default function Home() {
  const maxBotUrl = getMaxBotUrl('inquiry');
  const tgBotUrl = getTelegramBotUrl('inquiry');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo1.png" alt="" className="h-12 w-auto object-contain" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="relative min-h-screen w-full overflow-hidden">
          <Image
            src="/header.jpg"
            alt="Поддержка участников СВО"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-20">
            <div className="max-w-4xl w-full text-center">
              {/* Logo and Service Description */}
              <div className="bg-black/50 p-4 rounded-lg mb-4 inline-block">
                <h1 className="text-5xl font-bold text-white mb-2 sm:text-6xl md:text-7xl">
                  Свои Авто
                </h1>
              </div>

              <div className="bg-black/50 p-4 rounded-lg mb-6 inline-block">
                <p className="text-xl text-gray-200 sm:text-2xl md:text-3xl">
                  Специальный сервис для поддержки участников СВО и их семей.
                </p>
              </div>

              {/* Slogan */}
              <div className="bg-black/50 p-6 rounded-lg mb-8">
                <p className="text-2xl text-white sm:text-3xl md:text-4xl leading-relaxed">
                  Приобретайте новый автомобиль по специальной цене и поддерживайте наших бойцов и
                  их семьи.
                </p>
                <br />
                <p className="text-2xl text-white sm:text-3xl md:text-4xl leading-relaxed">
                  Выбирая дилера через наш сервис, Вы получаете специальное предложение и
                  направляете часть средств на поддержку участников и ветеранов СВО и их семей.
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
                    <img
                      src="/icons/telegram-logo.svg"
                      alt=""
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    />
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
      </section>
    </div>
  );
}
