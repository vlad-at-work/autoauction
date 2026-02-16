import Image from 'next/image';
import { Shield, Heart, Car, Clock, Phone } from 'lucide-react';

import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';
import { Button } from '@/components/ui/button';

export default function Home() {
  const maxBotUrl = getMaxBotUrl('inquiry');
  const tgBotUrl = getTelegramBotUrl('inquiry');

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-small.png"
                alt="Свои авто"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900">Свои авто</span>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <a href={maxBotUrl} className="flex items-center gap-2">
                  <span className="hidden sm:inline">Max</span>
                </a>
              </Button>
              <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-600">
                <a href={tgBotUrl} className="flex items-center gap-2">
                  <span className="hidden sm:inline">Telegram</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-[500px] w-full overflow-hidden">
          <Image
            src="/header.jpg"
            alt="Поддержка участников СВО"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-2xl text-center">
              <h1 className="mb-6 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                Вы стояли за нас.
                <br />
                <span className="text-blue-300">Теперь мы рядом с вами.</span>
              </h1>
              <p className="mb-8 text-xl text-gray-200">
                Участникам СВО, ветеранам и семьям — с благодарностью от всего народа
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="h-14 bg-blue-600 hover:bg-blue-700 px-8 text-lg font-semibold"
                >
                  <a href={maxBotUrl}>Получить помощь в Max</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="h-14 bg-sky-500 hover:bg-sky-600 px-8 text-lg font-semibold"
                >
                  <a href={tgBotUrl}>Получить помощь в Telegram</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* We Remember Section */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2">
            <Heart className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Мы помним</span>
          </div>
          <h2 className="mb-6 text-3xl font-bold text-gray-900">Страна благодарна каждому</h2>
          <p className="text-lg leading-relaxed text-gray-700">
            Вы прошли через испытания, о которых многие не знают. Вы защитили нас — и эту защиту
            нельзя измерить. Но мы можем сказать спасибо. Маленьким. Честным. От всей страны.
          </p>
        </div>
      </section>

      {/* What This Is Section */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Официальная поддержка</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Дилеры России хотят сказать спасибо
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Официальные дилеры LADA готовы предложить участникам СВО и их семьям особые условия.
              Без бюрократии. Без очередей. Просто человек, который хочет помочь человеку.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Car className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">Специальные цены</h3>
              <p className="text-sm text-gray-600">
                Дилеры сами предлагают лучшие условия для участников СВО и ветеранов
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">24 часа</h3>
              <p className="text-sm text-gray-600">
                Получите предложения от нескольких дилеров в течение суток
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Phone className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">Прямой контакт</h3>
              <p className="text-sm text-gray-600">
                Выберите подходящее предложение и свяжитесь с дилером напрямую
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Free Service Notice */}
      <section className="py-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-6 py-3 text-green-800">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Сервис предоставляется бесплатно</span>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">Мы рядом. Всегда.</h2>
          <p className="mb-8 text-lg text-gray-400">
            Выберите удобный способ связи — и мы поможем вам получить заслуженную поддержку
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 bg-blue-600 hover:bg-blue-700 px-8 text-lg font-semibold"
            >
              <a href={maxBotUrl}>Написать в Max</a>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-14 bg-sky-500 hover:bg-sky-600 px-8 text-lg font-semibold"
            >
              <a href={tgBotUrl}>Написать в Telegram</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-900">Свои авто</p>
        <p className="mt-1">Специальный сервис для поддержки участников СВО и их семей</p>
        <p className="mt-4">© 2025. С благодарностью.</p>
      </footer>
    </div>
  );
}
