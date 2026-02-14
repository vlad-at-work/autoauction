import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { InquiryEditForm } from '@/components/admin/inquiry-edit-form';
import { RestoreButton } from '@/components/admin/restore-button';
import { deleteInquiry, restoreInquiry } from '@/lib/admin/actions';

type Params = Promise<{ id: string }>;

export default async function InquiryDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      buyer: true,
      offers: {
        orderBy: { createdAt: 'desc' },
        include: {
          dealer: true,
          transaction: true,
        },
      },
      transactions: {
        orderBy: { acceptedAt: 'desc' },
        include: {
          dealer: true,
        },
      },
    },
  });

  if (!inquiry) {
    notFound();
  }

  const isExpired = new Date(inquiry.expiresAt) < new Date();
  const isDeleted = inquiry.deletedAt != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/inquiries" prefetch={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Информация о заявке</h1>
        <Badge variant={isExpired ? 'secondary' : 'default'}>
          {isExpired ? 'Истекла' : 'Активна'}
        </Badge>
        {isDeleted && <Badge variant="secondary">Удалена</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Данные заявки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{inquiry.id}</span>

              <span className="text-muted-foreground">Покупатель:</span>
              <Link
                href={`/admin/buyers/${inquiry.buyerId}`}
                className="text-primary hover:underline"
              >
                {inquiry.buyer.platformUserName || inquiry.buyer.platformUserId}
              </Link>

              <span className="text-muted-foreground">Имя:</span>
              <span>{inquiry.name}</span>

              <span className="text-muted-foreground">Телефон:</span>
              <span>{inquiry.phone}</span>

              <span className="text-muted-foreground">Эл. почта:</span>
              <span>{inquiry.email || '-'}</span>

              <span className="text-muted-foreground">Модель:</span>
              <span>
                {inquiry.model} {inquiry.submodel}
              </span>

              <span className="text-muted-foreground">Коробка передач:</span>
              <span>{inquiry.transmission}</span>

              <span className="text-muted-foreground">Цвет:</span>
              <span>{inquiry.color}</span>

              {inquiry.comment && (
                <>
                  <span className="text-muted-foreground">Комментарий:</span>
                  <span>{inquiry.comment}</span>
                </>
              )}

              <span className="text-muted-foreground">Создана:</span>
              <span>{format(inquiry.createdAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Истекает:</span>
              <span>{format(inquiry.expiresAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Удалена:</span>
              <span>{inquiry.deletedAt ? format(inquiry.deletedAt, 'dd.MM.yyyy HH:mm') : '-'}</span>
            </div>

            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {isDeleted ? (
                  <RestoreButton
                    entityName="Заявка"
                    entityId={inquiry.id}
                    onRestore={restoreInquiry}
                  />
                ) : (
                  <DeleteDialog
                    entityName="Заявка"
                    entityId={inquiry.id}
                    onDelete={deleteInquiry}
                    redirectTo="/admin/inquiries"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Редактирование</CardTitle>
            </CardHeader>
            <CardContent>
              <InquiryEditForm
                inquiryId={inquiry.id}
                buyerId={inquiry.buyerId}
                name={inquiry.name}
                email={inquiry.email}
                phone={inquiry.phone}
                model={inquiry.model}
                submodel={inquiry.submodel}
                transmission={inquiry.transmission}
                color={inquiry.color}
                comment={inquiry.comment}
                expiresAt={inquiry.expiresAt}
                isExpired={isExpired}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Транзакции ({inquiry.transactions.length}/3)</CardTitle>
            </CardHeader>
            <CardContent>
              {inquiry.transactions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нет принятых предложений</p>
              ) : (
                <div className="space-y-2">
                  {inquiry.transactions.map((tx) => (
                    <Link
                      key={tx.id}
                      href={`/admin/transactions/${tx.id}`}
                      className="block rounded-md border border-green-200 bg-green-50 p-3 transition-colors hover:bg-green-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{tx.buyerName}</span>
                        <Badge className="bg-green-600">Принято</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        Дилер: {tx.dealer.name || tx.dealer.username} •{' '}
                        {format(tx.acceptedAt, 'dd.MM.yyyy HH:mm')}
                      </div>
                      <div className="text-muted-foreground text-xs">{tx.buyerPhone}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Предложения ({inquiry.offers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {inquiry.offers.length === 0 ? (
                <p className="text-muted-foreground text-sm">Пока нет предложений</p>
              ) : (
                <div className="space-y-2">
                  {inquiry.offers.map((offer) => (
                    <Link
                      key={offer.id}
                      href={`/admin/offers/${offer.id}`}
                      className={`block rounded-md border p-3 transition-colors hover:bg-muted/50 ${
                        offer.transaction ? 'border-green-200 bg-green-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{offer.price.toLocaleString('ru-RU')} ₽</span>
                        {offer.transaction ? (
                          <Badge className="bg-green-600">Принято</Badge>
                        ) : (
                          <Badge variant="outline">Ожидание</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        От: {offer.dealer.name || offer.dealer.username} •{' '}
                        {format(offer.createdAt, 'dd.MM.yyyy HH:mm')}
                      </div>
                      {offer.comment && (
                        <div className="mt-1 truncate text-xs">{offer.comment}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
