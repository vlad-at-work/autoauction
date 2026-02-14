'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  }>;
  _count: {
    offers: number;
    transactions: number;
  };
};

export default function DealerInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dealerId, setDealerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInquiries() {
      try {
        const webApp = getWebApp();
        const platform = detectPlatform();
        const initData = webApp?.initData;

        if (!initData || !platform) {
          setError('Please open via MAX or Telegram bot');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/dealer/inquiries', {
          headers: {
            Authorization: `Bearer ${platform}:dealer:${initData}`,
          },
        });

        if (cancelled) return;

        if (response.status === 401 || response.status === 403) {
          setError('Authentication failed. Please login again.');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Failed to load inquiries');
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
          setError('Connection error');
          setLoading(false);
        }
      }
    }

    loadInquiries();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading...</div>
          <div className="mt-2 text-sm text-gray-500">Fetching inquiries</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const activeInquiries = inquiries?.filter((i) => new Date(i.expiresAt) > now) || [];
  const previousInquiries = inquiries?.filter((i) => new Date(i.expiresAt) <= now) || [];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Active Inquiries (24 hours)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activeInquiries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active inquiries.</p>
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
                        <div className="text-muted-foreground text-xs">~{hoursLeft}h left</div>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {inquiry.transmission} • {inquiry.color}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {totalOfferCount > 0 && (
                          <Badge variant="secondary">{totalOfferCount} offers</Badge>
                        )}
                        {acceptedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            {acceptedCount} accepted
                          </Badge>
                        )}
                      </div>
                      {myTransaction ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            ✓ Your offer accepted
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
                            Your offer:{' '}
                            <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                          >
                            ⏳ Pending
                          </Badge>
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous Inquiries</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {previousInquiries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No previous inquiries.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {previousInquiries.map((inquiry) => {
                const myOffers = dealerId
                  ? inquiry.offers.filter((o) => o.dealerId === dealerId)
                  : [];
                const latestMyOffer = myOffers[0];
                const myTransaction = inquiry.transactions.find((t) => t.dealerId === dealerId);

                const colorClass = getIdColorClass(inquiry.id);
                const shortId = getShortId(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <Link
                      href={`/dealerinterface/inquiries/${inquiry.id}`}
                      className="hover:bg-muted/40 flex flex-col gap-1 rounded-lg border px-4 py-3 opacity-70 transition-colors"
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
                        <Badge variant="secondary">Expired</Badge>
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
                            ✓ Accepted
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
                            Offer:{' '}
                            <span className="font-medium">{formatPrice(latestMyOffer.price)}</span>
                          </span>
                          <Badge variant="secondary">No response</Badge>
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
