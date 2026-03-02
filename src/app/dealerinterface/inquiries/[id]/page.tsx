'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { useWebApp } from '@/hooks/use-webapp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OfferForm } from '@/app/dealerinterface/inquiries/[id]/offer-form';
import { OfferCard } from '@/app/dealerinterface/inquiries/[id]/offer-card';
import { formatPhoneRU } from '@/lib/format-phone';
import {
  getShortId,
  getIdColorClass,
  formatPrice,
  anonymizeDealerName,
  formatRelativeTime,
} from '@/lib/inquiry-utils';
import { useParams, useRouter } from 'next/navigation';

const MAX_OFFERS_PER_DEALER = 5;

type Offer = {
  id: string;
  price: number;
  configuration?: string | null;
  deliveryTime?: string | null;
  additionalComments?: string | null;
  confirmedMatch?: boolean;
  dealerId: string;
  createdAt: string;
  transaction: { id: string; acceptedAt: string } | null;
};

type Transaction = {
  id: string;
  dealerId: string;
  buyerName: string;
  buyerEmail: string | null;
  buyerPhone: string;
  acceptedAt: string;
  buyerPlatform: 'MAX' | 'TELEGRAM' | null;
  buyerPlatformUserId: string | null;
  buyerPlatformHandle: string | null;
};

type InquiryData = {
  inquiry: {
    id: string;
    model: string;
    submodel: string;
    transmission: string;
    color: string;
    comment: string | null;
    expiresAt: string;
    transactionCount: number;
  };
  myOffers: Offer[];
  otherOffers: Offer[];
  myTransaction: Transaction | null;
  canMakeOffer: boolean;
  remainingOffers: number;
  dealerId: string;
};

