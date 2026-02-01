import Link from 'next/link';
import { headers } from 'next/headers';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { parseBasicAuthHeader } from '@/lib/auth/basic';
import { getShortId, getIdColorClass, formatPrice } from '@/lib/inquiry-utils';

export default async function DealerInquiriesPage() {
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

  const dealer = await prisma.dealer.upsert({
    where: { username: auth.username },
    update: {},
    create: { username: auth.username },
    select: { id: true },
  });

  const now = new Date();

  const [activeInquiries, previousInquiries] = await Promise.all([
    prisma.inquiry.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        model: true,
        submodel: true,
        transmission: true,
        color: true,
        createdAt: true,
        expiresAt: true,
        offers: {
          select: {
            id: true,
            price: true,
            dealerId: true,
            createdAt: true,
            transaction: { select: { id: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          select: { id: true, dealerId: true },
        },
      },
    }),
    prisma.inquiry.findMany({
      where: { expiresAt: { lte: now } },
      take: 25,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        model: true,
        submodel: true,
        transmission: true,
        color: true,
        createdAt: true,
        expiresAt: true,
        offers: {
          select: {
            id: true,
            price: true,
            dealerId: true,
            createdAt: true,
            transaction: { select: { id: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          select: { id: true, dealerId: true },
        },
      },
    }),
  ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Заявки (активные 24 часа)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activeInquiries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Пока нет активных заявок.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activeInquiries.map((inquiry) => {
                const myOffers = dealer
                  ? inquiry.offers.filter((o) => o.dealerId === dealer.id)
                  : [];
                const latestMyOffer = myOffers[0];
                const totalOfferCount = inquiry.offers.length;
                const acceptedCount = inquiry.transactions.length;
                const myTransaction = dealer
                  ? inquiry.transactions.find((t) => t.dealerId === dealer.id)
                  : null;

                const hoursLeft = Math.max(
                  0,
                  Math.ceil((inquiry.expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000))
                );

                const colorClass = getIdColorClass(inquiry.id);
                const shortId = getShortId(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/dealer/inquiries/${inquiry.id}`}
                      className="hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
                          >
                            {shortId}
                          </span>
                          <span className="font-medium">
                            {inquiry.model} • {inquiry.submodel}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">Осталось: ~{hoursLeft}ч</div>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {totalOfferCount > 0 && (
                          <Badge variant="secondary">{totalOfferCount} предл.</Badge>
                        )}
                        {acceptedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            {acceptedCount} принято
                          </Badge>
                        )}
                      </div>
                      {myTransaction ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            ✓ Ваше предложение принято
                          </Badge>
                          {latestMyOffer && (
                            <span className="text-muted-foreground">
                              {formatPrice(latestMyOffer.price)}
                            </span>
                          )}
                        </div>
                      ) : latestMyOffer ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <span>
                            Ваше предложение:{' '}
                            <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                          </span>
                          {myOffers.length > 1 && (
                            <span className="text-muted-foreground">
                              (+{myOffers.length - 1} ещё)
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                          >
                            ⏳ В ожидании
                          </Badge>
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Прошлые заявки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {previousInquiries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Пока нет прошлых заявок.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {previousInquiries.map((inquiry) => {
                const myOffers = dealer
                  ? inquiry.offers.filter((o) => o.dealerId === dealer.id)
                  : [];
                const latestMyOffer = myOffers[0];
                const myTransaction = dealer
                  ? inquiry.transactions.find((t) => t.dealerId === dealer.id)
                  : null;

                const colorClass = getIdColorClass(inquiry.id);
                const shortId = getShortId(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/dealer/inquiries/${inquiry.id}`}
                      className="hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 opacity-70 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
                          >
                            {shortId}
                          </span>
                          <span className="font-medium">
                            {inquiry.model} • {inquiry.submodel}
                          </span>
                        </div>
                        <Badge variant="secondary">Истекла</Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      {myTransaction ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            ✓ Ваше предложение принято
                          </Badge>
                          {latestMyOffer && (
                            <span className="text-muted-foreground">
                              {formatPrice(latestMyOffer.price)}
                            </span>
                          )}
                        </div>
                      ) : latestMyOffer ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span>
                            Ваше предложение:{' '}
                            <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                          </span>
                          <Badge variant="secondary">Без ответа</Badge>
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
