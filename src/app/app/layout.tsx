import Script from 'next/script';

import { MaxWebAppReady } from '@/app/app/max-webapp-ready';

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://st.max.ru/js/max-web-app.js" strategy="beforeInteractive" />
      <MaxWebAppReady />
      {children}
    </>
  );
}
