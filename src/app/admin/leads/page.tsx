import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import type { Lead, Offer, Inquiry, Dealer } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{ page?: string }>;

type LeadWithRelations = Lead & {
  offer: Offer & {
    inquiry: Inquiry;
    dealer: Dealer;
  };
};

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { acceptedAt: 'desc' },
      include: {
        offer: {
          include: {
            inquiry: true,
            dealer: true,
          },
        },
      },
    }),
    prisma.lead.count(),
  ]);

  const columns = [
    { key: 'id', label: 'ID', render: (l: LeadWithRelations) => l.id.slice(0, 8) + '...' },
    { key: 'buyerName', label: 'Имя покупателя' },
    { key: 'buyerPhone', label: 'Телефон' },
    {
      key: 'buyerEmail',
      label: 'Эл. почта',
      render: (l: LeadWithRelations) => l.buyerEmail || '-',
    },
    {
      key: 'inquiry',
      label: 'Заявка',
      render: (l: LeadWithRelations) => `${l.offer.inquiry.model} ${l.offer.inquiry.submodel}`,
    },
    {
      key: 'dealer',
      label: 'Дилер',
      render: (l: LeadWithRelations) => l.offer.dealer.name || l.offer.dealer.username,
    },
    {
      key: 'price',
      label: 'Цена',
      render: (l: LeadWithRelations) => `${l.offer.price.toLocaleString('ru-RU')} ₽`,
    },
    {
      key: 'acceptedAt',
      label: 'Принято',
      render: (l: LeadWithRelations) => format(l.acceptedAt, 'dd.MM.yyyy HH:mm'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Лиды</h1>
      </div>
      <DataTable
        data={leads}
        columns={columns}
        keyField="id"
        detailPath={(l) => `/admin/leads/${l.id}`}
        pagination={{ page, limit: LIMIT, total }}
        basePath="/admin/leads"
      />
    </div>
  );
}
