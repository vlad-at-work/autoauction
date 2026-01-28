import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { parseBasicAuthHeader } from '@/lib/auth/basic';
import { OfferForm } from '@/app/dealer/inquiries/[id]/offer-form';

export default async function DealerInquiryPage({ params }: { params: { id: string } }) {
  const { id } = params;
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
    select: {
      id: true,
      model: true,
      submodel: true,
      transmission: true,
      color: true,
      status: true,
      statusDescription: true,
      comment: true,
      createdAt: true,
      expiresAt: true,
      offers: dealer
        ? {
            where: { dealerId: dealer.id },
            select: { id: true, price: true, comment: true, acceptedAt: true },
          }
        : false,
    },
  });

  if (!inquiry) notFound();

  const now = new Date();
  const isExpired = inquiry.expiresAt <= now;
  const offer = inquiry.offers[0];

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
          ) : offer?.acceptedAt ? (
            <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm">
              Пользователь уже принял ваше предложение — редактирование отключено.
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Ваше предложение</div>
            <OfferForm
              inquiryId={inquiry.id}
              defaultPrice={offer?.price}
              defaultComment={offer?.comment}
              disabled={isExpired || !!offer?.acceptedAt}
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
