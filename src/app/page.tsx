import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';

export default function Home() {
  const maxBotUrl = getMaxBotUrl('inquiry');
  const tgBotUrl = getTelegramBotUrl('inquiry');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative h-auto md:h-[50vh] md:min-h-[400px]">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/header.jpg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          {/* Top shadow — stronger */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
          <div className="absolute inset-0 backdrop-blur-sm" />
        </div>

        {/* Logo — absolute, top-left, outside container flow */}
        <div className="absolute z-20 top-2 left-4 md:top-3 md:left-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo3.png"
            alt="Свои Авто"
            className="h-12 sm:h-16 md:h-24 lg:h-28 w-auto object-contain drop-shadow-lg"
          />
        </div>

        {/* Hero content — constrained to page bounds */}
        <div className="relative z-10 h-full max-w-6xl mx-auto px-6 md:px-12 flex flex-col">
          {/* Heading + CTA — centered */}
          <div className="flex-1 flex flex-col items-center justify-center pt-4 pb-6 gap-2 md:pt-3 md:pb-0">
            {/* Partners — "presenting" block */}
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
                  className="h-16 md:h-24 w-auto object-contain drop-shadow-lg rounded-[25%] opacity-90"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sponsor2.png"
                  alt="Ассоциация ветеранов СВО г.о. Дубна"
                  className="h-16 md:h-24 w-auto object-contain drop-shadow-lg rounded-[25%] opacity-90"
                />
              </div>
            </div>

            <div className="max-w-2xl">
              <h1
                className="font-russo text-white/95 leading-[1.0] text-center"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                  textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                Специальный сервис для поддержки участников СВО и их семей
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

      {/* Slogan */}
      <section className="bg-stone-50 py-4 md:py-8">
        <div className="mx-auto px-4 md:px-16 lg:px-24">
          <h2
            className="font-russo text-stone-800 leading-tight text-center"
            style={{ fontSize: 'clamp(1.25rem, 4vw, 2.5rem)' }}
          >
            Приобретайте новый автомобиль ЛАДА по справедливой цене и поддерживайте ветеранов СВО и
            их семьи
          </h2>
        </div>
      </section>

      {/* Как это работает */}
      <section className="bg-white py-4 md:py-8">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <h3 className="font-russo text-stone-700 text-2xl md:text-4xl text-center mb-4 md:mb-6">
            Как это работает
          </h3>
          <div className="space-y-5 md:space-y-8 max-w-2xl mx-auto">
            <div className="flex gap-5 items-start">
              <span className="shrink-0 w-10 h-10 rounded-full bg-stone-700 text-white font-russo text-lg flex items-center justify-center">
                1
              </span>
              <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed pt-1.5">
                Анонимно размещаете заявку на автомобиль через Telegram или Max.
              </p>
            </div>
            <div className="flex gap-5 items-start">
              <span className="shrink-0 w-10 h-10 rounded-full bg-stone-700 text-white font-russo text-lg flex items-center justify-center">
                2
              </span>
              <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed pt-1.5">
                Мы торгуемся за Вас и собираем предложения от дилеров по Московской области.
              </p>
            </div>
            <div className="flex gap-5 items-start">
              <span className="shrink-0 w-10 h-10 rounded-full bg-stone-700 text-white font-russo text-lg flex items-center justify-center">
                3
              </span>
              <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed pt-1.5">
                Выбираете предложение и решаете покупать автомобиль или нет.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Миссия */}
      <section className="relative bg-stone-50 py-4 md:py-8 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/soldier3.png"
          alt=""
          className="absolute bottom-0 w-auto object-contain object-right-bottom opacity-40 pointer-events-none right-[-25%] md:right-[-5%]"
          style={{ height: '105%' }}
        />
        <div className="relative max-w-3xl mx-auto px-6 md:px-12">
          <h3 className="font-russo text-stone-700 text-2xl md:text-4xl text-center mb-3 md:mb-4">
            Миссия
          </h3>
          <p className="font-raleway font-medium text-stone-600 text-base md:text-lg leading-relaxed text-center border-l-0 md:border-l-4 border-stone-400 pl-0 md:pl-6 ml-0 md:ml-4">
            Выбирая дилера через наш сервис Вы получаете специальную цену и другие предложения при
            покупке автомобиля, а дилеры направляют часть комиссии на реабилитацию ветеранов СВО и
            поддержку их семей.
          </p>
        </div>
      </section>

      {/* Что это даёт */}
      <section className="bg-white py-4 md:py-8">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <h3 className="font-russo text-stone-700 text-2xl md:text-4xl text-center mb-3 md:mb-5">
            Что это даёт?
          </h3>
          <ul className="space-y-3 md:space-y-5 max-w-2xl mx-auto">
            <li className="flex gap-4 items-start">
              <span className="shrink-0 text-stone-500 mt-0.5">&#x2714;</span>
              <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed">
                Вы экономите деньги на покупке.
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="shrink-0 text-stone-500 mt-0.5">&#x2714;</span>
              <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed">
                Вы экономите время на поиске лучшего предложения. Мы будем для вас хорошим
                помощником, независимо от того, любите вы торговаться сами или нет.
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="shrink-0 text-stone-500 mt-0.5">&#x2714;</span>
              <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed">
                Вы защищены от спама. Ваши личные данные, например, номер мобильного, передаются
                магазинам, только если предложение Вам понравилось.
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="shrink-0 text-stone-500 mt-0.5">&#x2714;</span>
              <p className="font-raleway font-medium text-stone-700 text-base md:text-lg leading-relaxed">
                Вы снижаете риск стать жертвой мошенников.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-stone-50 py-4 md:py-8">
        <div className="max-w-xl mx-auto px-6 md:px-12">
          <h3 className="font-russo text-stone-700 text-2xl md:text-4xl text-center mb-3 md:mb-4">
            Оставить заявку
          </h3>
          <div className="flex gap-3">
            <a
              href={tgBotUrl}
              className="flex-1 flex items-center justify-center gap-3 h-16 text-white font-semibold text-lg sm:text-xl rounded-md transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(to right, rgb(39, 161, 227), rgb(41, 164, 230))',
                boxShadow:
                  '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
              }}
            >
              <span>Telegram</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/telegram-logo.svg"
                alt=""
                className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
              />
            </a>
            <a
              href={maxBotUrl}
              className="flex-1 flex items-center justify-center gap-3 h-16 text-white font-semibold text-lg sm:text-xl rounded-md transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(to right, rgb(48, 92, 252), rgb(149, 75, 219))',
                boxShadow:
                  '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
              }}
            >
              <span>Max</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/max-logo.svg"
                alt=""
                className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
              />
            </a>
          </div>
          <p className="mt-3 text-center text-sm sm:text-base font-raleway font-normal text-stone-400">
            Сервис предоставляется бесплатно
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-800 py-5 md:py-8">
        <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-raleway text-stone-400 text-sm">Все права защищены 🇷🇺</p>
          <div className="flex gap-6">
            <a
              href="#"
              className="font-raleway text-stone-400 text-sm hover:text-stone-300 transition-colors"
            >
              О проекте
            </a>
            <a
              href="#"
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
