import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import './globals.css';
import { GlobalLoading } from '@/components/global-loading';

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
      <body className="antialiased">
        <GlobalLoading />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
