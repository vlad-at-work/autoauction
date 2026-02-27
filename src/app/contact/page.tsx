import Link from 'next/link';
import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';

export default function ContactPage() {
  const maxBotUrl = getMaxBotUrl('inquiry');
  const tgBotUrl = getTelegramBotUrl('inquiry');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <section className="relative">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/header.jpg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
          <div className="absolute inset-0 backdrop-blur-sm" />
        </div>

        {/* Logo — absolute, top-left */}
        <div className="absolute z-20 top-2 left-4 md:top-3 md:left-8">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo3.png"
              alt="Свои Авто"
              className="h-12 sm:h-16 md:h-24 lg:h-28 w-auto object-contain drop-shadow-lg"
            />
          </Link>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
          <div className="flex flex-col items-center pt-4 pb-6 md:pt-6 md:pb-8 gap-2">
            {/* Partners */}
            <div className="flex flex-col items-center">
              <p
                className="text-xs md:text-sm font-raleway font-semibold text-white/60 mb-1 md:mb-1.5 tracking-wide uppercase"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
              >
                При поддержке
              </p>
              <div className="flex items-center gap-3 md:gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sponsor1.jpeg"
                  alt="Совет ветеранов СВО ФПСР"
                  className="h-16 md:h-20 lg:h-24 w-auto object-contain drop-shadow-lg rounded-[25%] opacity-90"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sponsor2.png"
                  alt="Ассоциация ветеранов СВО г.о. Дубна"
                  className="h-16 md:h-20 lg:h-24 w-auto object-contain drop-shadow-lg rounded-[25%] opacity-90"
                />
              </div>
            </div>

            <div className="max-w-2xl">
              <h1
                className="font-russo text-white/95 leading-[1.0] text-center"
                style={{
                  fontSize: 'clamp(1.75rem, 4vw, 3.25rem)',
                  textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                Специальный сервис для поддержки ветеранов СВО и их семей
              </h1>
              <div className="flex gap-2 sm:gap-3 mt-5 md:mt-8">
                <a
                  href={tgBotUrl}
                  className="flex-1 flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 md:h-16 text-white font-semibold text-base sm:text-lg md:text-xl rounded-md transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(to right, rgb(39, 161, 227), rgb(41, 164, 230))',
                    boxShadow:
                      '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  <span>Заявку в</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/telegram-logo.svg"
                    alt=""
                    className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                  />
                </a>
                <a
                  href={maxBotUrl}
                  className="flex-1 flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 md:h-16 text-white font-semibold text-base sm:text-lg md:text-xl rounded-md transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(to right, rgb(48, 92, 252), rgb(149, 75, 219))',
                    boxShadow:
                      '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  <span>Заявку в</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/max-logo.svg"
                    alt=""
                    className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                  />
                </a>
              </div>
              <p className="mt-3 text-center text-sm sm:text-base font-raleway font-normal text-white/50">
                Сервис предоставляется бесплатно
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Связь */}
      <section className="flex-1 bg-stone-50 py-6 md:py-10">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <h2 className="font-russo text-stone-800 text-2xl md:text-4xl text-center mb-5 md:mb-8">
            Связь
          </h2>
          <div className="space-y-4 md:space-y-6">
            <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed">
              По вопросам сотрудничества и другим вопросам пишите на почту или в группу ВК:
            </p>
            <p className="font-raleway font-medium text-base md:text-lg leading-relaxed">
              <a
                href="mailto:gleb@ub.am"
                className="text-blue-600 hover:text-blue-700 underline transition-colors"
              >
                gleb@ub.am
              </a>
            </p>
            <p className="font-raleway font-medium text-base md:text-lg leading-relaxed">
              <a
                href="https://vk.com/svoauto"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline transition-colors"
              >
                Подписывайтесь на нас в VK
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-800 py-5 md:py-8">
        <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-raleway text-stone-400 text-sm">Все права защищены 🇷🇺</p>
          <div className="flex gap-6">
            <a
              href="/about"
              className="font-raleway text-stone-400 text-sm hover:text-stone-300 transition-colors"
            >
              О проекте
            </a>
            <a
              href="/contact"
              className="font-raleway text-stone-400 text-sm hover:text-stone-300 transition-colors"
            >
              Связаться
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
