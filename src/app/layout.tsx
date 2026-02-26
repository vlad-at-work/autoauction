import type { Metadata } from 'next';
import Script from 'next/script';
import { Raleway, Russo_One } from 'next/font/google';
import { Toaster } from 'sonner';

import './globals.css';
import { GlobalLoading } from '@/components/global-loading';

const raleway = Raleway({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-raleway',
  display: 'swap',
});

const russoOne = Russo_One({
  weight: '400',
  subsets: ['latin', 'cyrillic'],
  variable: '--font-russo',
  display: 'swap',
});

const siteUrl = (() => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!envUrl) return 'http://localhost:3000';
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) return envUrl;
  return `https://${envUrl}`;
})();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AutoAuction',
    template: '%s | AutoAuction',
  },
  description:
    'AutoAuction — платформа для быстрого запроса и получения конкурентных предложений от автодилеров.',
  applicationName: 'AutoAuction',
  referrer: 'origin-when-cross-origin',
  keywords: ['AutoAuction', 'авто', 'покупка автомобиля', 'предложения дилеров', 'аукцион', 'Lada'],
  authors: [{ name: 'AutoAuction' }],
  creator: 'AutoAuction',
  publisher: 'AutoAuction',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: '/',
    siteName: 'AutoAuction',
    title: 'AutoAuction',
    description: 'Запросите авто и получите несколько предложений от дилеров — быстро и прозрачно.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoAuction',
    description: 'Запросите авто и получите несколько предложений от дилеров — быстро и прозрачно.',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${raleway.variable} ${russoOne.variable} font-raleway antialiased`}>
        <GlobalLoading />
        {children}
        <Toaster />
        {/* Yandex.Metrika counter */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=107011948', 'ym');

            ym(107011948, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/107011948"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
        {/* /Yandex.Metrika counter */}
      </body>
    </html>
  );
}
