import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import type { Offer, Inquiry, Dealer } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{ page?: string }>;

type OfferWithRelations = Offer & {
  inquiry: Inquiry;
  dealer: Dealer;
  _count: { leads: number };
};

export default async function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        inquiry: true,
        dealer: true,
        _count: { select: { leads: true } },
      },
    }),
    prisma.offer.count(),
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
    { key: 'leads', label: 'Лиды', render: (o: OfferWithRelations) => o._count.leads },
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
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Предложения</h1>
      </div>
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
