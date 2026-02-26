export default function Home() {
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

        {/* Hero content — constrained to page bounds */}
        <div className="relative z-10 h-full max-w-6xl mx-auto px-6 md:px-12 flex flex-col">
          {/* Logo — top left */}
          <div className="pt-3 md:pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo1.png"
              alt="Свои Авто"
              className="h-20 sm:h-24 w-auto object-contain drop-shadow-lg"
            />
          </div>

          {/* Main row: heading left, partners right — vertically centered in remaining space */}
          <div className="flex-1 flex items-center justify-between gap-8">
            {/* Heading */}
            <h1 className="max-w-xl text-2xl sm:text-3xl md:text-4xl font-russo text-white leading-tight">
              Специальный сервис для поддержки участников СВО и их семей
            </h1>

            {/* Partners — horizontal row, vertically centered with heading */}
            <div className="hidden md:flex items-center gap-5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sponsor1.png"
                alt="Совет ветеранов СВО ФПСР"
                className="h-24 lg:h-32 w-auto object-contain drop-shadow-lg"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sponsor2.png"
                alt="Ассоциация ветеранов СВО г.о. Дубна"
                className="h-24 lg:h-32 w-auto object-contain drop-shadow-lg"
              />
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
        <img src="/sponsor1.png" alt="Совет ветеранов СВО ФПСР" className="h-16 w-auto object-contain" />
        <img src="/sponsor2.png" alt="Ассоциация ветеранов СВО г.о. Дубна" className="h-16 w-auto object-contain" />
      </div>
      */}
    </div>
  );
}
