'use client';

import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AnimatedList } from '@/components/animated-list';
import { CountdownTimer } from '@/components/countdown-timer';
import { PageTransition } from '@/components/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopBar } from '@/components/ui/top-bar';
import { usePolling } from '@/hooks/use-polling';
import { useWebApp } from '@/hooks/use-webapp';
import { detectPlatform, getWebApp } from '@/app/app/webapp-ready';
import { formatPrice, formatRelativeTime } from '@/lib/inquiry-utils';
import { pluralize } from '@/lib/utils';
import { getInquiryLimits, type InquiryLimits } from '@/lib/api/inquiries';

type DealerOfferGroup = {
  dealerId: string;
  dealerName: string;
  hasTransaction: boolean;
  offers: {
    id: string;
    price: number;
    configuration: string | null;
    deliveryTime: string | null;
    additionalComments: string | null;
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
  platform: 'max' | 'telegram',
  initData: string
): Promise<InquiryDetail | null> {
  try {
    const res = await fetch(`/api/inquiries/${inquiryId}`, {
      headers: {
        Authorization: `Bearer ${platform}:customer:${initData}`,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as InquiryDetail;
  } catch {
    return null;
  }
}

export default function InquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showBackButton } = useWebApp();
  const [platformUserId, setPlatformUserId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'max' | 'telegram' | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const inquiryId = params.inquiryId as string;

  // BackButton navigates to dashboard
  useEffect(() => {
    showBackButton(() => router.push('/app/dashboard'));
  }, [showBackButton, router]);

  // Initialize platform user
  useEffect(() => {
    let cancelled = false;
    const webApp = getWebApp();
    const userId = webApp?.initDataUnsafe?.user?.id?.toString() || null;
    const detectedPlatform = detectPlatform();
    const detectedInitData = webApp?.initData || null;

    if (!userId || !detectedPlatform || !detectedInitData) {
      router.replace('/app');
      return;
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setPlatformUserId(userId);
      setPlatform(detectedPlatform);
      setInitData(detectedInitData);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Fetch inquiry with polling
  const fetcher = useCallback(async (): Promise<InquiryDetail | null> => {
    if (!platformUserId || !platform || !initData) return null;
    const data = await getInquiryDetail(inquiryId, platform, initData);
    if (!data) {
      router.replace('/app/dashboard');
      return null;
    }
    return data;
  }, [inquiryId, initData, platform, platformUserId, router]);

  const { data: inquiry, loading } = usePolling<InquiryDetail | null>({
    fetcher,
    interval: 10000,
    enabled: ready && !!platformUserId && !!platform && !!initData,
  });

  // Fetch inquiry limits
  const [limits, setLimits] = useState<InquiryLimits | null>(null);
  useEffect(() => {
    if (!platform || !initData) return;
    getInquiryLimits(initData, platform).then(setLimits);
  }, [initData, platform]);

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
        <TopBar disableNewInquiry={limits ? limits.remaining <= 0 : false} />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl leading-tight">
                <div>{inquiry.model}</div>
                {inquiry.submodel !== inquiry.model && (
                  <div className="text-lg text-muted-foreground">{inquiry.submodel}</div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 text-base">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Коробка:</span>
                  <span className="font-medium">{inquiry.transmission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Цвет:</span>
                  <span className="font-medium">{inquiry.color}</span>
                </div>
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

          {/* Acceptance limits */}
          <div className="mt-4 rounded-lg border bg-zinc-50 px-5 py-4">
            <div className="text-base">
              {acceptanceLimits.remaining > 0 ? (
                <span>
                  Вы можете принять ещё{' '}
                  <span className="font-medium">
                    {acceptanceLimits.remaining}{' '}
                    {pluralize(
                      acceptanceLimits.remaining,
                      'предложение',
                      'предложения',
                      'предложений'
                    )}
                  </span>
                  {acceptanceLimits.used > 0 && (
                    <span className="text-muted-foreground">
                      {' '}
                      (принято {acceptanceLimits.used} из {acceptanceLimits.max})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Все {acceptanceLimits.max} предложения приняты
                </span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-4 text-xl font-semibold">
              Предложения дилеров ({inquiry._count.offers})
            </h2>

            {offersByDealer.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border bg-muted/30 p-8 text-center text-base">
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

          {/* Back button at bottom */}
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
  // Only show the latest offer from each dealer
  const latestOffer = dealerGroup.offers[0];
  const isAccepted = latestOffer?.isAccepted || dealerGroup.hasTransaction;
  const canAccept = canAcceptMore && !dealerGroup.hasTransaction;

  if (!latestOffer) return null;

  return (
    <Card className={isAccepted ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}>
      <div className="p-4">
        {/* Top row: Price and Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-2xl font-bold text-gray-900">{formatPrice(latestOffer.price)}</div>

          {isAccepted ? (
            <span className="inline-flex items-center text-sm font-medium text-green-700">
              <Check className="mr-1 size-4" />
              Принято
            </span>
          ) : canAccept ? (
            <Button
              asChild
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-4"
            >
              <Link href={`/app/inquiry/${inquiryId}/offer/${latestOffer.id}`}>Выбрать</Link>
            </Button>
          ) : (
            <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 text-gray-500 text-sm">
              Недоступно
            </div>
          )}
        </div>

        {/* Middle: Dealer Name and time */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-900">{dealerGroup.dealerName}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">
            {formatRelativeTime(new Date(latestOffer.createdAt))}
          </span>
        </div>

        {/* Bottom: Offer details */}
        {(latestOffer.configuration ||
          latestOffer.deliveryTime ||
          latestOffer.additionalComments) && (
          <div className="mt-2 space-y-1 text-sm">
            {latestOffer.configuration && (
              <p className="text-gray-600">
                <span className="font-medium">Комплектация:</span> {latestOffer.configuration}
              </p>
            )}
            {latestOffer.deliveryTime && (
              <p className="text-gray-600">
                <span className="font-medium">Сроки:</span> {latestOffer.deliveryTime}
              </p>
            )}
            {latestOffer.additionalComments && (
              <p className="text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                {latestOffer.additionalComments}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
