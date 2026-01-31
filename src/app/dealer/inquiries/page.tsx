import Link from 'next/link';
import { headers } from 'next/headers';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { parseBasicAuthHeader } from '@/lib/auth/basic';

export default async function DealerInquiriesPage() {
  const headerList = await headers();
  const auth = parseBasicAuthHeader(headerList.get('authorization'));

  const dealer = auth
    ? await prisma.dealer.upsert({
        where: { username: auth.username },
        update: {},
        create: { username: auth.username },
        select: { id: true },
      })
    : null;

  const now = new Date();

  const offersSelect = dealer
    ? {
        where: { dealerId: dealer.id },
        select: { id: true, price: true, updatedAt: true, leads: { select: { id: true } } },
      }
    : false;

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
        offers: offersSelect,
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
        offers: offersSelect,
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const offers = (inquiry as any).offers ?? [];
                const offer = offers[0] as unknown as
                  | { id: string; price: number; updatedAt: Date; leads: { id: string }[] }
                  | undefined;
                const hoursLeft = Math.max(
                  0,
                  Math.ceil((inquiry.expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000))
                );

                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/dealer/inquiries/${inquiry.id}`}
                      className="hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {inquiry.model} • {inquiry.submodel}
                        </div>
                        <div className="text-muted-foreground text-xs">Осталось: ~{hoursLeft}ч</div>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      {offer && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>
                            Ваше предложение: <span className="font-medium">{offer.price} ₽</span>
                          </span>
                          {offer.leads.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-green-200 bg-green-50 text-green-700"
                            >
                              ✓ Принято
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-blue-200 bg-blue-50 text-blue-700"
                            >
                              ⏳ В ожидании
                            </Badge>
                          )}
                        </div>
                      )}
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const offers = (inquiry as any).offers ?? [];
                const offer = offers[0] as unknown as
                  | { id: string; price: number; updatedAt: Date; leads: { id: string }[] }
                  | undefined;

                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/dealer/inquiries/${inquiry.id}`}
                      className="hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {inquiry.model} • {inquiry.submodel}
                        </div>
                        <Badge variant="secondary">Истекла</Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      {offer && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>
                            Ваше предложение: <span className="font-medium">{offer.price} ₽</span>
                          </span>
                          {offer.leads.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-green-200 bg-green-50 text-green-700"
                            >
                              ✓ Принято
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Без ответа</Badge>
                          )}
                        </div>
                      )}
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
