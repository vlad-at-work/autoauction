import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { deleteInquiry } from '@/lib/admin/actions';

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
          _count: { select: { leads: true } },
        },
      },
    },
  });

  if (!inquiry) {
    notFound();
  }

  const isExpired = new Date(inquiry.expiresAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/inquiries">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Inquiry Details</h1>
        <Badge variant={isExpired ? 'secondary' : 'default'}>
          {isExpired ? 'Expired' : 'Active'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inquiry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{inquiry.id}</span>

              <span className="text-muted-foreground">Buyer:</span>
              <Link
                href={`/admin/buyers/${inquiry.buyerId}`}
                className="text-primary hover:underline"
              >
                {inquiry.buyer.platformUserName || inquiry.buyer.platformUserId}
              </Link>

              <span className="text-muted-foreground">Name:</span>
              <span>{inquiry.name}</span>

              <span className="text-muted-foreground">Phone:</span>
              <span>{inquiry.phone}</span>

              <span className="text-muted-foreground">Email:</span>
              <span>{inquiry.email || '-'}</span>

              <span className="text-muted-foreground">Model:</span>
              <span>
                {inquiry.model} {inquiry.submodel}
              </span>

              <span className="text-muted-foreground">Transmission:</span>
              <span>{inquiry.transmission}</span>

              <span className="text-muted-foreground">Color:</span>
              <span>{inquiry.color}</span>

              {inquiry.status && (
                <>
                  <span className="text-muted-foreground">Status:</span>
                  <span>{inquiry.status}</span>
                </>
              )}

              {inquiry.comment && (
                <>
                  <span className="text-muted-foreground">Comment:</span>
                  <span>{inquiry.comment}</span>
                </>
              )}

              <span className="text-muted-foreground">Created:</span>
              <span>{format(inquiry.createdAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Expires:</span>
              <span>{format(inquiry.expiresAt, 'dd.MM.yyyy HH:mm')}</span>
            </div>

            <div className="pt-4 border-t">
              <DeleteDialog
                entityName="Inquiry"
                entityId={inquiry.id}
                onDelete={deleteInquiry}
                redirectTo="/admin/inquiries"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offers ({inquiry.offers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {inquiry.offers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No offers yet</p>
            ) : (
              <div className="space-y-2">
                {inquiry.offers.map((offer) => (
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
                      From: {offer.dealer.name || offer.dealer.username} •{' '}
                      {format(offer.createdAt, 'dd.MM.yyyy HH:mm')}
                    </div>
                    {offer.comment && <div className="text-xs mt-1 truncate">{offer.comment}</div>}
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
