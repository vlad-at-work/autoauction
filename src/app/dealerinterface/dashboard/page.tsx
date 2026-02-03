'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, LogOut } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getShortId, getIdColorClass, formatPrice } from '@/lib/inquiry-utils';

type Offer = {
  id: string;
  price: number;
  dealerId: string;
  createdAt: string;
  transaction: { id: string } | null;
};

type Transaction = {
  id: string;
  dealerId: string;
};

type Inquiry = {
  id: string;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  createdAt: string;
  expiresAt: string;
  offers: Offer[];
  transactions: Transaction[];
};

type DealerInfo = {
  id: string;
  name: string | null;
  username: string;
};

export default function DealerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealer, setDealer] = useState<DealerInfo | null>(null);
  const [activeInquiries, setActiveInquiries] = useState<Inquiry[]>([]);
  const [previousInquiries, setPreviousInquiries] = useState<Inquiry[]>([]);

  const fetchInquiries = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await fetch('/api/dealerinterface/inquiries');

        if (response.status === 401) {
          // Session expired, redirect to login
          router.replace('/dealerinterface');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch inquiries');
        }

        const data = await response.json();
        setDealer(data.dealer);
        setActiveInquiries(data.activeInquiries);
        setPreviousInquiries(data.previousInquiries);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInquiries(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchInquiries]);

  // Refresh on focus
  useEffect(() => {
    const handleFocus = () => {
      fetchInquiries(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchInquiries]);

  const handleLogout = async () => {
    await fetch('/api/dealerinterface/logout', { method: 'POST' });
    router.replace('/dealerinterface');
  };

  const navigateToInquiry = (inquiryId: string) => {
    router.push(`/dealerinterface/inquiry/${inquiryId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => fetchInquiries()}>Повторить</Button>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dealer?.name || dealer?.username || 'Дилер'}</h1>
          <p className="text-sm text-muted-foreground">Панель дилера</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchInquiries(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      {/* Active Inquiries */}
      <Card>
        <CardHeader>
          <CardTitle>Активные заявки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activeInquiries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Пока нет активных заявок.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activeInquiries.map((inquiry) => {
                const myOffers = dealer
                  ? inquiry.offers.filter((o) => o.dealerId === dealer.id)
                  : [];
                const latestMyOffer = myOffers[0];
                const totalOfferCount = inquiry.offers.length;
                const acceptedCount = inquiry.transactions.length;
                const myTransaction = dealer
                  ? inquiry.transactions.find((t) => t.dealerId === dealer.id)
                  : null;

                const expiresAt = new Date(inquiry.expiresAt);
                const hoursLeft = Math.max(
                  0,
                  Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000))
                );

                const colorClass = getIdColorClass(inquiry.id);
                const shortId = getShortId(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <button
                      onClick={() => navigateToInquiry(inquiry.id)}
                      className="w-full text-left hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
                          >
                            {shortId}
                          </span>
                          <span className="font-medium">
                            {inquiry.model} • {inquiry.submodel}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">~{hoursLeft}ч</div>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {totalOfferCount > 0 && (
                          <Badge variant="secondary">{totalOfferCount} предл.</Badge>
                        )}
                        {acceptedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            {acceptedCount} принято
                          </Badge>
                        )}
                      </div>
                      {myTransaction ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            ✓ Ваше принято
                          </Badge>
                          {latestMyOffer && (
                            <span className="text-muted-foreground">
                              {formatPrice(latestMyOffer.price)}
                            </span>
                          )}
                        </div>
                      ) : latestMyOffer ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <span>
                            Ваше:{' '}
                            <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                          >
                            ⏳ Ожидание
                          </Badge>
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Previous Inquiries */}
      {previousInquiries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Прошлые заявки</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {previousInquiries.map((inquiry) => {
                const myOffers = dealer
                  ? inquiry.offers.filter((o) => o.dealerId === dealer.id)
                  : [];
                const latestMyOffer = myOffers[0];
                const myTransaction = dealer
                  ? inquiry.transactions.find((t) => t.dealerId === dealer.id)
                  : null;

                const colorClass = getIdColorClass(inquiry.id);
                const shortId = getShortId(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <button
                      onClick={() => navigateToInquiry(inquiry.id)}
                      className="w-full text-left hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 opacity-70 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
                          >
                            {shortId}
                          </span>
                          <span className="font-medium">
                            {inquiry.model} • {inquiry.submodel}
                          </span>
                        </div>
                        <Badge variant="secondary">Истекла</Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      {myTransaction ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            ✓ Принято
                          </Badge>
                          {latestMyOffer && (
                            <span className="text-muted-foreground">
                              {formatPrice(latestMyOffer.price)}
                            </span>
                          )}
                        </div>
                      ) : latestMyOffer ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span>
                            Ваше:{' '}
                            <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                          </span>
                          <Badge variant="secondary">Без ответа</Badge>
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
