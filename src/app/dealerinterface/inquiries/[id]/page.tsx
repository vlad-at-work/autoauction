import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { parseBasicAuthHeader } from '@/lib/auth/basic';
import { OfferForm } from '@/app/dealerinterface/inquiries/[id]/offer-form';
import { OfferCard } from '@/app/dealerinterface/inquiries/[id]/offer-card';
import {
  getShortId,
  getIdColorClass,
  formatPrice,
  anonymizeDealerName,
  formatRelativeTime,
} from '@/lib/inquiry-utils';

const MAX_OFFERS_PER_DEALER = 5;

export default async function DealerInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headerList = await headers();
  const auth = parseBasicAuthHeader(headerList.get('authorization'));

  // Require authentication - reject without credentials
  if (!auth) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Доступ запрещен</h1>
          <p className="mb-4 text-sm text-red-800">
            Требуется аутентификация. Пожалуйста, используйте правильные учетные данные.
          </p>
          <p className="text-xs text-red-700">
            Это портал для дилеров. Используйте ваше имя пользователя и пароль.
          </p>
        </div>
      </div>
    );
  }

  const dealer = await prisma.dealer.findFirst({
    where: { username: auth.username, deletedAt: null },
    select: { id: true, active: true },
  });

  if (!dealer) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Дилер не зарегистрирован</h1>
          <p className="mb-4 text-sm text-red-800">
            Ваш логин не найден в базе. Попросите администратора создать дилера в /admin/dealers.
          </p>
          <p className="text-xs text-red-700">
            Логин: <span className="font-mono">{auth.username}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!dealer.active) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-orange-200 bg-orange-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-orange-900">Дилер неактивен</h1>
          <p className="text-sm text-orange-800">
            Доступ временно ограничен. Обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

  const inquiry = await prisma.inquiry.findFirst({
    where: { id, deletedAt: null },
    include: {
      offers: {
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null },
        select: {
          id: true,
          price: true,
          comment: true,
          dealerId: true,
          createdAt: true,
          transaction: {
            select: {
              id: true,
              acceptedAt: true,
              // NOTE: Buyer info NOT included here - competitors shouldn't see it
            },
          },
        },
      },
      transactions: {
        // Only this dealer's transaction will be shown with buyer info
        where: { dealerId: dealer.id },
        select: {
          id: true,
          dealerId: true,
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
          acceptedAt: true,
        },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!inquiry) notFound();

  const now = new Date();
  const isExpired = inquiry.expiresAt <= now;
  const colorClass = getIdColorClass(inquiry.id);
  const shortId = getShortId(inquiry.id);

  // Separate my offers from others
  const myOffers = dealer ? inquiry.offers.filter((o) => o.dealerId === dealer.id) : [];
  const otherOffers = dealer
    ? inquiry.offers.filter((o) => o.dealerId !== dealer.id)
    : inquiry.offers;
  const myTransaction = dealer ? inquiry.transactions.find((t) => t.dealerId === dealer.id) : null;

  // Group other offers by dealer for anonymization
  const otherDealerIds = [...new Set(otherOffers.map((o) => o.dealerId))];
  const dealerIndexMap = new Map(otherDealerIds.map((dId, i) => [dId, i]));

  const hoursLeft = Math.max(
    0,
    Math.ceil((inquiry.expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000))
  );

  const canMakeOffer = !isExpired && !myTransaction && myOffers.length < MAX_OFFERS_PER_DEALER;
  const remainingOffers = MAX_OFFERS_PER_DEALER - myOffers.length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
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
            {inquiry._count.transactions} принято
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
                  🎉 Ваше предложение принято!
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
                    <a href={`tel:${myTransaction.buyerPhone}`} className="text-blue-600 underline">
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
                    offer={offer}
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
                      offer={offer}
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
                    ⏰ Заявка истекла — предложения больше не принимаются.
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
                />
              )}
            </div>
          )}

          <Link
            href="/dealerinterface/inquiries"
            className="text-primary text-sm underline underline-offset-4"
          >
            Назад к списку
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
