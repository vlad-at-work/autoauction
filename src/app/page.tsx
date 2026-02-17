import Image from 'next/image';

import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';
import { Button } from '@/components/ui/button';

export default function Home() {
  const maxBotUrl = getMaxBotUrl('inquiry');
  const tgBotUrl = getTelegramBotUrl('inquiry');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-[600px] w-full overflow-hidden">
          <Image
            src="/header.jpg"
            alt="Поддержка участников СВО"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-2xl text-center">
              {/* Logo and Service Description */}
              <h1 className="text-3xl font-bold text-white mb-2">Свои авто</h1>
              <p className="text-sm text-gray-200 mb-6">
                Специальный сервис для поддержки участников СВО и их семей.
              </p>

              {/* Slogan */}
              <p className="text-lg text-gray-100 mb-8">
                Приобретайте новый автомобиль по специальной цене и поддерживайте наших бойцов и их
                семьи. Выбирая дилера через наш сервис Вы получаете специальное предложение и
                направляете часть средств на поддержку участников и ветеранов СВО и их семей.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="h-14 bg-sky-500 hover:bg-sky-600 px-8 text-lg font-semibold"
                >
                  <a href={tgBotUrl}>Разместить заявку в Telegram</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="h-14 bg-blue-600 hover:bg-blue-700 px-8 text-lg font-semibold"
                >
                  <a href={maxBotUrl}>Разместить заявку в Max</a>
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
