'use client';

import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import Link from 'next/link';
import { PageTransition } from '@/components/page-transition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopBar } from '@/components/ui/top-bar';
import { useWebApp } from '@/hooks/use-webapp';
import { detectPlatform, getWebApp } from '@/app/app/webapp-ready';
import { formatPrice } from '@/lib/inquiry-utils';

type OfferDetail = {
  id: string;
  price: number;
  comment: string | null;
  createdAt: Date;
  dealerName: string;
  isAccepted: boolean;
  transactionId: string | null;
};

type InquiryForOffer = {
  id: string;
  model: string;
  submodel: string;
  email: string | null;
  expiresAt: Date;
  acceptanceLimits: {
    used: number;
    max: number;
    remaining: number;
  };
};

type OfferPageData = {
  inquiry: InquiryForOffer;
  offer: OfferDetail;
  dealerHasTransaction: boolean;
};

async function getOfferDetail(
  inquiryId: string,
  offerId: string,
  platform: 'max' | 'telegram',
  initData: string
): Promise<OfferPageData | null> {
  try {
    const res = await fetch(`/api/inquiries/${inquiryId}`, {
      headers: {
        Authorization: `Bearer ${platform}:customer:${initData}`,
      },
    });
    if (!res.ok) return null;

    const data = await res.json();

    // Find the offer
    const offer = data.offers?.find((o: { id: string }) => o.id === offerId);
    if (!offer) return null;

    // Check if this dealer already has a transaction
    const dealerHasTransaction = data.transactions?.some(
      (t: { dealerId: string }) => t.dealerId === offer.dealerId
    );

    return {
      inquiry: {
        id: data.id,
        model: data.model,
        submodel: data.submodel,
        email: data.email,
        expiresAt: data.expiresAt,
        acceptanceLimits: data.acceptanceLimits,
      },
      offer: {
        id: offer.id,
        price: offer.price,
        comment: offer.comment,
        createdAt: offer.createdAt,
        dealerName: offer.dealerName,
        isAccepted: offer.isAccepted,
        transactionId: offer.transactionId,
      },
      dealerHasTransaction,
    };
  } catch {
    return null;
  }
}

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showBackButton, hapticNotification } = useWebApp();
  const [data, setData] = useState<OfferPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const inquiryId = params.inquiryId as string;
  const offerId = params.offerId as string;

  // BackButton navigates to inquiry detail
  useEffect(() => {
    showBackButton(() => router.push(`/app/inquiry/${inquiryId}`));
  }, [showBackButton, router, inquiryId]);

  const loadData = useCallback(async () => {
    const webApp = getWebApp();
    const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString() || null;
    const platform = detectPlatform();
    const initData = webApp?.initData || null;

    if (!platformUserId || !platform || !initData) {
      router.replace('/app');
      return;
    }

    const result = await getOfferDetail(inquiryId, offerId, platform, initData);

    if (!result) {
      router.replace(`/app/inquiry/${inquiryId}`);
      return;
    }

    setData(result);
    setLoading(false);
  }, [inquiryId, offerId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptOffer = async () => {
    if (!data) return;

    const { inquiry, offer, dealerHasTransaction } = data;

    // Prevent accepting if dealer already has transaction
    if (dealerHasTransaction) {
      toast.info('Вы уже приняли предложение от этого дилера');
      return;
    }

    // Prevent accepting if limit reached
    if (inquiry.acceptanceLimits.remaining <= 0) {
      toast.error('Вы достигли лимита принятых предложений');
      return;
    }

    // Check if expired
    if (new Date(inquiry.expiresAt) < new Date()) {
      toast.error('Заявка истекла');
      return;
    }

    const remainingAfter = inquiry.acceptanceLimits.remaining - 1;
    const confirmMessage =
      `Вы уверены, что хотите принять это предложение?\n\n` +
      `Дилер: ${offer.dealerName}\n` +
      `Цена: ${formatPrice(offer.price)}\n\n` +
      `Ваши контактные данные будут переданы дилеру.\n\n` +
      (remainingAfter > 0
        ? `После этого вы сможете принять ещё ${remainingAfter} предложение${remainingAfter === 1 ? '' : remainingAfter < 5 ? 'я' : 'ий'}.`
        : `Это будет ваше последнее принятое предложение по этой заявке.`);

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const webApp = getWebApp();
    const platform = detectPlatform();
    const initData = webApp?.initData || null;

    if (!platform || !initData) {
      toast.error('Ошибка авторизации');
      return;
    }

    setAccepting(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${platform}:customer:${initData}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offerId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.info(result.error || 'Вы уже приняли это предложение');
        } else if (response.status === 410) {
          toast.error('Заявка истекла');
        } else {
          toast.error(result.error || 'Ошибка при принятии предложения');
        }
        hapticNotification('error');
        // Reload to get fresh state
        await loadData();
        return;
      }

      hapticNotification('success');
      toast.success('Предложение принято! Дилер скоро свяжется с вами.');

      // Reload to show updated state
      await loadData();
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Ошибка при принятии предложения');
      hapticNotification('error');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { inquiry, offer, dealerHasTransaction } = data;
  const isExpired = new Date(inquiry.expiresAt) < new Date();
  const canAccept =
    !offer.isAccepted &&
    !dealerHasTransaction &&
    inquiry.acceptanceLimits.remaining > 0 &&
    !isExpired;

  return (
    <PageTransition>
      <div className="min-h-screen w-full">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Acceptance limits banner */}
          <div className="mb-4 flex items-center justify-between rounded-lg border bg-zinc-50 px-4 py-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Принятых предложений: </span>
              <span className="font-medium">
                {inquiry.acceptanceLimits.used} из {inquiry.acceptanceLimits.max}
              </span>
            </div>
            {inquiry.acceptanceLimits.remaining > 0 ? (
              <Badge variant="outline" className="text-xs">
                Осталось: {inquiry.acceptanceLimits.remaining}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Лимит исчерпан
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Предложение от {offer.dealerName}</CardTitle>
                {offer.isAccepted && (
                  <Badge className="bg-green-600">
                    <Check className="mr-1 size-3" />
                    Принято
                  </Badge>
                )}
                {dealerHasTransaction && !offer.isAccepted && (
                  <Badge variant="secondary">Другое предложение принято</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-4">
                <div>
                  <div className="text-muted-foreground mb-1 text-sm">Автомобиль</div>
                  <div className="font-medium">
                    {inquiry.model} {inquiry.submodel}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1 text-sm">Цена</div>
                  <div className="text-3xl font-bold">{formatPrice(offer.price)}</div>
                </div>

                {offer.comment && (
                  <div>
                    <div className="text-muted-foreground mb-1 text-sm">Комментарий дилера</div>
                    <p className="text-base">{offer.comment}</p>
                  </div>
                )}

                <div>
                  <div className="text-muted-foreground mb-1 text-sm">Время подачи</div>
                  <p className="text-base">
                    {formatDistanceToNow(new Date(offer.createdAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              </div>

              {canAccept && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex gap-3 p-4">
                    <AlertCircle className="text-primary size-5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Внимание</p>
                      <p className="text-muted-foreground mt-1">
                        Принимая предложение, ваши контактные данные (имя, телефон
                        {inquiry.email ? ', эл. почта' : ''}) будут переданы дилеру.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {offer.isAccepted ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                  <Check className="mx-auto mb-2 size-8 text-green-600" />
                  <p className="font-medium text-green-800">Вы приняли это предложение</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Дилер получил ваши контактные данные и скоро свяжется с вами.
                  </p>
                </div>
              ) : dealerHasTransaction ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="font-medium text-gray-700">
                    Вы уже приняли другое предложение от этого дилера
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Можно принять только одно предложение от каждого дилера.
                  </p>
                </div>
              ) : inquiry.acceptanceLimits.remaining <= 0 ? (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
                  <p className="font-medium text-orange-800">Лимит принятых предложений исчерпан</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Вы уже приняли {inquiry.acceptanceLimits.max} предложения по этой заявке.
                  </p>
                </div>
              ) : isExpired ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="font-medium text-gray-700">Заявка истекла</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Принять это предложение больше нельзя.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleAcceptOffer}
                  disabled={accepting}
                  size="lg"
                  className="w-full"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Принимаем...
                    </>
                  ) : (
                    'Принять предложение'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Back button at bottom */}
          <div className="mt-6">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/app/inquiry/${inquiryId}`}>
                <ArrowLeft className="mr-2 size-4" />
                Назад к заявке
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
