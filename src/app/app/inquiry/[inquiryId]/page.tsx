'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CountdownTimer } from '@/components/countdown-timer';
import { OfferCard } from '@/components/offer-card';
import { PageTransition } from '@/components/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopBar } from '@/components/ui/top-bar';
import { useDebugMode } from '@/contexts/DebugModeContext';
import { getInquiryById } from '@/lib/api/inquiries';
import type { MockInquiry } from '@/lib/debug/mock-data';

export default function InquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { debugMode } = useDebugMode();
  const [inquiry, setInquiry] = useState<MockInquiry | null>(null);
  const [loading, setLoading] = useState(true);

  const inquiryId = params.inquiryId as string;

  useEffect(() => {
    let cancelled = false;

    const loadInquiry = async () => {
      // Get user ID
      let platformUserId: string | null = null;

      if (debugMode.enabled && debugMode.mockUserId) {
        platformUserId = debugMode.mockUserId;
      } else {
        const webApp = window.WebApp;
        platformUserId = webApp?.initDataUnsafe?.user?.id?.toString() || null;

        if (!platformUserId) {
          router.replace('/app');
          return;
        }
      }

      const data = await getInquiryById(inquiryId, platformUserId, debugMode);

      if (cancelled) return;

      if (!data) {
        router.replace('/app/dashboard');
        return;
      }

      setInquiry(data);
      setLoading(false);
    };

    loadInquiry();

    return () => {
      cancelled = true;
    };
  }, [inquiryId, debugMode, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (!inquiry) {
    return null;
  }

  const isExpired = new Date(inquiry.expiresAt) < new Date();
  const offers = inquiry.offers || [];
  const sortedOffers = [...offers].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <PageTransition>
      <div className="min-h-screen w-full">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {inquiry.model} {inquiry.submodel !== inquiry.model && inquiry.submodel}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Коробка:</span>
                  <span className="font-medium">{inquiry.transmission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Цвет:</span>
                  <span className="font-medium">{inquiry.color}</span>
                </div>
                {inquiry.status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Статус:</span>
                    <span className="font-medium">{inquiry.status}</span>
                  </div>
                )}
                {inquiry.comment && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Комментарий:</span>
                    <span className="font-medium">{inquiry.comment}</span>
                  </div>
                )}
                <div className="border-border mt-2 border-t pt-2">
                  <CountdownTimer expiresAt={inquiry.expiresAt} isExpired={isExpired} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold">Предложения дилеров ({offers.length})</h2>
            {sortedOffers.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border bg-muted/30 p-6 text-center text-sm">
                Пока нет предложений. Вы получите уведомление, когда дилеры ответят.
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} inquiryId={inquiry.id} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button asChild variant="outline" className="w-full">
              <Link href="/app/dashboard">
                <ArrowLeft className="mr-2 size-4" />
                Назад к заявкам
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
