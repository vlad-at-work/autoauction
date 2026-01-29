import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { deleteDealer } from '@/lib/admin/actions';

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
          _count: { select: { leads: true } },
        },
      },
      _count: { select: { offers: true } },
    },
  });

  if (!dealer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dealers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Dealer Details</h1>
        <Badge variant={dealer.active ? 'default' : 'secondary'}>
          {dealer.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dealer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{dealer.id}</span>

              <span className="text-muted-foreground">Username:</span>
              <span>{dealer.username}</span>

              <span className="text-muted-foreground">Name:</span>
              <span>{dealer.name || '-'}</span>

              <span className="text-muted-foreground">Total Offers:</span>
              <span>{dealer._count.offers}</span>

              <span className="text-muted-foreground">Created:</span>
              <span>{format(dealer.createdAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Updated:</span>
              <span>{format(dealer.updatedAt, 'dd.MM.yyyy HH:mm')}</span>
            </div>

            <div className="pt-4 border-t">
              <DeleteDialog
                entityName="Dealer"
                entityId={dealer.id}
                onDelete={deleteDealer}
                redirectTo="/admin/dealers"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Offers ({dealer.offers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {dealer.offers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No offers yet</p>
            ) : (
              <div className="space-y-2">
                {dealer.offers.map((offer) => (
                  <Link
                    key={offer.id}
                    href={`/admin/offers/${offer.id}`}
                    className="block rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{offer.price.toLocaleString('ru-RU')} ₽</span>
                      <Badge variant="outline">{offer._count.leads} leads</Badge>
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
  );
}
