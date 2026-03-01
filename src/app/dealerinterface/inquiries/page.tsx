'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getShortId, getIdColorClass, formatPrice } from '@/lib/inquiry-utils';

type Inquiry = {
  id: string;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  createdAt: string;
  expiresAt: string;
  offers: Array<{
    id: string;
    price: number;
    dealerId: string;
    createdAt: string;
  }>;
  transactions: Array<{
    id: string;
    dealerId: string;
    buyerName?: string;
    buyerPhone?: string;
    buyerPlatform?: 'MAX' | 'TELEGRAM' | null;
    buyerPlatformUserId?: string | null;
  }>;
  _count: {
    offers: number;
    transactions: number;
  };
};

type Tab = 'active' | 'archive';

export default function DealerInquiriesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [archivedInquiries, setArchivedInquiries] = useState<Inquiry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [authHeader, setAuthHeader] = useState<string | null>(null);

  // Load active inquiries on mount
  useEffect(() => {
    let cancelled = false;

    async function loadInquiries() {
      try {
        const webApp = getWebApp();
        const platform = detectPlatform();
        const initData = webApp?.initData;

        if (!initData || !platform) {
          setError('Откройте через бота MAX или Telegram');
          setLoading(false);
          return;
        }

        const header = `Bearer ${platform}:dealer:${initData}`;
        setAuthHeader(header);

        const response = await fetch('/api/dealer/inquiries', {
          headers: { Authorization: header },
        });

        if (cancelled) return;

        if (response.status === 401 || response.status === 403) {
          setError('Ошибка авторизации. Войдите снова.');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Не удалось загрузить заявки');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setInquiries(data.inquiries);
        if (data.inquiries.length > 0 && data.inquiries[0].offers.length > 0) {
          setDealerId(data.inquiries[0].offers[0].dealerId);
        }
        setLoading(false);
      } catch (err) {
        console.error('Load inquiries error:', err);
        if (!cancelled) {
          setError('Ошибка соединения');
          setLoading(false);
        }
      }
    }

    loadInquiries();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load archived inquiries when archive tab is first opened
  useEffect(() => {
    if (activeTab !== 'archive' || archivedInquiries !== null || !authHeader) return;

    let cancelled = false;
    setArchiveLoading(true);

    async function loadArchived() {
      try {
        const response = await fetch('/api/dealer/inquiries/archived', {
          headers: { Authorization: authHeader! },
        });

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          setArchivedInquiries(data.inquiries);
          // Extract dealerId from archived if we don't have it yet
          if (!dealerId && data.inquiries.length > 0 && data.inquiries[0].offers.length > 0) {
            setDealerId(data.inquiries[0].offers[0].dealerId);
          }
        } else {
          setArchivedInquiries([]);
        }
      } catch {
        setArchivedInquiries([]);
      } finally {
        if (!cancelled) setArchiveLoading(false);
      }
    }

    loadArchived();

    return () => {
      cancelled = true;
    };
  }, [activeTab, archivedInquiries, authHeader, dealerId]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <Loader2 className="text-muted-foreground size-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Ошибка</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const activeInquiries = inquiries?.filter((i) => new Date(i.expiresAt) > now) || [];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors -mb-px',
            activeTab === 'active'
              ? 'border-b-2 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('active')}
        >
          Заявки
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors -mb-px',
            activeTab === 'archive'
              ? 'border-b-2 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('archive')}
        >
          Архив
        </button>
      </div>

      {/* Active tab */}
      {activeTab === 'active' && (
        <div className="flex flex-col gap-3">
          {activeInquiries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Нет активных заявок.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activeInquiries.map((inquiry) => {
                const myOffers = dealerId
                  ? inquiry.offers.filter((o) => o.dealerId === dealerId)
                  : [];
                const latestMyOffer = myOffers[0];
                const totalOfferCount = inquiry._count.offers;
                const acceptedCount = inquiry._count.transactions;
                const myTransaction = inquiry.transactions.find((t) => t.dealerId === dealerId);

                const hoursLeft = Math.max(
                  0,
                  Math.ceil(
                    (new Date(inquiry.expiresAt).getTime() - now.getTime()) / (60 * 60 * 1000)
                  )
                );

                const colorClass = getIdColorClass(inquiry.id);
                const shortId = getShortId(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/dealerinterface/inquiries/${inquiry.id}`}
                      className="hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium leading-tight">{inquiry.model}</div>
                          {inquiry.submodel !== inquiry.model && (
                            <div className="text-sm text-muted-foreground">{inquiry.submodel}</div>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
                        >
                          {shortId}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground text-xs">~{hoursLeft}ч</span>
                        {totalOfferCount > 0 && (
                          <Badge variant="secondary">{totalOfferCount} предложений</Badge>
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
                            ✓ Ваше предложение принято
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
                            Ваше предложение:{' '}
                            <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                          >
                            ⏳ Ожидает
                          </Badge>
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Archive tab */}
      {activeTab === 'archive' && (
        <div className="flex flex-col gap-3">
          {archiveLoading ? (
            <div className="flex w-full items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : (archivedInquiries ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              Здесь будут заявки, в которых ваше предложение было принято покупателем.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(archivedInquiries ?? []).map((inquiry) => {
                const myOffers = dealerId
                  ? inquiry.offers.filter((o) => o.dealerId === dealerId)
                  : [];
                const latestMyOffer = myOffers[0];
                const transaction = inquiry.transactions[0];

                const colorClass = getIdColorClass(inquiry.id);
                const shortId = getShortId(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/dealerinterface/inquiries/${inquiry.id}`}
                      className="hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium leading-tight">{inquiry.model}</div>
                          {inquiry.submodel !== inquiry.model && (
                            <div className="text-sm text-muted-foreground">{inquiry.submodel}</div>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
                        >
                          {shortId}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700"
                        >
                          ✓ Принято
                        </Badge>
                        {latestMyOffer && (
                          <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                        )}
                      </div>
                      {(transaction?.buyerName ||
                        transaction?.buyerPhone ||
                        (transaction?.buyerPlatform && transaction?.buyerPlatformUserId)) && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                          {transaction.buyerName && <span>{transaction.buyerName}</span>}
                          {transaction.buyerPhone && <span>{transaction.buyerPhone}</span>}
                          {transaction.buyerPlatform && transaction.buyerPlatformUserId && (
                            <span>
                              {transaction.buyerPlatform === 'MAX' ? 'MAX' : 'TG'} ID:{' '}
                              {transaction.buyerPlatformUserId}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
