'use client';

import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AnimatedList } from '@/components/animated-list';
import { CountdownTimer } from '@/components/countdown-timer';
import { PageTransition } from '@/components/page-transition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopBar } from '@/components/ui/top-bar';
import { usePolling } from '@/hooks/use-polling';
import { getWebApp } from '@/app/app/webapp-ready';
import { formatPrice, formatRelativeTime } from '@/lib/inquiry-utils';

type DealerOfferGroup = {
  dealerId: string;
  dealerName: string;
  hasTransaction: boolean;
  offers: {
    id: string;
    price: number;
    comment: string | null;
    createdAt: Date;
    isAccepted: boolean;
    transactionId: string | null;
  }[];
};

type InquiryDetail = {
  id: string;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  status: string | null;
  comment: string | null;
  createdAt: Date;
  expiresAt: Date;
  offersByDealer: DealerOfferGroup[];
  acceptanceLimits: {
    used: number;
    max: number;
    remaining: number;
  };
  _count: {
    offers: number;
    transactions: number;
  };
};

async function getInquiryDetail(
  inquiryId: string,
  platformUserId: string
): Promise<InquiryDetail | null> {
  try {
    const res = await fetch(`/api/inquiries/${inquiryId}?platformUserId=${platformUserId}`);
    if (!res.ok) return null;
    return (await res.json()) as InquiryDetail;
  } catch {
    return null;
  }
}

export default function InquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [platformUserId, setPlatformUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const inquiryId = params.inquiryId as string;

  // Initialize platform user
  useEffect(() => {
    const webApp = getWebApp();
    const userId = webApp?.initDataUnsafe?.user?.id?.toString() || null;

    if (!userId) {
      router.replace('/app');
      return;
    }

    setPlatformUserId(userId);
    setReady(true);
  }, [router]);

  // Fetch inquiry with polling
  const fetcher = useCallback(async (): Promise<InquiryDetail | null> => {
    if (!platformUserId) return null;
    const data = await getInquiryDetail(inquiryId, platformUserId);
    if (!data) {
      router.replace('/app/dashboard');
      return null;
    }
    return data;
  }, [inquiryId, platformUserId, router]);

  const { data: inquiry, loading } = usePolling<InquiryDetail | null>({
    fetcher,
    interval: 10000,
    enabled: ready && !!platformUserId,
  });

  if (!ready || loading || !inquiry) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  const isExpired = new Date(inquiry.expiresAt) < new Date();
  const { acceptanceLimits, offersByDealer } = inquiry;
  const canAcceptMore = acceptanceLimits.remaining > 0 && !isExpired;

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

          {/* Acceptance limits banner */}
          <div className="mt-4 flex items-center justify-between rounded-lg border bg-zinc-50 px-4 py-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Принятых предложений: </span>
              <span className="font-medium">
                {acceptanceLimits.used} из {acceptanceLimits.max}
              </span>
            </div>
            {acceptanceLimits.remaining > 0 ? (
              <Badge variant="outline" className="text-xs">
                Осталось: {acceptanceLimits.remaining}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Лимит исчерпан
              </Badge>
            )}
          </div>

          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold">
              Предложения дилеров ({inquiry._count.offers})
            </h2>

            {offersByDealer.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border bg-muted/30 p-6 text-center text-sm">
                Пока нет предложений. Вы получите уведомление, когда дилеры ответят.
              </div>
            ) : (
              <AnimatedList
                items={offersByDealer}
                keyExtractor={(group) => group.dealerId}
                renderItem={(dealerGroup) => (
                  <DealerOfferCard
                    dealerGroup={dealerGroup}
                    inquiryId={inquiry.id}
                    canAcceptMore={canAcceptMore}
                  />
                )}
              />
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

function DealerOfferCard({
  dealerGroup,
  inquiryId,
  canAcceptMore,
}: {
  dealerGroup: DealerOfferGroup;
  inquiryId: string;
  canAcceptMore: boolean;
}) {
  return (
    <Card className={dealerGroup.hasTransaction ? 'border-green-200 bg-green-50/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{dealerGroup.dealerName}</CardTitle>
          {dealerGroup.hasTransaction && (
            <Badge className="bg-green-600">
              <Check className="mr-1 size-3" />
              Принято
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {dealerGroup.offers.map((offer, index) => {
          const isLatest = index === 0;
          const canAccept = canAcceptMore && !dealerGroup.hasTransaction && isLatest;

          return (
            <div
              key={offer.id}
              className={`rounded-lg border p-3 ${
                offer.isAccepted
                  ? 'border-green-300 bg-green-100'
                  : isLatest
                    ? 'border-blue-200 bg-white'
                    : 'border-gray-200 bg-gray-50 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatPrice(offer.price)}</span>
                  {isLatest && !offer.isAccepted && (
                    <Badge variant="outline" className="text-xs">
                      Актуальное
                    </Badge>
                  )}
                  {offer.isAccepted && (
                    <Badge className="bg-green-600 text-xs">
                      <Check className="mr-1 size-3" />
                      Вы приняли
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatRelativeTime(new Date(offer.createdAt))}
                </span>
              </div>
              {offer.comment && (
                <p className="text-muted-foreground mt-1 text-sm">{offer.comment}</p>
              )}
              {canAccept && (
                <div className="mt-3">
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/app/inquiry/${inquiryId}/offer/${offer.id}`}>
                      Принять предложение
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
