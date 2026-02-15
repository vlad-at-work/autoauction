import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { DealerEditForm } from '@/components/admin/dealer-edit-form';
import { RestoreButton } from '@/components/admin/restore-button';
import { DealerInviteSection } from '@/components/admin/dealer-invite-section';
import { deleteDealer, restoreDealer } from '@/lib/admin/actions';

type Params = Promise<{ id: string }>;

export default async function DealerDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const dealer = await prisma.dealer.findUnique({
    where: { id },
    include: {
      offers: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          inquiry: true,
          transaction: true,
        },
      },
      _count: { select: { offers: true } },
    },
  });

  if (!dealer) {
    notFound();
  }

  const isDeleted = dealer.deletedAt != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dealers" prefetch={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Информация о дилере</h1>
        <Badge variant={dealer.active ? 'default' : 'secondary'}>
          {dealer.active ? 'Активен' : 'Неактивен'}
        </Badge>
        {isDeleted && <Badge variant="secondary">Удалён</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Данные дилера</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{dealer.id}</span>

              <span className="text-muted-foreground">Имя пользователя:</span>
              <span>{dealer.username}</span>

              <span className="text-muted-foreground">Имя:</span>
              <span>{dealer.name || '-'}</span>

              <span className="text-muted-foreground">Дилерский центр:</span>
              <span>{dealer.subName || '-'}</span>

              <span className="text-muted-foreground">Телефон:</span>
              <span>{dealer.phone || '-'}</span>

              <span className="text-muted-foreground">Email:</span>
              <span>{dealer.email || '-'}</span>

              <span className="text-muted-foreground">Платформа:</span>
              <span>{dealer.platform || '-'}</span>

              <span className="text-muted-foreground">Platform user ID:</span>
              <span className="font-mono">{dealer.platformUserId || '-'}</span>

              <span className="text-muted-foreground">Platform chat ID:</span>
              <span className="font-mono">{dealer.platformChatId || '-'}</span>

              <span className="text-muted-foreground">Пароль:</span>
              <span>{dealer.passwordHash ? 'Установлен' : 'Не установлен'}</span>

              <span className="text-muted-foreground">Всего предложений:</span>
              <span>{dealer._count.offers}</span>

              <span className="text-muted-foreground">Создан:</span>
              <span>{format(dealer.createdAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Обновлён:</span>
              <span>{format(dealer.updatedAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Удалён:</span>
              <span>{dealer.deletedAt ? format(dealer.deletedAt, 'dd.MM.yyyy HH:mm') : '-'}</span>
            </div>

            <div className="pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2">
                {isDeleted ? (
                  <RestoreButton
                    entityName="Дилер"
                    entityId={dealer.id}
                    onRestore={restoreDealer}
                  />
                ) : (
                  <DeleteDialog
                    entityName="Дилер"
                    entityId={dealer.id}
                    onDelete={deleteDealer}
                    redirectTo="/admin/dealers"
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
              <DealerEditForm
                dealerId={dealer.id}
                username={dealer.username}
                name={dealer.name}
                subName={dealer.subName}
                phone={dealer.phone}
                email={dealer.email}
                description={dealer.description}
                active={dealer.active}
              />
            </CardContent>
          </Card>

          <DealerInviteSection
            dealerId={dealer.id}
            initialToken={dealer.inviteToken}
            initialExpiresAt={dealer.inviteTokenExpiresAt}
          />

          <Card>
            <CardHeader>
              <CardTitle>Последние предложения ({dealer.offers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {dealer.offers.length === 0 ? (
                <p className="text-muted-foreground text-sm">Пока нет предложений</p>
              ) : (
                <div className="space-y-2">
                  {dealer.offers.map((offer) => (
                    <Link
                      key={offer.id}
                      href={`/admin/offers/${offer.id}`}
                      className="block rounded-md border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{offer.price.toLocaleString('ru-RU')}</span>
                        {offer.transaction && <Badge variant="default">Принято</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {offer.inquiry.model} {offer.inquiry.submodel} •{' '}
                        {format(offer.createdAt, 'dd.MM.yyyy HH:mm')}
                      </div>
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
