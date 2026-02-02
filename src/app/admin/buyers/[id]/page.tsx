import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { BuyerEditForm } from '@/components/admin/buyer-edit-form';
import { RestoreButton } from '@/components/admin/restore-button';
import { deleteBuyer, restoreBuyer } from '@/lib/admin/actions';

type Params = Promise<{ id: string }>;

export default async function BuyerDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const buyer = await prisma.buyer.findUnique({
    where: { id },
    include: {
      inquiries: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { offers: true } },
        },
      },
    },
  });

  if (!buyer) {
    notFound();
  }

  const isDeleted = buyer.deletedAt != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/buyers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Информация о покупателе</h1>
        {isDeleted && <Badge variant="secondary">Удалён</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Данные покупателя</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{buyer.id}</span>

              <span className="text-muted-foreground">Платформа:</span>
              <Badge variant={buyer.platform === 'MAX' ? 'default' : 'secondary'}>
                {buyer.platform}
              </Badge>

              <span className="text-muted-foreground">ID в платформе:</span>
              <span>{buyer.platformUserId}</span>

              <span className="text-muted-foreground">Имя:</span>
              <span>{buyer.platformUserName || '-'}</span>

              <span className="text-muted-foreground">Создано:</span>
              <span>{format(buyer.createdAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Обновлено:</span>
              <span>{format(buyer.updatedAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Удалено:</span>
              <span>{buyer.deletedAt ? format(buyer.deletedAt, 'dd.MM.yyyy HH:mm') : '-'}</span>
            </div>

            <div className="pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2">
                {isDeleted ? (
                  <RestoreButton
                    entityName="Покупатель"
                    entityId={buyer.id}
                    onRestore={restoreBuyer}
                  />
                ) : (
                  <DeleteDialog
                    entityName="Покупатель"
                    entityId={buyer.id}
                    onDelete={deleteBuyer}
                    redirectTo="/admin/buyers"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Лимиты и заявки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <BuyerEditForm
                buyerId={buyer.id}
                inquiriesUsedThisMonth={buyer.inquiriesUsedThisMonth}
                inquiryLimitResetAt={buyer.inquiryLimitResetAt}
              />
            </div>

            <div className="border-t pt-4">
              <div className="mb-3 text-sm font-medium">Заявки ({buyer.inquiries.length})</div>
              {buyer.inquiries.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нет заявок</p>
              ) : (
                <div className="space-y-2">
                  {buyer.inquiries.map((inquiry) => (
                    <Link
                      key={inquiry.id}
                      href={`/admin/inquiries/${inquiry.id}`}
                      className="block rounded-md border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {inquiry.model} {inquiry.submodel}
                        </span>
                        <Badge variant="outline">{inquiry._count.offers} предл.</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(inquiry.createdAt, 'dd.MM.yyyy HH:mm')}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
