import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';

const fontSans = Figtree({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="ru" className={fontSans.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
