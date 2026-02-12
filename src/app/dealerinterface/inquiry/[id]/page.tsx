'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  getShortId,
  getIdColorClass,
  formatPrice,
  anonymizeDealerName,
  formatRelativeTime,
} from '@/lib/inquiry-utils';

const MAX_OFFERS_PER_DEALER = 5;

type Offer = {
  id: string;
  price: number;
  comment?: string | null;
  dealerId: string;
  createdAt: string;
  transaction: { id: string; acceptedAt: string } | null;
};

type Transaction = {
  id: string;
  dealerId: string;
  buyerName: string;
  buyerEmail?: string | null;
  buyerPhone: string;
  acceptedAt: string;
};

type Inquiry = {
  id: string;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  status?: string | null;
  statusDescription?: string | null;
  comment?: string | null;
  createdAt: string;
  expiresAt: string;
  offers: Offer[];
  transactions: Transaction[];
  _count: { transactions: number };
};

type DealerInfo = {
  id: string;
  name: string | null;
  username: string;
};

export default function DealerInquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inquiryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealer, setDealer] = useState<DealerInfo | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);

  // Form state
  const [price, setPrice] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchInquiry = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await fetch(`/api/dealerinterface/inquiry/${inquiryId}`);

        if (response.status === 401) {
          router.replace('/dealerinterface');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch inquiry');
        }

        const data = await response.json();
        setDealer(data.dealer);
        setInquiry(data.inquiry);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [inquiryId, router]
  );

  useEffect(() => {
    fetchInquiry();
  }, [fetchInquiry]);

  // Refresh on focus
  useEffect(() => {
    const handleFocus = () => {
      fetchInquiry(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchInquiry]);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const priceNum = parseInt(price, 10);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setFormError('Укажите корректную цену');
      return;
    }

    if (priceNum > 2000000000) {
      setFormError('Цена слишком большая');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/dealerinterface/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId,
          price: priceNum,
          comment: comment || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки предложения');
      }

      const remainingText =
        data.remainingOffers !== undefined && data.remainingOffers > 0
          ? ` Осталось: ${data.remainingOffers}`
          : '';

      toast.success(`Предложение #${data.offerNumber} отправлено!${remainingText}`);
      setPrice('');
      setComment('');
      fetchInquiry(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">{error || 'Заявка не найдена'}</p>
        <Button onClick={() => router.push('/dealerinterface/dashboard')}>Назад</Button>
      </div>
    );
  }

  const now = new Date();
  const expiresAt = new Date(inquiry.expiresAt);
  const isExpired = expiresAt <= now;
  const colorClass = getIdColorClass(inquiry.id);
  const shortId = getShortId(inquiry.id);

  const myOffers = dealer ? inquiry.offers.filter((o) => o.dealerId === dealer.id) : [];
  const otherOffers = dealer
    ? inquiry.offers.filter((o) => o.dealerId !== dealer.id)
    : inquiry.offers;
  const myTransaction = dealer ? inquiry.transactions.find((t) => t.dealerId === dealer.id) : null;

  const otherDealerIds = [...new Set(otherOffers.map((o) => o.dealerId))];
  const dealerIndexMap = new Map(otherDealerIds.map((dId, i) => [dId, i]));

  const hoursLeft = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000))
  );

  const canMakeOffer = !isExpired && !myTransaction && myOffers.length < MAX_OFFERS_PER_DEALER;
  const remainingOffers = MAX_OFFERS_PER_DEALER - myOffers.length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dealerinterface/dashboard')}>
          <ArrowLeft className="mr-1 size-4" />
          Назад
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchInquiry(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-2 py-1 text-sm font-mono font-medium ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}
            >
              {shortId}
            </span>
            <CardTitle>
              {inquiry.model} • {inquiry.submodel}
            </CardTitle>
          </div>
          <div className="text-muted-foreground text-sm">
            {isExpired ? (
              <span className="text-orange-600">Заявка истекла</span>
            ) : (
              <span>Осталось: ~{hoursLeft}ч</span>
            )}
            {' · '}
            {inquiry._count.transactions} принято
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <div>
              <span className="font-medium">Коробка:</span> {inquiry.transmission}
            </div>
            <div>
              <span className="font-medium">Цвет:</span> {inquiry.color}
            </div>
            {inquiry.status && inquiry.status !== 'Коллекционер' && (
              <div>
                <span className="font-medium">Статус:</span> {inquiry.status}
                {inquiry.statusDescription ? ` — ${inquiry.statusDescription}` : ''}
              </div>
            )}
            {inquiry.comment && (
              <div>
                <span className="font-medium">Комментарий:</span> {inquiry.comment}
              </div>
            )}
          </div>

          {/* My transaction status */}
          {myTransaction && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-900">Ваше предложение принято!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-green-800">Свяжитесь с покупателем как можно скорее.</p>
                <div className="mt-3 rounded border border-green-200 bg-white p-3">
                  <div>
                    <span className="font-medium">Имя:</span> {myTransaction.buyerName}
                  </div>
                  <div>
                    <span className="font-medium">Телефон:</span>{' '}
                    <a href={`tel:${myTransaction.buyerPhone}`} className="text-blue-600 underline">
                      {myTransaction.buyerPhone}
                    </a>
                  </div>
                  {myTransaction.buyerEmail && (
                    <div>
                      <span className="font-medium">Email:</span>{' '}
                      <a
                        href={`mailto:${myTransaction.buyerEmail}`}
                        className="text-blue-600 underline"
                      >
                        {myTransaction.buyerEmail}
                      </a>
                    </div>
                  )}
                  <div className="text-muted-foreground mt-2 text-xs">
                    Принято: {new Date(myTransaction.acceptedAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* My offers section */}
          {myOffers.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium">Ваши предложения ({myOffers.length})</div>
              <div className="flex flex-col gap-2">
                {myOffers.map((offer, index) => (
                  <OfferCardSimple
                    key={offer.id}
                    offer={offer}
                    isMyOffer={true}
                    isFirstOffer={index === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other offers section */}
          {otherOffers.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium">
                Предложения конкурентов ({otherOffers.length})
              </div>
              <div className="flex flex-col gap-2">
                {otherOffers.map((offer) => {
                  const dealerIndex = dealerIndexMap.get(offer.dealerId) ?? 0;
                  const anonName = anonymizeDealerName(dealerIndex);
                  return (
                    <OfferCardSimple
                      key={offer.id}
                      offer={offer}
                      dealerName={anonName}
                      isMyOffer={false}
                      isFirstOffer={false}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* New offer form */}
          {!myTransaction && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {myOffers.length === 0 ? 'Сделать предложение' : 'Новое предложение'}
                </div>
                {!isExpired && myOffers.length > 0 && (
                  <span className="text-muted-foreground text-xs">Осталось: {remainingOffers}</span>
                )}
              </div>
              {isExpired ? (
                <Card className="border-gray-300 bg-gray-50">
                  <CardContent className="py-4 text-sm text-gray-600">
                    Заявка истекла — предложения не принимаются.
                  </CardContent>
                </Card>
              ) : !canMakeOffer ? (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="py-4 text-sm text-orange-700">
                    Достигнут лимит предложений ({MAX_OFFERS_PER_DEALER}).
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleSubmitOffer} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Цена</Label>
                    <Input
                      id="price"
                      type="text"
                      inputMode="numeric"
                      placeholder="1500000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment">Комментарий (необязательно)</Label>
                    <Textarea
                      id="comment"
                      placeholder="Например: в наличии, готов к выдаче"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {myOffers.length === 0 ? 'Отправить предложение' : 'Отправить новое'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Simplified offer card component
function OfferCardSimple({
  offer,
  dealerName,
  isMyOffer,
  isFirstOffer,
}: {
  offer: Offer;
  dealerName?: string;
  isMyOffer: boolean;
  isFirstOffer: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const borderClass = isMyOffer
    ? offer.transaction
      ? 'border-green-200 bg-green-50'
      : 'border-gray-200 bg-gray-50'
    : offer.transaction
      ? 'border-orange-200 bg-orange-50'
      : 'border-gray-200 bg-gray-50';

  const hasComment = offer.comment && offer.comment.trim().length > 0;
  const commentPreview =
    hasComment && offer.comment && offer.comment.length > 80
      ? `${offer.comment.substring(0, 80)}…`
      : offer.comment;

  return (
    <div
      className={`rounded-lg border p-3 ${borderClass} ${hasComment ? 'cursor-pointer' : ''}`}
      onClick={() => hasComment && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dealerName && <span className="text-muted-foreground text-sm">{dealerName}</span>}
          <span className="font-medium">{formatPrice(offer.price)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(new Date(offer.createdAt))}
          </span>
          {offer.transaction ? (
            <Badge
              variant="outline"
              className={
                isMyOffer
                  ? 'bg-green-100 border-green-200 text-green-700'
                  : 'border-orange-300 text-orange-700'
              }
            >
              {isMyOffer ? '✓ Принято' : 'Принято'}
            </Badge>
          ) : (
            isFirstOffer &&
            isMyOffer && (
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                Актуальное
              </Badge>
            )
          )}
        </div>
      </div>

      {hasComment && (
        <div className="mt-2">
          <p className="text-muted-foreground text-sm">
            {isExpanded ? offer.comment : commentPreview}
          </p>
        </div>
      )}
    </div>
  );
}
