import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { RestoreButton } from '@/components/admin/restore-button';
import { deleteOffer, restoreOffer } from '@/lib/admin/actions';
import { formatPhoneRU } from '@/lib/format-phone';

type Params = Promise<{ id: string }>;

export default async function OfferDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      inquiry: {
        include: { buyer: true },
      },
      dealer: true,
      transaction: true,
    },
  });

  if (!offer) {
    notFound();
  }

  const isDeleted = offer.deletedAt != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/offers" prefetch={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Информация о предложении</h1>
        {isDeleted && <Badge variant="secondary">Удалено</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Данные предложения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{offer.id}</span>

              <span className="text-muted-foreground">Цена:</span>
              <span className="text-lg font-bold">{offer.price.toLocaleString('ru-RU')}</span>

              <span className="text-muted-foreground">Дилер:</span>
              <Link
                href={`/admin/dealers/${offer.dealerId}`}
                className="text-primary hover:underline"
              >
                {(offer.dealer.name || offer.dealer.username) +
                  (offer.dealer.subName ? ` • ${offer.dealer.subName}` : '')}
              </Link>

              <span className="text-muted-foreground">Заявка:</span>
              <Link
                href={`/admin/inquiries/${offer.inquiryId}`}
                className="text-primary hover:underline"
              >
                {offer.inquiry.model} {offer.inquiry.submodel}
              </Link>

              <span className="text-muted-foreground">Покупатель:</span>
              <Link
                href={`/admin/buyers/${offer.inquiry.buyerId}`}
                className="text-primary hover:underline"
              >
                {offer.inquiry.buyer.platformUserName || offer.inquiry.buyer.platformUserId}
              </Link>

              {offer.configuration && (
                <>
                  <span className="text-muted-foreground">Комплектация:</span>
                  <span>{offer.configuration}</span>
                </>
              )}

              {offer.deliveryTime && (
                <>
                  <span className="text-muted-foreground">Сроки поставки:</span>
                  <span>{offer.deliveryTime}</span>
                </>
              )}

              {offer.additionalComments && (
                <>
                  <span className="text-muted-foreground">Доп. комментарии:</span>
                  <span>{offer.additionalComments}</span>
                </>
              )}

              <span className="text-muted-foreground">Подтверждение совпадения:</span>
              <span>{offer.confirmedMatch ? '✓ Подтверждено' : '—'}</span>

              <span className="text-muted-foreground">Создано:</span>
              <span>{format(offer.createdAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Удалено:</span>
              <span>{offer.deletedAt ? format(offer.deletedAt, 'dd.MM.yyyy HH:mm') : '-'}</span>
            </div>

            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {isDeleted ? (
                  <RestoreButton
                    entityName="Предложение"
                    entityId={offer.id}
                    onRestore={restoreOffer}
                  />
                ) : (
                  <DeleteDialog
                    entityName="Предложение"
                    entityId={offer.id}
                    onDelete={deleteOffer}
                    redirectTo="/admin/offers"
                  />
                )}
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Цена и комментарий редактируются только дилером. Админ может только
              скрыть/восстановить предложение.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статус транзакции</CardTitle>
          </CardHeader>
          <CardContent>
            {!offer.transaction ? (
              <p className="text-muted-foreground text-sm">
                Предложение ещё не принято покупателем
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">Принято</Badge>
                </div>
                <Link
                  href={`/admin/transactions/${offer.transaction.id}`}
                  className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{offer.transaction.buyerName}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {formatPhoneRU(offer.transaction.buyerPhone)} •{' '}
                    {format(offer.transaction.acceptedAt, 'dd.MM.yyyy HH:mm')}
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