export default function DealerInquiryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showBackButton } = useWebApp();
  const [data, setData] = useState<InquiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // BackButton navigates to inquiries list
  useEffect(() => {
    showBackButton(() => router.push('/dealerinterface/inquiries'));
  }, [showBackButton, router]);

  async function loadInquiry() {
    try {
      const webApp = getWebApp();
      const platform = detectPlatform();
      const initData = webApp?.initData;

      if (!initData || !platform) {
        setError('Откройте через бота MAX или Telegram');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/dealer/inquiries/${params.id}`, {
        headers: {
          Authorization: `Bearer ${platform}:dealer:${initData}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        setError('Ошибка авторизации. Войдите снова.');
        setLoading(false);
        return;
      }

      if (response.status === 404) {
        setError('Заявка не найдена');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const json = await response.json();
        setError(json.error || 'Не удалось загрузить заявку');
        setLoading(false);
        return;
      }

      const json = await response.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error('Load inquiry error:', err);
      setError('Ошибка соединения');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInquiry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <Loader2 className="text-muted-foreground size-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Ошибка</h1>
          <p className="text-red-700">{error}</p>
          <Link
            href="/dealerinterface/inquiries"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft className="size-4" />
            Назад к заявкам
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { inquiry, myOffers, otherOffers, myTransaction, canMakeOffer, remainingOffers } = data;

  const now = new Date();
  const isExpired = new Date(inquiry.expiresAt) <= now;
  const colorClass = getIdColorClass(inquiry.id);
  const shortId = getShortId(inquiry.id);

  const hoursLeft = Math.max(
    0,
    Math.ceil((new Date(inquiry.expiresAt).getTime() - now.getTime()) / (60 * 60 * 1000))
  );

  // Group other offers by dealer for anonymization
  const otherDealerIds = [...new Set(otherOffers.map((o) => o.dealerId))];
  const dealerIndexMap = new Map(otherDealerIds.map((dId, i) => [dId, i]));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-4">
      {/* Inquiry header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl leading-tight">
              <div>{inquiry.model}</div>
              {inquiry.submodel !== inquiry.model && (
                <div className="text-lg text-muted-foreground">{inquiry.submodel}</div>
              )}
            </CardTitle>
            <span
              className={`shrink-0 rounded px-2 py-1 text-xs font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
            >
              {shortId}
            </span>
          </div>
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
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {isExpired ? (
                  <span className="text-orange-600 font-medium">Истекла</span>
                ) : (
                  <span>~{hoursLeft}ч осталось</span>
                )}
                <span className="text-muted-foreground/40">·</span>
                <span>{inquiry.transactionCount} принято</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My transaction status */}
      {myTransaction && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-900">Ваше предложение принято!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-green-800">Информация покупателя:</p>
            <div className="mt-3 rounded border border-green-200 bg-white p-3">
              <div>
                <span className="font-medium">Имя:</span> {myTransaction.buyerName}
              </div>
              <div>
                <span className="font-medium">Телефон:</span>{' '}
                <a
                  href={`tel:${myTransaction.buyerPhone.replace(/\D/g, '')}`}
                  className="text-blue-600 underline"
                >
                  {formatPhoneRU(myTransaction.buyerPhone)}
                </a>
              </div>
              {myTransaction.buyerPlatform && myTransaction.buyerPlatformHandle && (
                <div>
                  <span className="font-medium">
                    {myTransaction.buyerPlatform === 'MAX' ? 'MAX' : 'Telegram'}:
                  </span>{' '}
                  {myTransaction.buyerPlatform === 'TELEGRAM' ? (
                    <a
                      href={`https://t.me/${myTransaction.buyerPlatformHandle}`}
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @{myTransaction.buyerPlatformHandle}
                    </a>
                  ) : (
                    <span>@{myTransaction.buyerPlatformHandle}</span>
                  )}
                </div>
              )}
              <div className="text-muted-foreground mt-2 text-xs">
                Принято: {new Date(myTransaction.acceptedAt).toLocaleString('ru-RU')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My offers section */}
      {myOffers.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="text-base font-bold text-blue-900">Ваши предложения</div>
          <div className="flex flex-col gap-2">
            {myOffers.map((offer, index) => (
              <OfferCard
                key={offer.id}
                offer={{
                  ...offer,
                  createdAt: new Date(offer.createdAt),
                  transaction: offer.transaction
                    ? {
                        ...offer.transaction,
                        acceptedAt: new Date(offer.transaction.acceptedAt),
                      }
                    : null,
                }}
                dealerName={null}
                isMyOffer={true}
                isFirstOffer={index === 0}
                formatPrice={formatPrice}
                formatRelativeTime={formatRelativeTime}
              />
            ))}
          </div>
        </div>
      )}

      {/* Competing offers section (anonymized) */}
      {otherOffers.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <div className="text-base font-bold text-gray-700">Предложения конкурентов</div>
          <div className="flex flex-col gap-2">
            {otherOffers.map((offer) => {
              const dealerIndex = dealerIndexMap.get(offer.dealerId) ?? 0;
              const anonName = anonymizeDealerName(dealerIndex);
              return (
                <div
                  key={offer.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                  <span className="text-muted-foreground text-sm">{anonName}</span>
                  <span className="font-medium">{formatPrice(offer.price)}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(new Date(offer.createdAt))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New offer form */}
      {!myTransaction && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold text-gray-900">
              {myOffers.length === 0 ? 'Сделать предложение' : 'Новое предложение'}
            </div>
            {!isExpired && myOffers.length > 0 && (
              <span className="text-muted-foreground text-xs">
                Осталось попыток: {remainingOffers}
              </span>
            )}
          </div>
          {isExpired ? (
            <Card className="border-gray-300 bg-gray-50">
              <CardContent className="py-4 text-sm text-gray-600">
                Заявка истекла — предложения больше не принимаются.
              </CardContent>
            </Card>
          ) : !canMakeOffer ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="py-4 text-sm text-orange-700">
                Вы достигли лимита предложений ({MAX_OFFERS_PER_DEALER}). Дождитесь решения
                покупателя.
              </CardContent>
            </Card>
          ) : (
            <OfferForm
              inquiryId={inquiry.id}
              disabled={false}
              offerNumber={myOffers.length + 1}
              onOfferSubmitted={loadInquiry}
            />
          )}
        </div>
      )}
      {/* Back button at bottom */}
      <Link
        href="/dealerinterface/inquiries"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        <ArrowLeft className="size-4" />
        Назад к заявкам
      </Link>
    </div>
  );
}
