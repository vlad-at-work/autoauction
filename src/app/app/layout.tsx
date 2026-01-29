import Script from 'next/script';

import { WebAppReady } from '@/app/app/webapp-ready';

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* MAX WebApp SDK */}
      <Script src="https://st.max.ru/js/max-web-app.js" strategy="beforeInteractive" />
      {/* Telegram WebApp SDK */}
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <WebAppReady />
      {children}
    </>
  );
}
