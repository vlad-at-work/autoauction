import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { deleteOffer } from '@/lib/admin/actions';

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
      leads: {
        orderBy: { acceptedAt: 'desc' },
      },
    },
  });

  if (!offer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/offers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Информация о предложении</h1>
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
              <span className="font-bold text-lg">{offer.price.toLocaleString('ru-RU')} ₽</span>

              <span className="text-muted-foreground">Дилер:</span>
              <Link
                href={`/admin/dealers/${offer.dealerId}`}
                className="text-primary hover:underline"
              >
                {offer.dealer.name || offer.dealer.username}
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

              {offer.comment && (
                <>
                  <span className="text-muted-foreground">Комментарий:</span>
                  <span>{offer.comment}</span>
                </>
              )}

              <span className="text-muted-foreground">Создано:</span>
              <span>{format(offer.createdAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Обновлено:</span>
              <span>{format(offer.updatedAt, 'dd.MM.yyyy HH:mm')}</span>
            </div>

            <div className="pt-4 border-t">
              <DeleteDialog
                entityName="Предложение"
                entityId={offer.id}
                onDelete={deleteOffer}
                redirectTo="/admin/offers"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Лиды ({offer.leads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {offer.leads.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Пока нет лидов (предложение не принято)
              </p>
            ) : (
              <div className="space-y-2">
                {offer.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/admin/leads/${lead.id}`}
                    className="block rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{lead.buyerName}</span>
                      <Badge variant="default">Accepted</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {lead.buyerPhone} • {format(lead.acceptedAt, 'dd.MM.yyyy HH:mm')}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
