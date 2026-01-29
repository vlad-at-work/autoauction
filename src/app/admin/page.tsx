import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Store, Tag, UserCheck } from 'lucide-react';

async function getStats() {
  const now = new Date();

  const [buyersCount, inquiriesCount, activeInquiriesCount, dealersCount, offersCount, leadsCount] =
    await Promise.all([
      prisma.buyer.count(),
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { expiresAt: { gte: now } } }),
      prisma.dealer.count(),
      prisma.offer.count(),
      prisma.lead.count(),
    ]);

  return {
    buyersCount,
    inquiriesCount,
    activeInquiriesCount,
    dealersCount,
    offersCount,
    leadsCount,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: 'Всего покупателей', value: stats.buyersCount, icon: Users },
    { label: 'Всего заявок', value: stats.inquiriesCount, icon: FileText },
    { label: 'Активных заявок', value: stats.activeInquiriesCount, icon: FileText },
    { label: 'Всего дилеров', value: stats.dealersCount, icon: Store },
    { label: 'Всего предложений', value: stats.offersCount, icon: Tag },
    { label: 'Всего лидов', value: stats.leadsCount, icon: UserCheck },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Дашборд</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
