import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteDialog } from '@/components/admin/delete-dialog';
import { RestoreButton } from '@/components/admin/restore-button';
import { TransactionBillingForm } from '@/components/admin/transaction-billing-form';
import { deleteTransaction, restoreTransaction } from '@/lib/admin/actions';

type Params = Promise<{ id: string }>;

export default async function TransactionDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      dealer: true,
      inquiry: {
        include: { buyer: true },
      },
      offer: true,
    },
  });

  if (!tx) {
    notFound();
  }

  const isDeleted = tx.deletedAt != null;

  const dealerLabel =
    tx.dealerSubName || tx.dealerName || tx.dealer.subName || tx.dealer.name || tx.dealer.username;
  const dealerContact = tx.dealerEmail || tx.dealer.email || '-';
  const dealerPhone = tx.dealerPhone || tx.dealer.phone || '-';

  const carLabel =
    (tx.inquiryModel || tx.inquiry.model) + ' ' + (tx.inquirySubmodel || tx.inquiry.submodel);

  const offerPrice = tx.offerPrice ?? tx.offer.price;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/transactions" prefetch={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Транзакция</h1>
        {tx.voidedAt ? (
          <Badge variant="secondary">Void</Badge>
        ) : (
          <Badge variant="default">OK</Badge>
        )}
        {isDeleted && <Badge variant="secondary">Удалена</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Данные (immutable)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono">{tx.id}</span>

              <span className="text-muted-foreground">Принято:</span>
              <span>{format(tx.acceptedAt, 'dd.MM.yyyy HH:mm')}</span>

              <span className="text-muted-foreground">Покупатель:</span>
              <span>{tx.buyerName}</span>

              <span className="text-muted-foreground">Телефон:</span>
              <span>{tx.buyerPhone}</span>

              <span className="text-muted-foreground">Email:</span>
              <span>{tx.buyerEmail || '-'}</span>

              <span className="text-muted-foreground">Дилер:</span>
              <Link
                href={`/admin/dealers/${tx.dealerId}`}
                prefetch={false}
                className="text-primary hover:underline"
              >
                {dealerLabel}
              </Link>

              <span className="text-muted-foreground">Контакт дилера:</span>
              <span>
                {dealerPhone} • {dealerContact}
              </span>

              <span className="text-muted-foreground">Авто:</span>
              <Link
                href={`/admin/inquiries/${tx.inquiryId}`}
                className="text-primary hover:underline"
              >
                {carLabel}
              </Link>

              <span className="text-muted-foreground">Цена предложения:</span>
              <span className="font-medium">{offerPrice.toLocaleString('ru-RU')}</span>

              <span className="text-muted-foreground">Offer ID:</span>
              <Link
                href={`/admin/offers/${tx.offerId}`}
                prefetch={false}
                className="text-primary hover:underline"
              >
                {tx.offerId}
              </Link>

              <span className="text-muted-foreground">Inquiry ID:</span>
              <span className="font-mono">{tx.inquiryId}</span>

              <span className="text-muted-foreground">Dealer ID:</span>
              <span className="font-mono">{tx.dealerId}</span>

              <span className="text-muted-foreground">Удалена:</span>
              <span>{tx.deletedAt ? format(tx.deletedAt, 'dd.MM.yyyy HH:mm') : '-'}</span>
            </div>

            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {isDeleted ? (
                  <RestoreButton
                    entityName="Транзакция"
                    entityId={tx.id}
                    onRestore={restoreTransaction}
                  />
                ) : (
                  <DeleteDialog
                    entityName="Транзакция"
                    entityId={tx.id}
                    onDelete={deleteTransaction}
                    redirectTo="/admin/transactions"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Бухгалтерия</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionBillingForm
              transactionId={tx.id}
              amount={tx.amount}
              invoicedAt={tx.invoicedAt}
              billedAt={tx.billedAt}
              paidAt={tx.paidAt}
              voidedAt={tx.voidedAt}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
