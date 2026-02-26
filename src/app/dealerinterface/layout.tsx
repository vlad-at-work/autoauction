import Script from 'next/script';

import { WebAppReady } from '@/app/app/webapp-ready';

export default function DealerInterfaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* MAX WebApp SDK */}
      <Script src="https://st.max.ru/js/max-web-app.js" strategy="beforeInteractive" />
      {/* Telegram WebApp SDK */}
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <WebAppReady />
      <div className="min-h-screen flex flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo3.png" alt="" className="h-10 w-auto object-contain" />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
