import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { parseBasicAuthHeader } from '@/lib/auth/basic';
import { OfferForm } from '@/app/dealer/inquiries/[id]/offer-form';

export default async function DealerInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      offers: dealer
        ? {
            where: { dealerId: dealer.id },
            include: {
              leads: true,
            },
          }
        : undefined,
    },
  });

  if (!inquiry) notFound();

  const now = new Date();
  const isExpired = inquiry.expiresAt <= now;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offers = (inquiry as any).offers || [];
  const offer = offers[0] as unknown as
    | {
        id: string;
        price: number;
        comment: string | null;
        leads: {
          id: string;
          buyerName: string;
          buyerEmail: string | null;
          buyerPhone: string;
          acceptedAt: Date;
        }[];
      }
    | undefined;

  const lead = offer?.leads[0];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>
            {inquiry.model} • {inquiry.submodel}
          </CardTitle>
          <div className="text-muted-foreground text-sm">
            ID: {inquiry.id}
            {' · '}
            До: {inquiry.expiresAt.toISOString()}
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
            {inquiry.status && (
              <div>
                <span className="font-medium">Статус:</span> {inquiry.status}
                {inquiry.statusDescription ? ` — ${inquiry.statusDescription}` : ''}
              </div>
            )}
            {inquiry.comment && (
              <div>
                <span className="font-medium">Комментарий:</span> {inquiry.comment}
              </div>
            )}
          </div>

          {isExpired ? (
            <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm">
              Заявка истекла — предложения больше не принимаются.
            </div>
          ) : lead ? (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-900">
                  ✅ Лид получен! Покупатель принял ваше предложение
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Имя:</span> {lead.buyerName}
                </div>
                <div>
                  <span className="font-medium">Телефон:</span>{' '}
                  <a href={`tel:${lead.buyerPhone}`} className="text-blue-600 underline">
                    {lead.buyerPhone}
                  </a>
                </div>
                {lead.buyerEmail && (
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    <a href={`mailto:${lead.buyerEmail}`} className="text-blue-600 underline">
                      {lead.buyerEmail}
                    </a>
                  </div>
                )}
                <div className="text-muted-foreground text-xs">
                  Принято: {new Date(lead.acceptedAt).toLocaleString('ru-RU')}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Ваше предложение</div>
            <OfferForm
              inquiryId={inquiry.id}
              defaultPrice={offer?.price}
              defaultComment={offer?.comment}
              disabled={isExpired || (offer ? offer.leads.length > 0 : false)}
            />
          </div>

          <Link
            href="/dealer/inquiries"
            className="text-primary text-sm underline underline-offset-4"
          >
            Назад к списку
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
