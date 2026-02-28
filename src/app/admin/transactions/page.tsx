import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Transaction, Dealer, Inquiry, Prisma } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{
  page?: string;
  q?: string;
  voided?: string;
  billed?: string;
  paid?: string;
  deleted?: string;
}>;

type TransactionWithRelations = Transaction & {
  dealer: Dealer;
  inquiry: Inquiry;
};

function formatMaybeDate(value: Date | null): string {
  return value ? format(value, 'dd.MM.yyyy') : '-';
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const q = (params.q || '').trim();
  const voided = params.voided || '';
  const billed = params.billed || '';
  const paid = params.paid || '';
  const deleted = params.deleted || '';

  const where: Prisma.TransactionWhereInput = {};

  if (deleted === 'only') {
    where.deletedAt = { not: null };
  } else if (deleted !== 'with') {
    where.deletedAt = null;
  }

  if (voided === 'true') where.voidedAt = { not: null };
  if (voided === 'false') where.voidedAt = null;

  if (billed === 'true') where.billedAt = { not: null };
  if (billed === 'false') where.billedAt = null;

  if (paid === 'true') where.paidAt = { not: null };
  if (paid === 'false') where.paidAt = null;

  if (q) {
    where.OR = [
      { id: { contains: q, mode: 'insensitive' } },
      { buyerName: { contains: q, mode: 'insensitive' } },
      { buyerPhone: { contains: q, mode: 'insensitive' } },
      { dealerUsername: { contains: q, mode: 'insensitive' } },
      { dealerName: { contains: q, mode: 'insensitive' } },
      { dealerSubName: { contains: q, mode: 'insensitive' } },
      { inquiryModel: { contains: q, mode: 'insensitive' } },
      { inquirySubmodel: { contains: q, mode: 'insensitive' } },
      { dealer: { username: { contains: q, mode: 'insensitive' } } },
      { dealer: { name: { contains: q, mode: 'insensitive' } } },
      { inquiry: { model: { contains: q, mode: 'insensitive' } } },
      { inquiry: { submodel: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { acceptedAt: 'desc' },
      include: {
        dealer: true,
        inquiry: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (t: TransactionWithRelations) => t.id.slice(0, 8) + '...',
    },
    {
      key: 'dealer',
      label: 'Дилер',
      render: (t: TransactionWithRelations) =>
        (t.dealerSubName || t.dealerName || t.dealer.username) +
        (t.dealerName && t.dealerSubName ? ` • ${t.dealerName}` : ''),
    },
    {
      key: 'buyer',
      label: 'Покупатель',
      render: (t: TransactionWithRelations) => (
        <div className="flex flex-col">
          <span className="font-medium">{t.buyerName}</span>
          <span className="text-muted-foreground text-xs">{t.buyerPhone}</span>
        </div>
      ),
    },
    {
      key: 'car',
      label: 'Авто',
      render: (t: TransactionWithRelations) =>
        `${t.inquiryModel || t.inquiry.model} ${t.inquirySubmodel || t.inquiry.submodel}`,
    },
    {
      key: 'offerPrice',
      label: 'Цена',
      render: (t: TransactionWithRelations) =>
        t.offerPrice == null ? '-' : `${t.offerPrice.toLocaleString('ru-RU')} \u20BD`,
    },
    {
      key: 'amount',
      label: 'Сумма',
      render: (t: TransactionWithRelations) =>
        t.amount == null ? '-' : `${t.amount.toLocaleString('ru-RU')} \u20BD`,
    },
    {
      key: 'status',
      label: 'Статус',
      render: (t: TransactionWithRelations) => (
        <div className="flex flex-wrap items-center gap-1">
          {t.voidedAt ? (
            <Badge variant="secondary">Void</Badge>
          ) : (
            <Badge variant="default">OK</Badge>
          )}
          {t.invoicedAt && <Badge variant="outline">Invoice</Badge>}
          {t.billedAt && <Badge variant="outline">Billed</Badge>}
          {t.paidAt && <Badge variant="outline">Paid</Badge>}
        </div>
      ),
    },
    {
      key: 'acceptedAt',
      label: 'Принято',
      render: (t: TransactionWithRelations) => format(t.acceptedAt, 'dd.MM.yyyy HH:mm'),
    },
    {
      key: 'invoicedAt',
      label: 'Invoiced',
      render: (t: TransactionWithRelations) => formatMaybeDate(t.invoicedAt),
    },
    {
      key: 'billedAt',
      label: 'Billed',
      render: (t: TransactionWithRelations) => formatMaybeDate(t.billedAt),
    },
    {
      key: 'paidAt',
      label: 'Paid',
      render: (t: TransactionWithRelations) => formatMaybeDate(t.paidAt),
    },
    {
      key: 'deletedAt',
      label: 'Удалено',
      render: (t: TransactionWithRelations) =>
        t.deletedAt ? format(t.deletedAt, 'dd.MM.yyyy HH:mm') : '-',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Транзакции</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin" prefetch={false}>
            На дашборд
          </Link>
        </Button>
      </div>

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-6"
      >
        <div className="sm:col-span-2">
          <Input name="q" placeholder="Поиск: покупатель/дилер/ID" defaultValue={q} />
        </div>
        <div>
          <select
            name="voided"
            defaultValue={voided}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Void: все</option>
            <option value="false">Только не-void</option>
            <option value="true">Только void</option>
          </select>
        </div>
        <div>
          <select
            name="billed"
            defaultValue={billed}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Billed: все</option>
            <option value="false">Не выставлено</option>
            <option value="true">Выставлено</option>
          </select>
        </div>
        <div>
          <select
            name="paid"
            defaultValue={paid}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Paid: все</option>
            <option value="false">Не оплачено</option>
            <option value="true">Оплачено</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            name="deleted"
            defaultValue={deleted}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Только активные</option>
            <option value="with">С учетом удалённых</option>
            <option value="only">Только удалённые</option>
          </select>
          <Button type="submit" variant="outline" size="sm">
            Фильтр
          </Button>
        </div>
      </form>

      <DataTable
        data={transactions}
        columns={columns}
        keyField="id"
        detailPath={(t) => `/admin/transactions/${t.id}`}
        pagination={{ page, limit: LIMIT, total }}
        basePath="/admin/transactions"
      />
    </div>
  );
}
