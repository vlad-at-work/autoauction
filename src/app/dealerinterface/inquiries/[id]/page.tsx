'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OfferForm } from '@/app/dealerinterface/inquiries/[id]/offer-form';
import { OfferCard } from '@/app/dealerinterface/inquiries/[id]/offer-card';
import {
  getShortId,
  getIdColorClass,
  formatPrice,
  anonymizeDealerName,
  formatRelativeTime,
} from '@/lib/inquiry-utils';
import { useParams } from 'next/navigation';

const MAX_OFFERS_PER_DEALER = 5;

type Offer = {
  id: string;
  price: number;
  comment?: string | null;
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
  const [data, setData] = useState<InquiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Загрузка...</div>
          <div className="mt-2 text-sm text-gray-500">Загрузка заявки</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Back button at top */}
        <div className="border-b bg-white px-4 py-3">
          <Link
            href="/dealerinterface/inquiries"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="size-4" />
            Назад к заявкам
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-red-50 p-6 text-center">
            <h1 className="mb-2 text-xl font-semibold text-red-900">Ошибка</h1>
            <p className="text-red-700">{error}</p>
          </div>
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
    <div className="flex min-h-screen flex-col">
      {/* Back button at top */}
      <div className="border-b bg-white px-4 py-3">
        <Link
          href="/dealerinterface/inquiries"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" />
          Назад к заявкам
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span
                className={`rounded px-2 py-1 text-sm font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
              >
                {shortId}
              </span>
              <CardTitle>
                {inquiry.model} • {inquiry.submodel}
              </CardTitle>
            </div>
            <div className="text-muted-foreground text-sm">
              {isExpired ? (
                <span className="text-orange-600">Заявка истекла</span>
              ) : (
                <span>Осталось: ~{hoursLeft}ч</span>
              )}
              {' · '}
              {inquiry.transactionCount} принято
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="text-sm">
              <div>
                <span className="font-medium">Коробка:</span> {inquiry.transmission}
              </div>
              <div>
                <span className="font-medium">Цвет:</span> {inquiry.color}
              </div>
              {inquiry.comment && (
                <div>
                  <span className="font-medium">Комментарий:</span> {inquiry.comment}
                </div>
              )}
            </div>

            {/* My transaction status */}
            {myTransaction && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900">
                    Ваше предложение принято!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-green-800">
                    У вас есть контактная информация покупателя. Свяжитесь с ним как можно скорее.
                  </p>
                  <div className="mt-3 rounded border border-green-200 bg-white p-3">
                    <div>
                      <span className="font-medium">Имя:</span> {myTransaction.buyerName}
                    </div>
                    <div>
                      <span className="font-medium">Телефон:</span>{' '}
                      <a
                        href={`tel:${myTransaction.buyerPhone}`}
                        className="text-blue-600 underline"
                      >
                        {myTransaction.buyerPhone}
                      </a>
                    </div>
                    {myTransaction.buyerEmail && (
                      <div>
                        <span className="font-medium">Эл. почта:</span>{' '}
                        <a
                          href={`mailto:${myTransaction.buyerEmail}`}
                          className="text-blue-600 underline"
                        >
                          {myTransaction.buyerEmail}
                        </a>
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
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium">Ваши предложения ({myOffers.length})</div>
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
              <div className="flex flex-col gap-3">
                <div className="text-sm font-medium">
                  Предложения конкурентов ({otherOffers.length})
                </div>
                <div className="flex flex-col gap-2">
                  {otherOffers.map((offer) => {
                    const dealerIndex = dealerIndexMap.get(offer.dealerId) ?? 0;
                    const anonName = anonymizeDealerName(dealerIndex);
                    return (
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
                        dealerName={anonName}
                        isMyOffer={false}
                        isFirstOffer={false}
                        formatPrice={formatPrice}
                        formatRelativeTime={formatRelativeTime}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* New offer form */}
            {!myTransaction && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
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
                    defaultPrice={myOffers[0]?.price}
                    defaultComment=""
                    disabled={false}
                    offerNumber={myOffers.length + 1}
                    onOfferSubmitted={loadInquiry}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
