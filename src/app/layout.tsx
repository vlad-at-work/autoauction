import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'AutoAuction - Лучшие предложения от дилеров Lada',
  description: 'Получите конкурентные предложения от дилеров Lada за 24 часа',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${figtree.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
