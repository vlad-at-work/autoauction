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
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-screen w-full overflow-hidden">
          <Image
            src="/header.jpg"
            alt="Поддержка участников СВО"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-16">
            <div className="max-w-3xl text-center">
              {/* Logo and Service Description */}
              <h1 className="text-4xl font-bold text-white mb-2 sm:text-5xl">Свои авто</h1>
              <p className="text-base text-gray-200 mb-8 sm:text-lg">
                Специальный сервис для поддержки участников СВО и их семей.
              </p>

              {/* Slogan with 50% black background */}
              <div className="bg-black/50 p-6 rounded-lg mb-8">
                <p className="text-lg text-white sm:text-xl leading-relaxed">
                  Приобретайте новый автомобиль по специальной цене и поддерживайте наших бойцов и
                  их семьи. Выбирая дилера через наш сервис Вы получаете специальное предложение и
                  направляете часть средств на поддержку участников и ветеранов СВО и их семей.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="h-14 bg-sky-500 hover:bg-sky-600 px-8 text-lg font-semibold"
                >
                  <a href={tgBotUrl} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/telegram-logo.svg" alt="" className="h-6 w-6" />
                    <span>Разместить заявку в Telegram</span>
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="h-14 bg-blue-600 hover:bg-blue-700 px-8 text-lg font-semibold"
                >
                  <a href={maxBotUrl} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/max-logo.svg" alt="" className="h-6 w-6" />
                    <span>Разместить заявку в Max</span>
                  </a>
                </Button>
              </div>

              {/* Free Service Note */}
              <p className="mt-6 text-sm text-gray-300">Сервис предоставляется бесплатно</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
