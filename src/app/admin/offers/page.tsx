import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Offer, Inquiry, Dealer, Transaction, Prisma } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{
  page?: string;
  q?: string;
  status?: string;
  deleted?: string;
}>;

type OfferWithRelations = Offer & {
  inquiry: Inquiry;
  dealer: Dealer;
  transaction: Transaction | null;
};

export default async function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const q = (params.q || '').trim();
  const status = params.status || '';
  const deleted = params.deleted || '';

  const where: Prisma.OfferWhereInput = {};

  if (status === 'accepted') {
    where.transaction = { isNot: null };
  } else if (status === 'pending') {
    where.transaction = { is: null };
  }

  if (deleted === 'only') {
    where.deletedAt = { not: null };
  } else if (deleted !== 'with') {
    where.deletedAt = null;
  }

  if (q) {
    where.OR = [
      { id: { contains: q, mode: 'insensitive' } },
      { inquiry: { id: { contains: q, mode: 'insensitive' } } },
      { inquiry: { model: { contains: q, mode: 'insensitive' } } },
      { inquiry: { submodel: { contains: q, mode: 'insensitive' } } },
      { dealer: { username: { contains: q, mode: 'insensitive' } } },
      { dealer: { name: { contains: q, mode: 'insensitive' } } },
      { dealer: { subName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        inquiry: true,
        dealer: true,
        transaction: true,
      },
    }),
    prisma.offer.count({ where }),
  ]);

  const columns = [
    { key: 'id', label: 'ID', render: (o: OfferWithRelations) => o.id.slice(0, 8) + '...' },
    {
      key: 'inquiry',
      label: 'Заявка',
      render: (o: OfferWithRelations) => `${o.inquiry.model} ${o.inquiry.submodel}`,
    },
    {
      key: 'dealer',
      label: 'Дилер',
      render: (o: OfferWithRelations) => o.dealer.name || o.dealer.username,
    },
    {
      key: 'price',
      label: 'Цена',
      render: (o: OfferWithRelations) => `${o.price.toLocaleString('ru-RU')} ₽`,
    },
    {
      key: 'status',
      label: 'Статус',
      render: (o: OfferWithRelations) => (o.transaction ? 'Принято' : 'Ожидание'),
    },
    {
      key: 'comment',
      label: 'Комментарий',
      render: (o: OfferWithRelations) => (
        <span className="max-w-[200px] truncate block">{o.comment || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Создано',
      render: (o: OfferWithRelations) => format(o.createdAt, 'dd.MM.yyyy HH:mm'),
    },
    {
      key: 'deletedAt',
      label: 'Удалено',
      render: (o: OfferWithRelations) =>
        o.deletedAt ? format(o.deletedAt, 'dd.MM.yyyy HH:mm') : '-',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Предложения</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/inquiries" prefetch={false}>
            Перейти к заявкам
          </Link>
        </Button>
      </div>

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-5"
      >
        <div className="sm:col-span-2">
          <Input name="q" placeholder="Поиск: ID, модель, дилер" defaultValue={q} />
        </div>
        <div>
          <select
            name="status"
            defaultValue={status}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Все</option>
            <option value="pending">Ожидание</option>
            <option value="accepted">Принято</option>
          </select>
        </div>
        <div>
          <select
            name="deleted"
            defaultValue={deleted}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Только активные</option>
            <option value="with">С учетом удалённых</option>
            <option value="only">Только удалённые</option>
          </select>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" variant="outline" size="sm">
            Фильтр
          </Button>
        </div>
      </form>

      <DataTable
        data={offers}
        columns={columns}
        keyField="id"
        detailPath={(o) => `/admin/offers/${o.id}`}
        pagination={{ page, limit: LIMIT, total }}
        basePath="/admin/offers"
      />
    </div>
  );
}
