import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';

export default function Home() {
  const maxBotUrl = getMaxBotUrl('inquiry');
  const tgBotUrl = getTelegramBotUrl('inquiry');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero — ~50vh, contains background + logo + heading */}
      <section className="relative h-[50vh] min-h-[400px]">
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
            src="/logo1.png"
            alt="Свои Авто"
            className="h-24 sm:h-28 w-auto object-contain drop-shadow-lg"
          />
        </div>

        {/* Hero content — constrained to page bounds */}
        <div className="relative z-10 h-full max-w-6xl mx-auto px-6 md:px-12 flex flex-col">
          {/* Main row: heading left, partners right — vertically centered */}
          <div className="flex-1 flex items-center justify-between gap-8">
            {/* Heading + CTA buttons */}
            <div className="max-w-2xl">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-russo text-white leading-tight"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                Специальный сервис для поддержки участников СВО и их семей
              </h1>
              <div className="flex gap-3 mt-4">
                <a
                  href={tgBotUrl}
                  className="flex-1 flex items-center justify-center gap-2 h-14 text-white font-semibold text-base sm:text-lg rounded-md transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(to right, rgb(39, 161, 227), rgb(41, 164, 230))',
                    boxShadow:
                      '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/telegram-logo.svg" alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Заявка в Telegram</span>
                </a>
                <a
                  href={maxBotUrl}
                  className="flex-1 flex items-center justify-center gap-2 h-14 text-white font-semibold text-base sm:text-lg rounded-md transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(to right, rgb(48, 92, 252), rgb(149, 75, 219))',
                    boxShadow:
                      '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/max-logo.svg" alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Заявка в Max</span>
                </a>
              </div>
            </div>

            {/* Partners — with label */}
            <div className="hidden md:flex flex-col items-center shrink-0">
              <p
                className="text-lg lg:text-xl font-raleway font-normal text-white/80 mb-3 tracking-wide"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
              >
                При поддержке
              </p>
              <div className="flex items-center gap-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sponsor1.jpeg"
                  alt="Совет ветеранов СВО ФПСР"
                  className="h-24 lg:h-32 w-auto object-contain drop-shadow-lg rounded-[25%] opacity-90"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sponsor2.png"
                  alt="Ассоциация ветеранов СВО г.о. Дубна"
                  className="h-24 lg:h-32 w-auto object-contain drop-shadow-lg rounded-[25%] opacity-90"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Below the fold — white workspace (content coming later) */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 py-16">
        {/* Future content goes here */}
      </section>

      {/* ---- Everything below is commented out for now ---- */}

      {/* Subtext
      <p className="mt-6 text-lg sm:text-xl md:text-2xl text-gray-700 leading-relaxed max-w-lg">
        Приобретайте новый автомобиль по специальной цене и поддерживайте наших бойцов и их семьи.
      </p>
      */}

      {/* CTA buttons
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="h-14 bg-sky-500 hover:bg-sky-600 px-8 text-lg font-semibold">
          <a href={tgBotUrl} className="flex items-center gap-3">
            <img src="/icons/telegram-logo.svg" alt="" className="h-7 w-7" />
            <span>Заявка в Telegram</span>
          </a>
        </Button>
        <Button asChild size="lg" className="h-14 bg-blue-600 hover:bg-blue-700 px-8 text-lg font-semibold">
          <a href={maxBotUrl} className="flex items-center gap-3">
            <img src="/icons/max-logo.svg" alt="" className="h-7 w-7" />
            <span>Заявка в Max</span>
          </a>
        </Button>
      </div>
      */}

      {/* Free service note
      <p className="mt-4 text-base text-white/70">
        Сервис предоставляется бесплатно
      </p>
      */}

      {/* Sponsor logos
      <div className="flex gap-3">
        <img src="/sponsor1.jpeg" alt="Совет ветеранов СВО ФПСР" className="h-16 w-auto object-contain" />
        <img src="/sponsor2.png" alt="Ассоциация ветеранов СВО г.о. Дубна" className="h-16 w-auto object-contain" />
      </div>
      */}
    </div>
  );
}
