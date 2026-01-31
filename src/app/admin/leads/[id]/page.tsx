import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Params = Promise<{ id: string }>;

export default async function LeadDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      offer: {
        include: {
          inquiry: {
            include: { buyer: true },
          },
          dealer: true,
        },
      },
    },
  });

  if (!lead) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Информация о лиде</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Данные лида</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{lead.id}</span>

              <span className="text-muted-foreground">Имя покупателя:</span>
              <span className="font-medium">{lead.buyerName}</span>

              <span className="text-muted-foreground">Телефон:</span>
              <span>{lead.buyerPhone}</span>

              <span className="text-muted-foreground">Эл. почта:</span>
              <span>{lead.buyerEmail || '-'}</span>

              <span className="text-muted-foreground">Принято:</span>
              <span>{format(lead.acceptedAt, 'dd.MM.yyyy HH:mm')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Связанные данные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Цена предложения:</span>
              <span className="font-bold">{lead.offer.price.toLocaleString('ru-RU')} ₽</span>

              <span className="text-muted-foreground">Предложение:</span>
              <Link
                href={`/admin/offers/${lead.offer.id}`}
                className="text-primary hover:underline"
              >
                Просмотр
              </Link>

              <span className="text-muted-foreground">Дилер:</span>
              <Link
                href={`/admin/dealers/${lead.offer.dealerId}`}
                className="text-primary hover:underline"
              >
                {lead.offer.dealer.name || lead.offer.dealer.username}
              </Link>

              <span className="text-muted-foreground">Заявка:</span>
              <Link
                href={`/admin/inquiries/${lead.offer.inquiryId}`}
                className="text-primary hover:underline"
              >
                {lead.offer.inquiry.model} {lead.offer.inquiry.submodel}
              </Link>

              <span className="text-muted-foreground">Аккаунт покупателя:</span>
              <Link
                href={`/admin/buyers/${lead.offer.inquiry.buyerId}`}
                className="text-primary hover:underline"
              >
                {lead.offer.inquiry.buyer.platformUserName ||
                  lead.offer.inquiry.buyer.platformUserId}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
